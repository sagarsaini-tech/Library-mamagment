import fs from 'fs';
let content = fs.readFileSync('src/pages/owner/OwnerDashboard.tsx', 'utf8');
content = content.replace(
  /className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"/,
  'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"'
);
fs.writeFileSync('src/pages/owner/OwnerDashboard.tsx', content);
