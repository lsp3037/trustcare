const fs = require('fs');
const path = require('path');

const map = {
  "app/(dashboard)/dashboard/clients/[id]/page.tsx": ["QrCode", "Save", "Plus", "ClipboardList", "X", "Wrench"],
  "app/(dashboard)/dashboard/clients/page.tsx": ["Users", "Plus", "CheckCircle2", "FileText", "User", "Building", "Phone", "Mail", "Laptop", "QrCode", "Search", "AlertCircle"],
  "app/(dashboard)/dashboard/inventory/[id]/page.tsx": ["AlertTriangle", "ArrowLeft", "Edit", "Trash2", "CheckCircle2", "Layers", "Award", "Cpu", "Database", "Calendar", "DollarSign", "Percent"],
  "app/(dashboard)/dashboard/inventory/page.tsx": ["Package", "Plus", "CheckCircle2", "Search", "AlertCircle", "Boxes", "Trash2"],
  "app/(dashboard)/dashboard/orders/[id]/_components/AttachmentsSection.tsx": ["Paperclip", "Upload", "Film", "FileText", "Eye", "Trash2", "X"],
  "app/(dashboard)/dashboard/orders/[id]/_components/OrderDetailsClient.tsx": ["CheckCircle2", "AlertTriangle", "FileText", "ChevronDown", "Check", "Calendar", "DollarSign"],
  "app/(dashboard)/dashboard/orders/[id]/temp-print/page.tsx": ["AlertTriangle", "Building", "Printer"],
  "app/(dashboard)/dashboard/orders/page.tsx": ["ClipboardList", "Plus", "Search", "Filter", "AlertCircle", "Wrench", "Calendar", "DollarSign", "Trash2"],
  "app/(dashboard)/dashboard/services/page.tsx": ["Plus", "Search"]
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
