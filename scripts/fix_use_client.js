const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = [...walk(path.join(process.cwd(), 'app')), ...walk(path.join(process.cwd(), 'components'))];

for (const file of files) {
  const c = fs.readFileSync(file, 'utf8');
  const uc1 = "'use client';";
  const uc2 = '"use client";';
  if (c.includes(uc1) || c.includes(uc2)) {
    const idx1 = c.indexOf(uc1);
    const idx2 = c.indexOf(uc2);
    const idx = idx1 !== -1 ? idx1 : idx2;
    const str = idx1 !== -1 ? uc1 : uc2;
    
    // Check if it's not the first meaningful line
    const before = c.substring(0, idx).trim();
    if (before.length > 0) {
      console.log(`Fixing use client in ${file}`);
      let newC = c.replace(str, '');
      newC = str + '\n' + newC.trimStart();
      fs.writeFileSync(file, newC, 'utf8');
    }
  }
}
console.log('Done!');
