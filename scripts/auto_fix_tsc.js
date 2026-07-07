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
      console.log('Build clean!');
      break;
    } catch (e) {
      const out = e.stdout.toString();
      const regex = /error TS(?:2304|2552): Cannot find name '([A-Z][a-zA-Z0-9]*)'/g;
      let missing = {};
      let hasError = false;
      let m;
      while ((m = regex.exec(out)) !== null) {
        const line = out.substring(Math.max(0, out.lastIndexOf('\n', m.index)), m.index);
        let file = line.split('(')[0].trim().split('\n').pop().trim();
        // Remove ANSI codes if any
        file = file.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
        if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
        if (!missing[file]) missing[file] = new Set();
        missing[file].add(m[1]);
        hasError = true;
      }
      
      // Also check for Lock issue in rastreio/page.tsx
      if (out.includes("app/rastreio/page.tsx") && out.includes("TS2786") && out.includes("Lock")) {
        if (!missing["app/rastreio/page.tsx"]) missing["app/rastreio/page.tsx"] = new Set();
        missing["app/rastreio/page.tsx"].add("Lock");
        hasError = true;
      }
      
      // Also check for AuthProvider issue
      const authRegex = /([a-zA-Z0-9_./\-\\()]+(?:\.tsx|\.ts)).*error TS2307: Cannot find module '@\/components\/providers\/AuthProvider'/g;
      let am;
      while ((am = authRegex.exec(out)) !== null) {
        let file = am[1].trim();
        file = file.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
        if (!missing[file]) missing[file] = new Set();
        missing[file].add('AuthProvider');
        hasError = true;
      }

      if (!hasError) {
        console.log('No recognizable errors found, but build failed. Output:\n' + out);
        break;
      }

      for (const file of Object.keys(missing)) {
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) continue;
        let c = fs.readFileSync(file, 'utf8');
        const icons = Array.from(missing[file]).filter(i => 
          i !== 'Client' && i !== 'Element' && i !== 'Node' && i !== 'Promise' && i !== 'Record' && i !== 'Event' && i !== 'AuthProvider'
        );
        
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
        }
        
        if (missing[file].has('AuthProvider')) {
          if (!c.includes('useAuth')) {
            c = "import { useAuth } from '@/components/providers/AuthProvider';\n" + c;
          }
        }

        fs.writeFileSync(file, c, 'utf8');
        console.log(`Updated ${file}`);
      }
    }
  }
}

fix();
