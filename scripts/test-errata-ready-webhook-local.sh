#!/usr/bin/env bash
# POST a payload that satisfies sendErrataReadyEmail "became ready" gates.
#
# Prereqs:
#   1) supabase start (or stack running) and in another terminal:
#      supabase functions serve sendErrataReadyEmail
#   2) Env vars the function reads must be set for that serve process (supabase/.env, etc.)
#   3) TEST_USER_ID must exist in public.users with an email
#   4) ERRATA_PATH must be an object path that exists in the errata bucket (default job-errata)
#
# Usage:
#   export ERRATA_WEBHOOK_SECRET='same-as-function-env'
#   export TEST_USER_ID='00000000-0000-0000-0000-000000000000'
#   export ERRATA_PATH='user_id/job_id/errata.pdf'
#   export JOB_ID=1   # optional, default 1
#   export FUNCTION_URL='http://127.0.0.1:54321/functions/v1/sendErrataReadyEmail'  # optional
#   ./scripts/test-errata-ready-webhook-local.sh

set -euo pipefail

: "${ERRATA_WEBHOOK_SECRET:?Set ERRATA_WEBHOOK_SECRET}"
: "${TEST_USER_ID:?Set TEST_USER_ID (existing public.users.user_id)}"
: "${ERRATA_PATH:?Set ERRATA_PATH (object key in errata bucket)}"

JOB_ID="${JOB_ID:-1}"
FUNCTION_URL="${FUNCTION_URL:-http://127.0.0.1:54321/functions/v1/sendErrataReadyEmail}"

BODY="$(python3 -c "
import json, os
uid = os.environ['TEST_USER_ID']
path = os.environ['ERRATA_PATH']
jid = int(os.environ.get('JOB_ID', '1'))
print(json.dumps({
  'type': 'UPDATE',
  'table': 'jobs',
  'schema': 'public',
  'record': {
    'id': jid,
    'user_id': uid,
    'status': 'ready_for_download',
    'errata_path': path,
    'errata_name': None,
  },
  'old_record': {
    'id': jid,
    'user_id': uid,
    'status': 'queued_for_review',
    'errata_path': None,
    'errata_name': None,
  },
}))
")"

curl -sS -i -X POST "$FUNCTION_URL" \
  -H 'Content-Type: application/json' \
  -H "x-webhook-secret: ${ERRATA_WEBHOOK_SECRET}" \
  --data-binary "$BODY"

echo
