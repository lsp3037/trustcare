const fs = require('fs');
const cp = require('child_process');
const path = require('path');

function fix() {
  try {
    cp.execSync('npx tsc --noEmit', { stdio: 'pipe' });
    console.log('Clean!');
  } catch(e) {
    const out = e.stdout.toString();
    const missing = {};
    const lines = out.split('\n');
    for (const line of lines) {
      if (line.includes('error TS2304:') || line.includes('error TS2552:')) {
        let file = line.split('(')[0].trim();
        // clean ANSI
        file = file.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
        if (!file.endsWith('.tsx')) continue;
        
        let match = line.match(/Cannot find name '([A-Z][a-zA-Z0-9]*)'/);
        if (match) {
          if (!missing[file]) missing[file] = new Set();
          missing[file].add(match[1]);
        }
      }
    }

    console.log("Missing map:", missing);

    for (let file of Object.keys(missing)) {
      const p = path.join(process.cwd(), file);
      if (!fs.existsSync(p)) continue;
      
      let c = fs.readFileSync(p, 'utf8');
      const icons = Array.from(missing[file]).filter(i => !['Client', 'Node', 'Element', 'Promise'].includes(i));
      
      if (icons.length > 0) {
        let existing = [];
        c = c.replace(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"];?\r?\n/g, (match, p1) => {
          existing.push(...p1.split(',').map(i => i.trim()).filter(Boolean));
          return '';
        });
        
        const all = Array.from(new Set([...existing, ...icons]));
        const newImport = `import { ${all.join(', ')} } from 'lucide-react';\n`;
        
        if (c.includes("'use client';")) {
           c = c.replace(/('use client';\r?\n)/, `$1${newImport}`);
        } else {
           c = newImport + c;
        }
        
        fs.writeFileSync(p, c, 'utf8');
        console.log(`Updated ${file} with ${icons.join(', ')}`);
      }
    }
  }
}
fix();
