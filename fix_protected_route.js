import fs from 'fs';
let content = fs.readFileSync('src/components/ProtectedRoute.tsx', 'utf8');
content = content.replace(
  /export const ProtectedRoute: React\.FC<ProtectedRouteProps> = \(\{ allowedRoles \}\) => \{/,
  'export const ProtectedRoute: React.FC<ProtectedRouteProps & { children?: React.ReactNode }> = ({ allowedRoles, children }) => {'
);
content = content.replace(
  /return <Outlet \/>;/,
  'return <>{children ? children : <Outlet />}</>;'
);
fs.writeFileSync('src/components/ProtectedRoute.tsx', content);
