import fs from 'fs';

let contentAdmin = fs.readFileSync('src/pages/admin/AdminAnalytics.tsx', 'utf8');
contentAdmin = contentAdmin.replace(/value\.toLocaleString\(\)/g, "value?.toLocaleString?.() || value");
fs.writeFileSync('src/pages/admin/AdminAnalytics.tsx', contentAdmin);

let contentReports = fs.readFileSync('src/pages/owner/Reports.tsx', 'utf8');
contentReports = contentReports.replace(/value\.toLocaleString\(\)/g, "value?.toLocaleString?.() || value");
fs.writeFileSync('src/pages/owner/Reports.tsx', contentReports);
