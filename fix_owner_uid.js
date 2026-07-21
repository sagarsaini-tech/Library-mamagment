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
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Insert ownerUid definition right after useAuth
  if (!content.includes('const ownerUid =')) {
    content = content.replace(
      /const \{ user \} = useAuth\(\);/,
      `const { user } = useAuth();\n  const ownerUid = user?.role === 'LIBRARY_OWNER' ? user.id : user?.libraryId;`
    );
  }

  // Replace `libraries/${user.uid}` with `libraries/${ownerUid}`
  content = content.replace(/\`libraries\/\$\{user\.uid\}\//g, `\`libraries/\${ownerUid}/`);
  // also handle single quotes or other variations if any
  content = content.replace(/'libraries', user\.uid/g, `'libraries', ownerUid || ''`);

  // add ownerUid to dependencies where user.uid was used
  content = content.replace(/\[user\.uid\]/g, `[ownerUid]`);
  content = content.replace(/\[user\]/g, `[user, ownerUid]`);

  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
});
