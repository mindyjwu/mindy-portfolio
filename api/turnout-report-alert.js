// api/turnout-report-alert.js
// Vercel serverless function: emails the app operator when someone files a safety
// report in Turnout. Called by the database (see docs/turnout/sql/006-report-email-alert.sql), never by
// the browser. It checks a shared secret, then sends one plain-text email with Resend.
//
// Environment variables (Vercel: Project, Settings, Environment Variables):
//   TURNOUT_ALERT_SECRET   long random string, the same value stored in the database
//   RESEND_API_KEY         from resend.com
//   TURNOUT_ALERT_TO       the email address that should receive alerts
//   TURNOUT_ALERT_FROM     optional; defaults to Resend's test sender
//   TURNOUT_ALERT_LEVEL    optional; "all" (default) or "serious"
//
// Plain text on purpose: reporters type free text, and plain text can't carry markup.

import crypto from 'node:crypto';

const CATS = {
  unsafe: 'Made me feel unsafe',
  harassment: 'Harassment or unwanted contact',
  inappropriate: 'Inappropriate behavior',
  fake: 'Fake or misleading profile',
  other: 'Something else',
};
const URGENT = new Set(['unsafe', 'harassment', 'inappropriate']);

// Strip control characters (keeping tab and newline) and cap the length.
const clean = (v, max) =>
  String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, max);
const oneLine = (v, max) => clean(v, max).replace(/\s+/g, ' ').trim();

function sameSecret(got, want) {
  const a = Buffer.from(String(got || ''));
  const b = Buffer.from(String(want));
  if (a.length !== b.length) return false;       // timingSafeEqual throws on different lengths
  return crypto.timingSafeEqual(a, b);
}

export function buildEmail(p) {
  const category = Object.prototype.hasOwnProperty.call(CATS, p.report.category) ? p.report.category : 'other';
  const urgent = URGENT.has(category) || p.reported.is_owner === true;
  const about = oneLine(p.reported.handle, 60) || 'a member';
  const label = p.test ? 'TEST' : urgent ? 'URGENT' : 'Report';
  const subject = `[Turnout] ${label}: ${CATS[category]} (${about})`;
  const d = p.report.created_at ? new Date(p.report.created_at) : null;
  const when = d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : 'just now';
  const lines = [
    p.test ? 'This is a TEST alert. Nothing was reported.' : 'A report was filed in Turnout.',
    '',
    `What:   ${CATS[category]}`,
    `About:  ${about}${p.reported.is_owner ? ' (the circle owner)' : ''}${p.circle && p.circle.name ? ` in "${oneLine(p.circle.name, 80)}"` : ''}`,
    `Filed by: ${oneLine(p.reporter && p.reporter.handle, 60) || 'unknown'}`,
    `When:   ${when}`,
  ];
  if (p.report.event_month) lines.push(`Party month: ${oneLine(p.report.event_month, 10).slice(0, 7)}`);
  if (Number.isFinite(Number(p.reported.open_reports))) lines.push(`Open reports about this person: ${Number(p.reported.open_reports)}`);
  lines.push('', 'Details:', clean(p.report.note, 500).trim() || '(none given)', '');
  if (p.reported.is_owner) {
    lines.push('This report is about a circle owner, so nobody in the app can act on it. Only you can.');
  } else {
    lines.push('The circle owner can also see this in the Me tab (without the reporter\'s name).');
  }
  lines.push(
    '',
    'To review every open report, run this in the Supabase SQL editor:',
    "  select * from reports where status = 'open' order by created_at desc;",
    '',
    'If anyone is in immediate danger, contact local emergency services first.',
  );
  return { subject, text: lines.join('\n'), urgent, category };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const secret = process.env.TURNOUT_ALERT_SECRET;
  const key = process.env.RESEND_API_KEY;
  const to = process.env.TURNOUT_ALERT_TO;
  if (!secret || !key || !to) return res.status(500).json({ error: 'not configured' });

  if (!sameSecret(req.headers['x-turnout-secret'], secret)) return res.status(401).json({ error: 'unauthorized' });

  const body = req.body;
  let size = 0;
  try { size = JSON.stringify(body).length; } catch { size = Infinity; }
  if (size > 10000) return res.status(413).json({ error: 'too large' });
  if (!body || body.kind !== 'report' || !body.report || !body.reported) return res.status(400).json({ error: 'bad payload' });

  const mail = buildEmail(body);
  const serious = mail.urgent;
  if ((process.env.TURNOUT_ALERT_LEVEL || 'all') === 'serious' && !serious && !body.test) {
    return res.status(200).json({ ok: true, skipped: 'below alert level' });
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.TURNOUT_ALERT_FROM || 'Turnout alerts <onboarding@resend.dev>',
        to: [to],
        subject: mail.subject,
        text: mail.text,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      console.error('turnout alert: email provider returned', r.status);
      return res.status(502).json({ error: 'email provider rejected the request', status: r.status });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('turnout alert: could not reach the email provider');
    return res.status(502).json({ error: 'could not reach the email provider' });
  }
}
