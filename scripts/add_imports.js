const fs = require('fs');
const path = require('path');

const missing = {
  'app/(dashboard)/dashboard/services/page.tsx': ['Wrench', 'Edit3', 'Trash2', 'Sparkles', 'X', 'CheckCircle2', 'AlertCircle', 'ToggleRight', 'ToggleLeft'],
  'app/(dashboard)/dashboard/settings/checklists/page.tsx': ['ArrowLeft', 'Settings', 'ClipboardList', 'Trash2', 'Plus', 'CheckCircle2', 'AlertTriangle', 'Save', 'HelpCircle'],
  'app/(dashboard)/dashboard/settings/company/page.tsx': ['Building', 'AlertCircle', 'CheckCircle2', 'Upload', 'ImageIcon', 'Trash2', 'Phone', 'Mail'],
  'app/(dashboard)/dashboard/settings/team/page.tsx': ['Users', 'UserPlus', 'ShieldAlert', 'Mail', 'Trash2', 'X', 'CheckCircle2', 'Copy'],
  'app/(dashboard)/usuarios/page.tsx': ['Settings', 'Eye', 'Wrench', 'Users', 'UserPlus', 'Search', 'AlertCircle', 'User', 'Phone', 'Pencil', 'Trash2', 'X', 'CheckCircle2', 'Copy', 'Mail', 'Shield', 'Layers'],
  'app/(public)/orcamento/[id]/page.tsx': ['AlertTriangle', 'CheckCircle2', 'Shield', 'User', 'Wrench', 'ChevronDown', 'FileSignature', 'Check'],
  'app/rastreio/page.tsx': ['Wrench', 'ShieldCheck', 'Search', 'AlertCircle', 'ArrowLeft', 'Clock', 'Calendar', 'CheckCircle2', 'FileText', 'ChevronRight', 'Lock'],
  'components/OnboardingModal.tsx': ['PartyPopper', 'Sparkles', 'Building', 'AlertCircle', 'Upload', 'ImageIcon', 'Phone', 'Mail', 'ArrowRight']
};

for (let [file, icons] of Object.entries(missing)) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) {
    console.log('Not found:', p);
    continue;
  }
  let c = fs.readFileSync(p, 'utf8');
  
  if (file === 'app/(dashboard)/usuarios/page.tsx') {
    if (!c.includes('useAuth')) {
      c = "import { useAuth } from '@/components/providers/AuthProvider';\n" + c;
    }
  }

  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/;
  const match = c.match(importRegex);

  if (match) {
    const current = match[1].split(',').map(i => i.trim()).filter(Boolean);
    const all = Array.from(new Set([...current, ...icons]));
    c = c.replace(match[0], 'import { ' + all.join(', ') + ' } from \'lucide-react\'');
  } else {
    c = c.replace(/('use client';\r?\n)/, "$1import { " + icons.join(', ') + " } from 'lucide-react';\n");
    if (c.indexOf('import {') === -1) {
      c = "import { " + icons.join(', ') + " } from 'lucide-react';\n" + c;
    }
  }

  fs.writeFileSync(p, c, 'utf8');
  console.log('Fixed', file);
}
console.log('Done!');
