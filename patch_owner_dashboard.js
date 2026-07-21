import fs from 'fs';

let content = fs.readFileSync('src/pages/owner/OwnerDashboard.tsx', 'utf8');

// The naive replace might be tricky, let's just do a string replace for the specific lines
content = content.replace(
  /unsubs\.push\(onSnapshot\(qStudents, \(snapshot\) => \{/g,
  `unsubs.push(onSnapshot(qStudents, (snapshot) => {`
);

// Actually, I can just find the end of the arrow functions by finding the matching "}));" that closes the unsubs.push
// and replace it with "}, (err) => console.error(err)));"

content = content.replace(/setStats\(prev => \(\{ \.\.\.prev, occupied \}\)\);\n    \}\)\);/g, "setStats(prev => ({ ...prev, occupied }));\n    }, (err) => console.error(err)));");

content = content.replace(/setStats\(prev => \(\{ \.\.\.prev, revenue \}\)\);\n    \}\)\);/g, "setStats(prev => ({ ...prev, revenue }));\n    }, (err) => console.error(err)));");

// for qStudents:
content = content.replace(/setStats\(prev => \(\{ \.\.\.prev, total, active \}\)\);\n    \}\)\);/g, "setStats(prev => ({ ...prev, total, active }));\n    }, (err) => console.error(err)));");

fs.writeFileSync('src/pages/owner/OwnerDashboard.tsx', content);

let contentAdmin = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');
contentAdmin = contentAdmin.replace(/setRecentLibraries\(librariesList\);\n    \}\)\);/g, "setRecentLibraries(librariesList);\n    }, (err) => console.error(err)));");
contentAdmin = contentAdmin.replace(/setStats\(prev => \(\{ \.\.\.prev, totalOwners, totalStaff, totalStudents \}\)\);\n    \}\)\);/g, "setStats(prev => ({ ...prev, totalOwners, totalStaff, totalStudents }));\n    }, (err) => console.error(err)));");
fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', contentAdmin);

