#!/usr/bin/env bash
# Build locally, upload an isolated release, verify, then switch systemd.
set -Eeuo pipefail

host=39.109.56.32
domain=monopoly.75gee.top
ssh_port=22
usage() {
  printf '%s\n' 'Usage: bash scripts/deploy-native.sh [--host IPv4] [--domain DOMAIN] [--ssh-port PORT]' \
    'Defaults: root@39.109.56.32:22, https://monopoly.75gee.top' \
    'Deploys the current local workspace. Restart clears in-memory rooms.'
}
while (($#)); do
  case "$1" in
    --host|--domain|--ssh-port)
      (($# >= 2)) || { usage >&2; exit 2; }
      case "$1" in
        --host) host=$2 ;;
        --domain) domain=$2 ;;
        --ssh-port) ssh_port=$2 ;;
      esac
      shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; exit 2 ;;
  esac
done
[[ $host =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || { printf 'Expected IPv4 host\n' >&2; exit 2; }
[[ $domain =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$ ]] || { printf 'Invalid domain\n' >&2; exit 2; }
[[ $ssh_port =~ ^[0-9]{1,5}$ ]] && ((10#$ssh_port >= 1 && 10#$ssh_port <= 65535)) || { printf 'Invalid SSH port\n' >&2; exit 2; }

project_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$project_dir"
for command in node pnpm git ssh scp tar; do
  command -v "$command" >/dev/null || { printf 'Missing command: %s\n' "$command" >&2; exit 1; }
done
node -e 'if (Number(process.versions.node.split(".")[0]) < 24) throw new Error("Node.js 24+ required")'
expected_pnpm=$(node -p 'JSON.parse(require("node:fs").readFileSync("package.json", "utf8")).packageManager.split("@")[1]')
[[ $(pnpm --version) == "$expected_pnpm" ]] || { printf 'pnpm %s required\n' "$expected_pnpm" >&2; exit 1; }
revision=$(git rev-parse HEAD)
release="$(date -u +%Y%m%dT%H%M%SZ)-${revision:0:7}-$$"
ssh_args=(-o BatchMode=yes -o ConnectTimeout=12 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -p "$ssh_port")
target="root@$host"

printf 'Deploying local workspace to %s, release %s. Restart clears rooms.\n' "$target" "$release"
ssh "${ssh_args[@]}" "$target" 'set -eu; test "$(id -u)" = 0; test -L /opt/monopoly-world-tour/current; systemctl is-active --quiet monopoly-world-tour; test -x /usr/local/bin/node; /usr/local/bin/node -e '\''if(Number(process.versions.node.split(".")[0])<24)process.exit(1)'\''; command -v flock >/dev/null; test -z "$(ss -ltnH sport = :13001)"'

temp_dir=$(mktemp -d "${TMPDIR:-/tmp}/fortune-deploy.XXXXXX")
cleanup_local() {
  # Remove only the exact directory created by this invocation.
  if [[ -n ${temp_dir:-} && -d $temp_dir && $(basename "$temp_dir") == fortune-deploy.* ]]; then
    rm -rf -- "$temp_dir"
  fi
}
trap cleanup_local EXIT
stage="$temp_dir/release"
pnpm install --frozen-lockfile
pnpm build
mkdir -p "$stage/apps"
pnpm --filter @fortune/server deploy --prod --legacy "$stage/apps/server"
mkdir -p "$stage/apps/web"
cp -R apps/web/dist "$stage/apps/web/dist"
cp scripts/deploy-verify.mjs "$stage/deploy-verify.mjs"

# Repair pnpm's workspace self-reference; canonicalize /tmp on macOS.
node --input-type=module - "$stage" "$revision" "$release" <<'NODE'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
const [stage, revision, release] = process.argv.slice(2)
const root = fs.realpathSync(stage)
const self = path.join(root, 'apps/server/node_modules/.pnpm/node_modules/@fortune/server')
// lstat also detects dangling links; existsSync follows their missing targets.
if (fs.lstatSync(self, { throwIfNoEntry: false })?.isSymbolicLink()) {
  fs.unlinkSync(self)
  fs.symlinkSync(path.relative(path.dirname(self), path.join(root, 'apps/server')), self)
}
let links = 0
const hashes = {}
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name)
    const stat = fs.lstatSync(file)
    if (stat.isSymbolicLink()) {
      if (!fs.realpathSync(file).startsWith(root + path.sep)) throw new Error(`External symlink: ${file}`)
      if (path.isAbsolute(fs.readlinkSync(file))) throw new Error(`Absolute symlink: ${file}`)
      links++
    } else if (stat.isDirectory()) walk(file)
    else {
      if (name.endsWith('.node')) throw new Error(`Native module needs Linux packaging: ${file}`)
      hashes[path.relative(root, file)] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    }
  }
}
walk(root)
fs.writeFileSync(path.join(root, 'release.json'), JSON.stringify({
  release, revision, source: 'local-workspace',
  workspaceStatus: execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }),
  builtAt: new Date().toISOString(), links, hashes,
}, null, 2) + '\n')
console.log(`Package verified: ${links} internal symlinks, no native modules`)
NODE
archive="$temp_dir/$release.tar.gz"
if [[ $(uname -s) == Darwin ]]; then
  tar --no-xattrs --no-mac-metadata -czf "$archive" -C "$stage" .
