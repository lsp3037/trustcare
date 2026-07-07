const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function getMissing() {
  try {
    cp.execSync('npx tsc --noEmit', { stdio: 'pipe' });
    return {};
  } catch (e) {
    const out = e.stdout.toString();
    const regex = /error TS2304: Cannot find name '([A-Z][a-zA-Z0-9]*)'/g;
    const missing = {};
    let m;
    while ((m = regex.exec(out)) !== null) {
      const line = out.substring(Math.max(0, out.lastIndexOf('\n', m.index)), m.index);
      const file = line.split('(')[0].trim().split('\n').pop();
      if (!missing[file]) missing[file] = new Set();
      missing[file].add(m[1]);
    }
    return missing;
  }
}

const missing = getMissing();

for (const file of Object.keys(missing)) {
  if (file.includes('WhatsAppButton') || !file.endsWith('.tsx')) continue;
  
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) continue;
  
  let c = fs.readFileSync(p, 'utf8');
  const icons = Array.from(missing[file]).filter(i => i !== 'Client');
  
  if (icons.length === 0) continue;

  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/;
  const match = c.match(importRegex);

  if (match) {
    const current = match[1].split(',').map(i => i.trim()).filter(Boolean);
    const all = Array.from(new Set([...current, ...icons]));
    c = c.replace(match[0], 'import { ' + all.join(', ') + ' } from \'lucide-react\'');
  } else {
    c = 'import { ' + icons.join(', ') + ' } from \'lucide-react\';\n' + c;
  }

  fs.writeFileSync(p, c, 'utf8');
  console.log('Fixed imports in', file);
}
console.log('Done!');
