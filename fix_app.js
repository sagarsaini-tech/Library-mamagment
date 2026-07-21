import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace standard <Route element={<ProtectedRoute />}> wraps for specific roles
content = content.replace(
  /<Route path="\/admin" element={<AdminLayout \/>}>/g,
  '<Route path="/admin" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN"]}><AdminLayout /></ProtectedRoute>}>'
);

content = content.replace(
  /<Route path="\/owner" element={<OwnerLayout \/>}>/g,
  '<Route path="/owner" element={<ProtectedRoute allowedRoles={["LIBRARY_OWNER"]}><OwnerLayout /></ProtectedRoute>}>'
);

content = content.replace(
  /<Route path="\/student" element={<StudentLayout \/>}>/g,
  '<Route path="/student" element={<ProtectedRoute allowedRoles={["STUDENT"]}><StudentLayout /></ProtectedRoute>}>'
);

// Staff route is slightly more complicated because it has multiple roles, but let's just allow all staff roles
content = content.replace(
  /<Route path="\/staff" element={<StaffLayout \/>}>/g,
  '<Route path="/staff" element={<ProtectedRoute allowedRoles={["MANAGER", "RECEPTIONIST", "ACCOUNTANT", "LIBRARIAN", "CUSTOM"]}><StaffLayout /></ProtectedRoute>}>'
);

fs.writeFileSync('src/App.tsx', content);