else
  tar -czf "$archive" -C "$stage" .
fi
checksum=$(node -e 'const fs=require("node:fs"),c=require("node:crypto");console.log(c.createHash("sha256").update(fs.readFileSync(process.argv[1])).digest("hex"))' "$archive")
scp -o BatchMode=yes -o ConnectTimeout=12 -P "$ssh_port" "$archive" "$target:/opt/monopoly-world-tour/releases/$release.tar.gz"

# Keep the deployment lock through candidate checks, switch and HTTPS checks.
ssh "${ssh_args[@]}" "$target" bash -s -- "$release" "$checksum" "$domain" "$host" <<'REMOTE'
set -Eeuo pipefail
release=$1 checksum=$2 domain=$3 host=$4
base=/opt/monopoly-world-tour
new="$base/releases/$release"
candidate="monopoly-candidate-$release"
exec 9>"$base/deploy.lock"
flock -n 9 || { printf 'Another deployment is running\n' >&2; exit 1; }
old=$(readlink -f "$base/current")
[[ $old == "$base/releases/"* && -d $old && -f $old/apps/server/dist/index.js ]] || exit 1
test ! -e "$base/current.next"
test ! -e "$new"
test -z "$(ss -ltnH sport = :13001)"
switched=0
candidate_started=0
finish() {
  status=$?
  trap - EXIT HUP INT TERM
  set +e
  if ((status != 0)); then
    journalctl -u "$candidate" -u monopoly-world-tour -n 35 --no-pager >&2
    if ((switched)); then
      printf 'Deployment failed; rolling back to %s\n' "$old" >&2
      ln -s "$old" "$base/rollback-$release.next" &&
        mv -Tf "$base/rollback-$release.next" "$base/current" &&
        systemctl restart monopoly-world-tour &&
        /usr/local/bin/node "$new/deploy-verify.mjs" "$old/apps/web/dist" http://127.0.0.1:3001 entry
      if (($? != 0)); then printf 'ROLLBACK FAILED: manual intervention required\n' >&2; fi
    fi
  fi
  if ((candidate_started)); then systemctl stop "$candidate"; fi
  if [[ -L "$base/current.next" && $(readlink "$base/current.next") == "$new" ]]; then
    unlink "$base/current.next"
  fi
  exit "$status"
}
trap finish EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
printf '%s  %s\n' "$checksum" "$base/releases/$release.tar.gz" | sha256sum -c -
mkdir "$new"
tar --no-same-owner -xzf "$base/releases/$release.tar.gz" -C "$new"
# mktemp roots can be mode 700; the service needs directory traversal.
chown -R root:root "$new"
chmod 755 "$new"
candidate_started=1
systemd-run --unit="$candidate" --uid=monopoly --gid=monopoly \
  --property="WorkingDirectory=$new" --property=NoNewPrivileges=true \
  --property=PrivateTmp=true --property=ProtectSystem=strict --property=ProtectHome=true \
  --property=MemoryMax=512M --setenv=NODE_ENV=production --setenv=HOST=127.0.0.1 \
  --setenv=PORT=13001 /usr/local/bin/node apps/server/dist/index.js
/usr/local/bin/node "$new/deploy-verify.mjs" "$new/apps/web/dist" http://127.0.0.1:13001 all
systemctl is-active --quiet "$candidate"
ln -s "$new" "$base/current.next"
switched=1
mv -Tf "$base/current.next" "$base/current"
systemctl restart monopoly-world-tour
/usr/local/bin/node "$new/deploy-verify.mjs" "$new/apps/web/dist" http://127.0.0.1:3001 all
/usr/local/bin/node "$new/deploy-verify.mjs" "$new/apps/web/dist" "https://$domain" entry "$host"
systemctl is-active --quiet monopoly-world-tour
systemctl stop "$candidate"
candidate_started=0
test -z "$(ss -ltnH sport = :13001)"
systemctl show monopoly-world-tour -p ActiveState -p SubState -p NRestarts -p MemoryCurrent
printf 'Deployed: %s\nPrevious release (retained): %s\n' "$new" "$old"
REMOTE
printf 'Deployment complete: https://%s (direct server %s), release %s\n' "$domain" "$host" "$release"
