import fs from 'fs';
let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

const redirectSuperAdmin = `  const { user, logout } = useAuth();

  if (user?.role === 'SUPER_ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (user?.role === 'LIBRARY_OWNER') {`;

content = content.replace("  const { user, logout } = useAuth();\n\n  if (user?.role === 'LIBRARY_OWNER') {", redirectSuperAdmin);
fs.writeFileSync('src/pages/Home.tsx', content);
