const fs = require('fs');
const path = require('path');

const map = {
  "app/(auth)/login/page.tsx": ["Mail", "Lock", "ArrowRight"],
  "app/(auth)/register/page.tsx": ["Building", "User", "Phone", "Mail", "Lock", "ArrowRight"],
  "app/(dashboard)/dashboard/clients/[id]/page.tsx": ["AlertTriangle", "ArrowLeft", "Edit", "CheckCircle2", "Building", "User", "FileText", "Phone", "Mail", "Laptop", "Trash2", "FolderPlus"]
};

for (const [file, icons] of Object.entries(map)) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) continue;
  
  let c = fs.readFileSync(p, 'utf8');
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
  console.log(`Updated ${file} with ${icons.length} new icons.`);
}
