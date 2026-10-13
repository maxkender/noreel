// Compare un dictionnaire a la reference anglaise : memes cles, memes tableaux,
// memes variables, aucune valeur vide. `node scripts/check-dict.mjs pt`.
import fs from 'node:fs';
import ts from 'typescript';

const code = process.argv[2];
if (!code) { console.error('usage: node scripts/check-dict.mjs <code>'); process.exit(2); }

function load(file) {
  let src = fs.readFileSync(file, 'utf8');
  src = src.replace(/^import[^\n]*\n/gm, '');
  src = src.replace(/^export type[^\n]*(\n[^\n]*)*?;\s*$/m, '');
  src = src.replace(/^type Widen[\s\S]*?;\s*$/m, '');
  src = src.replace(/^export type Dict[^\n]*$/m, '');
  src = src.replace(/^\/\*\*[\s\S]*?\*\/$/m, '');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', js)(mod, mod.exports);
  const name = Object.keys(mod.exports).find((k) => k !== 'default' && typeof mod.exports[k] === 'object');
  return mod.exports[name];
}

const flat = (node, p = '', out = []) => {
  if (typeof node === 'string') { out.push([p, node]); return out; }
  if (Array.isArray(node)) { out.push([p, node]); return out; }
  if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) flat(v, p ? `${p}.${k}` : k, out);
  return out;
};
const KNOWN = new Set(['n', 'm', 'y', 'h', 'p', 'i', 'a', 'b', 'total', 'age', 'name', 'lived', 'lost', 'ahead', 'what', 'duration', 'level', 'app', 'email', 'who', 'from', 'to', 'day', 'life', 'waking', 'accent']);
const vars = (s) => (s.match(/\{([a-zA-Z]+)[:}]/g) ?? []).map((m) => m.slice(1, -1)).filter((v) => KNOWN.has(v)).sort().join(',');

const ref = new Map(flat(load('src/i18n/en.ts')));
const got = new Map(flat(load(`src/i18n/${code}.ts`)));
const errors = [];
for (const k of ref.keys()) if (!got.has(k)) errors.push(`manque : ${k}`);
for (const k of got.keys()) if (!ref.has(k)) errors.push(`en trop : ${k}`);
for (const [k, v] of got) {
  const r = ref.get(k);
  if (r === undefined) continue;
  if (Array.isArray(r)) {
    if (!Array.isArray(v) || v.length !== r.length) errors.push(`tableau de ${r.length} attendu : ${k}`);
    else v.forEach((x, i) => { if (typeof x !== 'string' || !x.trim()) errors.push(`vide : ${k}[${i}]`); });
    continue;
  }
  if (typeof v !== 'string') { errors.push(`pas une chaine : ${k}`); continue; }
  if (!v.trim()) errors.push(`vide : ${k}`);
  if (vars(v) !== vars(r)) errors.push(`variables ${JSON.stringify(vars(r))} attendues, ${JSON.stringify(vars(v))} trouvees : ${k}`);
}
if (errors.length) { console.log(errors.join('\n')); console.log(`\n${errors.length} probleme(s) dans ${code}.ts`); process.exit(1); }
console.log(`${code}.ts : ${got.size} cles, tout correspond a en.ts`);
