import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');
content = content.replace(/stats\.revenue\.toLocaleString\(\)/g, "(stats.revenue || 0).toLocaleString()");
fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', content);
