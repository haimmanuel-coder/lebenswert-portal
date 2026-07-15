#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
readarray -t VAPID_KEYS < <(node - <<'NODE'
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log(keys.publicKey);
console.log(keys.privateKey);
NODE
)
export VAPID_PUBLIC_KEY="${VAPID_KEYS[0]}"
export VAPID_PRIVATE_KEY="${VAPID_KEYS[1]}"
pnpm test
