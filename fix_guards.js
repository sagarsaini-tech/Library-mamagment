import fs from 'fs';

const files = [
  'src/pages/owner/StudentManagement.tsx',
  'src/pages/owner/SeatManagement.tsx',
  'src/pages/owner/FeeManagement.tsx',
  'src/pages/owner/ExpenseManagement.tsx',
  'src/pages/owner/StaffManagement.tsx',
  'src/pages/owner/Settings.tsx',
  'src/pages/owner/Reports.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/if \(!user\)/g, 'if (!ownerUid)');
  fs.writeFileSync(file, content);
});
