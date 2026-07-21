import fs from 'fs';
let content = fs.readFileSync('src/pages/owner/FeeManagement.tsx', 'utf8');

// Fix string templates
content = content.replace(/\\\$/g, '$');

fs.writeFileSync('src/pages/owner/FeeManagement.tsx', content);
