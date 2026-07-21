import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace("import { Settings } from './pages/owner/Settings';", "import { Settings } from './pages/owner/Settings';\nimport { VisitorManagement } from './pages/shared/VisitorManagement';");

content = content.replace(
  "<Route path=\"staff\" element={<StaffManagement />} />",
  "<Route path=\"staff\" element={<StaffManagement />} />\n              <Route path=\"visitors\" element={<VisitorManagement />} />"
);

content = content.replace(
  "<Route path=\"dashboard\" element={<StaffDashboard />} />",
  "<Route path=\"dashboard\" element={<StaffDashboard />} />\n              <Route path=\"visitors\" element={<VisitorManagement />} />"
);

fs.writeFileSync('src/App.tsx', content);
