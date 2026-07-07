const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const original = content;

  // 1. Loader2 -> LoadingSpinner
  if (content.includes('Loader2')) {
    // Import
    if (!content.includes("import { LoadingSpinner } from '@/components/ui/LoadingSpinner'")) {
      content = content.replace(/import \{([^}]*)Loader2([^}]*)\} from 'lucide-react';/g, (match, p1, p2) => {
        const remaining = p1.trim() + (p1.trim() && p2.trim() ? ', ' : '') + p2.trim();
        let replace = remaining ? `import { ${remaining} } from 'lucide-react';\n` : '';
        return replace + `import { LoadingSpinner } from '@/components/ui/LoadingSpinner';`;
      });
      // Handle when it wasn't the only import
      content = content.replace(/,?\s*Loader2\s*,?/g, (match) => {
        if (match.startsWith(',') && match.endsWith(',')) return ', ';
        if (match.startsWith(',')) return '';
        if (match.endsWith(',')) return '';
        return '';
      });
      // if import { } left
      content = content.replace(/import\s*\{\s*\}\s*from\s*'lucide-react';\n?/g, '');
    }

    // Tag
    content = content.replace(/<Loader2 /g, '<LoadingSpinner ');
  }

  // 2. rounded-* -> rounded-none
  // match rounded-sm, rounded-md, rounded-lg, rounded-xl, rounded-2xl, rounded-3xl
  // do not match rounded-full
  const roundedRegex = /\brounded-(sm|md|lg|xl|2xl|3xl)\b/g;
  if (roundedRegex.test(content)) {
    content = content.replace(roundedRegex, 'rounded-none');
  }

  // 3. Gradients -> Solid
  // Pattern: bg-gradient-to-[a-z] from-(blue-600) to-(indigo-600) hover:from-(blue-500) hover:to-(indigo-500)
  // Replaced with: bg-$1 hover:bg-$3
  const gradientRegex = /\bbg-gradient-to-[a-z]\s+from-([a-z]+-\d+)\s+to-([a-z]+-\d+)(?:\s+hover:from-([a-z]+-\d+)\s+hover:to-([a-z]+-\d+))?/g;
  if (gradientRegex.test(content)) {
    content = content.replace(gradientRegex, (match, from, to, hoverFrom, hoverTo) => {
      if (hoverFrom) {
        return `bg-${from} hover:bg-${hoverFrom}`;
      }
      return `bg-${from}`;
    });
  }

  // 4. WhatsAppIcon -> WhatsAppButton
  if (content.includes('const WhatsAppIcon =')) {
    // Remove WhatsAppIcon definition (assuming it's a block)
    content = content.replace(/const WhatsAppIcon =[\s\S]*?<\/svg>\s*\)?;/g, '');
  }
  if (content.includes('const getWhatsAppLink =')) {
    content = content.replace(/const getWhatsAppLink =[\s\S]*?};/g, '');
  }

  // Also replace usages like <WhatsAppIcon ... />
  // but this might require manual review in some files.
  // In our case we have specific anchor blocks to replace.

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Modified: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        walkDir(fullPath);
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, '../app'));
walkDir(path.join(__dirname, '../components'));
console.log('Done!');
