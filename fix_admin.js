import fs from 'fs';

const files = [
  'src/pages/admin/AdminDashboard.tsx',
  'src/pages/admin/LibraryManagement.tsx',
  'src/pages/admin/OwnerManagement.tsx',
  'src/pages/admin/AdminAnalytics.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('useAuth')) {
    content = content.replace(/import \{ db \} from '\.\.\/\.\.\/lib\/firebase';/, "import { db } from '../../lib/firebase';\nimport { useAuth } from '../../context/AuthContext';");
  }
  
  if (!content.includes('const { user } = useAuth();')) {
    content = content.replace(/const \[loading, setLoading\] = useState\(true\);/, "const [loading, setLoading] = useState(true);\n  const { user } = useAuth();");
  }
  
  // Update useEffect to check user role
  content = content.replace(/useEffect\(\(\) => \{/g, "useEffect(() => {\n    if (user?.role !== 'SUPER_ADMIN') return;");
  
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
});
