import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const importStmt = `const SeedAdmin = lazy(() => import('./pages/SeedAdmin').then(m => ({ default: m.SeedAdmin })));\n\nexport default function App() {`;
content = content.replace('export default function App() {', importStmt);

const routeStmt = `          <Route path="/register" element={<Register />} />\n          <Route path="/seed-admin" element={<SeedAdmin />} />`;
content = content.replace('          <Route path="/register" element={<Register />} />', routeStmt);

fs.writeFileSync('src/App.tsx', content);
