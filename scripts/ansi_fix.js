const fs = require('fs');
const cp = require('child_process');
const path = require('path');

function fix() {
  let passes = 0;
  while (passes < 10) {
    passes++;
    console.log(`Pass ${passes}...`);
    try {
      cp.execSync('npx tsc --noEmit', { stdio: 'pipe' });
      console.log('Clean!');
      break;
    } catch(e) {
      let out = e.stdout.toString();
      out = out.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
      
      const missing = {};
      const lines = out.split('\n');
      for (const line of lines) {
        if (line.includes('error TS2304:') || line.includes('error TS2552:')) {
          let file = line.split('(')[0].trim();
          if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
          
          let match = line.match(/Cannot find name '([A-Z][a-zA-Z0-9]*)'/);
          if (match) {
            if (!missing[file]) missing[file] = new Set();
            missing[file].add(match[1]);
          }
        }
      }

      console.log("Missing map:", missing);

      const keys = Object.keys(missing);
      if (keys.length === 0) break;

      for (let file of keys) {
        const p = path.join(process.cwd(), file);
        if (!fs.existsSync(p)) continue;
        
        let c = fs.readFileSync(p, 'utf8');
        const icons = Array.from(missing[file]).filter(i => !['Client', 'Node', 'Element', 'Promise', 'Record', 'Event'].includes(i));
        
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
          } else if (c.includes('"use client";')) {
             c = c.replace(/("use client";\r?\n)/, `$1${newImport}`);
          } else {
             c = newImport + c;
          }
          
          fs.writeFileSync(p, c, 'utf8');
          console.log(`Updated ${file} with ${icons.join(', ')}`);
        }
      }
    }
  }
}
fix();
