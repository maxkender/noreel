#!/bin/bash
# Telecharge et rend lisibles les logs d'un build EAS.
# Sans argument : le dernier build iOS.
#
# Les logs sont stockes en brotli sur Google Cloud et servis en JSON par ligne :
# ni `curl` ni Python ne les decompressent seuls. D'ou ce script.
set -euo pipefail

BUILD_ID="${1:-}"
if [ -z "$BUILD_ID" ]; then
  BUILD_ID=$(npx --yes eas-cli@latest build:list --platform ios --limit 1 --json \
    --non-interactive 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s)[0].id))")
fi
echo "build $BUILD_ID"

node -e "
const fs=require('fs'), zlib=require('zlib'), os=require('os'), path=require('path');
const state=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.expo/state.json'),'utf8'));
const H={'Content-Type':'application/json','expo-session':state.auth.sessionSecret,
         'User-Agent':'eas-cli/16.0.0 darwin-arm64 node','Accept':'application/json'};
const q='query(\$id: ID!) { builds { byId(buildId: \$id) { logFiles } } }';
(async () => {
  const r = await fetch('https://api.expo.dev/graphql', {method:'POST',headers:H,
    body: JSON.stringify({query:q, variables:{id:'$BUILD_ID'}})});
  const j = await r.json();
  const urls = j.data.builds.byId.logFiles || [];
  let out = '';
  for (const u of urls) {
    const buf = Buffer.from(await (await fetch(u)).arrayBuffer());
    let txt;
    try { txt = zlib.brotliDecompressSync(buf).toString('utf8'); }
    catch { try { txt = zlib.gunzipSync(buf).toString('utf8'); } catch { txt = buf.toString('utf8'); } }
    out += txt + '\n';
  }
  const lines = out.split('\n').map(l => { try { const o=JSON.parse(l); return o.msg||o.message||''; } catch { return l; } });
  fs.writeFileSync('/tmp/eas-plain.txt', lines.join('\n'));
  console.log(lines.length + ' lignes -> /tmp/eas-plain.txt');
})();
"
echo "--- fin du log ---"
grep -avE "^\s*\$" /tmp/eas-plain.txt | tail -25
