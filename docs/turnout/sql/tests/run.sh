#!/bin/bash
# Runs the Turnout database tests on a throwaway PostgreSQL database.
# Needs a running PostgreSQL 14+ and a superuser connection via PGHOST/PGPORT/PGUSER.
# Usage: PGHOST=localhost PGUSER=postgres docs/turnout/sql/tests/run.sh
set -u
cd "$(dirname "$0")/.."
A="psql -v ON_ERROR_STOP=1 -q"
total_fail=0
for t in tests/rotation-and-parties.test.sql tests/claims-and-passing.test.sql tests/safety.test.sql tests/hidden-address.test.sql tests/report-alert.test.sql tests/phone-verification.test.sql; do
  $A -d postgres -c "drop database if exists turnout_test" -c "create database turnout_test" >/dev/null || exit 1
  $A -d turnout_test -f tests/stub.sql || exit 2           # stands in for Supabase's auth schema and roles
  for f in 001-schema.sql 002-membership-and-invites.sql 003-rotation-and-parties.sql 004-report-and-block.sql 005-hidden-address.sql 006-report-email-alert.sql 007-phone-verification.sql; do $A -d turnout_test -f "$f" >/dev/null 2>&1 || { echo "failed to load $f"; exit 3; }; done
  out=$($A -d turnout_test -t -A -f "$t" 2>&1)
  echo "$out" | grep -E '^(PASS|FAIL|SKIP)|ERROR'
  total_fail=$((total_fail + $(echo "$out" | grep -cE '^FAIL|ERROR')))
done
$A -d postgres -c "drop database if exists turnout_test" >/dev/null
[ "$total_fail" = 0 ] && echo "ALL TESTS PASSED" || { echo "$total_fail problem(s)"; exit 1; }
