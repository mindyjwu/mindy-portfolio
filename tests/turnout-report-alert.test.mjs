// Run with: node --test tests/
// Tests api/turnout-report-alert.js without sending any real email: fetch is replaced.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import handler, { buildEmail } from '../api/turnout-report-alert.js';

// A real payload captured from the database (docs/turnout/sql/006-report-email-alert.sql), so this also proves
// the function understands exactly what the database sends.
const FIX = JSON.parse(fs.readFileSync(new URL('./fixtures/report-alert-payload.json', import.meta.url), 'utf8'));
const ENV = { TURNOUT_ALERT_SECRET: 's3cret-value-123', RESEND_API_KEY: 're_test_key', TURNOUT_ALERT_TO: 'me@example.com' };

function run({ method = 'POST', headers = { 'x-turnout-secret': ENV.TURNOUT_ALERT_SECRET }, body = FIX, env = ENV, fetchImpl } = {}) {
  const saved = {}, calls = [];
  for (const k of ['TURNOUT_ALERT_SECRET', 'RESEND_API_KEY', 'TURNOUT_ALERT_TO', 'TURNOUT_ALERT_FROM', 'TURNOUT_ALERT_LEVEL']) { saved[k] = process.env[k]; delete process.env[k]; }
  Object.assign(process.env, env);
  const realFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl || (async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200 }; });
  const res = { code: 0, json: null, status(c) { this.code = c; return this; }, json_(o) { this.json = o; return this; } };
  res.json = function (o) { this.body = o; return this; };
  return handler({ method, headers, body }, res).then(() => {
    globalThis.fetch = realFetch;
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    return { code: res.code, body: res.body, calls };
  });
}
const sent = r => JSON.parse(r.calls[0].init.body);

test('only POST is accepted', async () => { assert.equal((await run({ method: 'GET' })).code, 405); });

test('refuses to run if it is not fully configured, and does not say what is missing', async () => {
  const r = await run({ env: { TURNOUT_ALERT_SECRET: ENV.TURNOUT_ALERT_SECRET } });
  assert.equal(r.code, 500); assert.equal(r.calls.length, 0);
  assert.ok(!JSON.stringify(r.body).includes('RESEND'));
});

test('wrong, missing or different-length secrets are rejected and send nothing', async () => {
  for (const headers of [{}, { 'x-turnout-secret': 'nope' }, { 'x-turnout-secret': ENV.TURNOUT_ALERT_SECRET + 'x' }, { 'x-turnout-secret': '' }]) {
    const r = await run({ headers }); assert.equal(r.code, 401); assert.equal(r.calls.length, 0);
  }
});

test('a real database payload sends one email through Resend with the right key and recipient', async () => {
  const r = await run();
  assert.equal(r.code, 200); assert.equal(r.calls.length, 1);
  assert.equal(r.calls[0].url, 'https://api.resend.com/emails');
  assert.equal(r.calls[0].init.headers.Authorization, 'Bearer re_test_key');
  const m = sent(r);
  assert.deepEqual(m.to, ['me@example.com']);
  assert.match(m.from, /onboarding@resend\.dev/);
  assert.equal(m.html, undefined, 'plain text only');
});

test('the email names the category, both handles, the circle, the note, and flags an owner report as urgent', async () => {
  const m = sent(await run());
  assert.match(m.subject, /^\[Turnout\] URGENT: Made me feel unsafe \(@maya\.eats\)$/);
  for (const bit of ['Made me feel unsafe', '@maya.eats (the circle owner)', 'The Sunday Table', '@jordan.runs', 'Made comments about where I live', 'Only you can']) {
    assert.ok(m.text.includes(bit), 'missing: ' + bit);
  }
  assert.match(m.text, /select \* from reports where status = 'open'/);
  assert.match(m.text, /immediate danger/);
});

test('a routine report about a member is not marked urgent and says the owner can see it', () => {
  const p = structuredClone(FIX); p.report.category = 'fake'; p.reported.is_owner = false;
  const m = buildEmail(p);
  assert.match(m.subject, /^\[Turnout\] Report: Fake or misleading profile/);
  assert.ok(m.text.includes("circle owner can also see this"));
  assert.equal(m.urgent, false);
});

test('hostile text in a report cannot change the subject or smuggle markup', () => {
  const p = structuredClone(FIX);
  p.reported.handle = '@x\r\nBcc: attacker@evil.test\r\nSubject: hacked'; p.reporter.handle = '<script>alert(1)</script>';
  p.report.note = 'hello\u0000\u0007 <img src=x onerror=alert(1)>' + 'z'.repeat(2000); p.report.category = 'nonsense';
  const m = buildEmail(p);
  assert.ok(!/[\r\n]/.test(m.subject), 'subject is one line');
  assert.ok(!m.subject.includes('Bcc:\n'));
  assert.ok(!/[\u0000-\u0008]/.test(m.text), 'control characters stripped');
  assert.ok(m.text.length < 2500, 'note is capped');
  assert.match(m.subject, /Something else/, 'unknown category falls back safely');
});

test('the alert level "serious" skips routine reports but never skips urgent ones or tests', async () => {
  const routine = structuredClone(FIX); routine.report.category = 'other'; routine.reported.is_owner = false;
  const env = { ...ENV, TURNOUT_ALERT_LEVEL: 'serious' };
  let r = await run({ env, body: routine }); assert.equal(r.code, 200); assert.equal(r.calls.length, 0); assert.ok(r.body.skipped);
  r = await run({ env }); assert.equal(r.calls.length, 1);
  r = await run({ env, body: { ...routine, test: true } }); assert.equal(r.calls.length, 1);
  r = await run({ body: routine }); assert.equal(r.calls.length, 1, 'default level sends everything');
});

test('the time is shown in a readable form, and a bad time does not break the email', () => {
  assert.match(buildEmail(FIX).text, /When:   \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/);
  const p = structuredClone(FIX); p.report.created_at = 'not a date';
  assert.match(buildEmail(p).text, /When:   just now/);
});

test('a test alert is clearly labelled', () => {
  const p = structuredClone(FIX); p.test = true;
  const m = buildEmail(p);
  assert.match(m.subject, /^\[Turnout\] TEST:/);
  assert.match(m.text, /This is a TEST alert\. Nothing was reported\./);
});

test('bad or oversized payloads are rejected before any email is sent', async () => {
  for (const body of [null, {}, { kind: 'other' }, { kind: 'report' }, { kind: 'report', report: {} }]) {
    const r = await run({ body }); assert.equal(r.code, 400); assert.equal(r.calls.length, 0);
  }
  const huge = structuredClone(FIX); huge.report.note = 'x'.repeat(20000);
  const r = await run({ body: huge }); assert.equal(r.code, 413); assert.equal(r.calls.length, 0);
});

test('if the email provider fails, the caller gets a 502 (so the database log shows it) and no secret leaks', async () => {
  let r = await run({ fetchImpl: async () => ({ ok: false, status: 403 }) });
  assert.equal(r.code, 502); assert.equal(r.body.status, 403);
  r = await run({ fetchImpl: async () => { throw new Error('network down re_test_key'); } });
  assert.equal(r.code, 502);
  const text = JSON.stringify(r.body);
  assert.ok(!text.includes('re_test_key') && !text.includes(ENV.TURNOUT_ALERT_SECRET));
});

test('the secret and API key never appear in any response', async () => {
  for (const o of [await run(), await run({ headers: {} }), await run({ body: {} })]) {
    const text = JSON.stringify(o.body);
    assert.ok(!text.includes('re_test_key') && !text.includes(ENV.TURNOUT_ALERT_SECRET));
  }
});
