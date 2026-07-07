const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/(dashboard)/dashboard/orders/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Inject import at the top
if (!content.includes('import { SlaTracker }')) {
  content = content.replace(
    "import { getStatusColor } from '@/lib/utils/orderStatus';",
    "import { getStatusColor } from '@/lib/utils/orderStatus';\nimport { SlaTracker } from '@/components/ui/SlaTracker';"
  );
}

// 2. Inject SlaTracker inside the Kanban card
// The Kanban card has:
// <div className="p-3 bg-slate-950/40 rounded-none border border-slate-900">
//   <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Problema Reportado:</p>
//   <p className="text-xs text-slate-300 line-clamp-2 italic">
//     "{stripHtml(order.reported_problem)}"
//   </p>
// </div>

const searchString = `                      <p className="text-xs text-slate-300 line-clamp-2 italic">\n                        "{stripHtml(order.reported_problem)}"\n                      </p>\n                    </div>`;

const replaceString = `                      <p className="text-xs text-slate-300 line-clamp-2 italic">\n                        "{stripHtml(order.reported_problem)}"\n                      </p>\n                    </div>\n                    \n                    <div className="mt-2">\n                      <SlaTracker variant="mini" mockOverdue={false} />\n                    </div>`;

if (!content.includes('<SlaTracker variant="mini"')) {
  content = content.replace(searchString, replaceString);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Injection successful!');
