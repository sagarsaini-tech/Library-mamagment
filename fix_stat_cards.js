import fs from 'fs';
let content = fs.readFileSync('src/pages/owner/OwnerDashboard.tsx', 'utf8');

const oldCards = `  const statCards = [
    { title: 'Total Seats', value: stats.totalSeats, icon: <UserSquare2 className="w-5 h-5 text-indigo-600" />, trend: '+5 this month' },
    { title: 'Occupied Seats', value: stats.occupiedSeats, icon: <UserSquare2 className="w-5 h-5 text-emerald-600" />, trend: '80% capacity' },
    { title: 'Vacant Seats', value: stats.vacantSeats, icon: <CheckCircle2 className="w-5 h-5 text-slate-600" />, trend: 'Ready to allocate' },
    { title: 'Total Students', value: stats.totalStudents, icon: <Users className="w-5 h-5 text-blue-600" />, trend: '+12% from last month' },
    { title: 'Monthly Income', value: \`₹\${stats.monthlyIncome.toLocaleString()}\`, icon: <TrendingUp className="w-5 h-5 text-emerald-600" />, trend: '+15% from last month' },
    { title: 'Pending Fees', value: stats.pendingFeeStudents, icon: <AlertCircle className="w-5 h-5 text-rose-500" />, trend: 'Action required' },
  ];`;

const newCards = `  const statCards = [
    { title: 'Total Students', value: stats.total, icon: <Users className="w-5 h-5 text-blue-600" />, trend: 'Active students' },
    { title: 'Active Students', value: stats.active, icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, trend: 'Currently studying' },
    { title: 'Occupied Seats', value: stats.occupied, icon: <UserSquare2 className="w-5 h-5 text-indigo-600" />, trend: 'Allocated seats' },
    { title: 'Monthly Revenue', value: \`₹\${(stats.revenue || 0).toLocaleString()}\`, icon: <TrendingUp className="w-5 h-5 text-emerald-600" />, trend: 'This month' },
  ];`;

// Remove dummy data that was outside the component
const oldDummyData = `const stats = {
  totalSeats: 150,
  occupiedSeats: 120,
  vacantSeats: 30,
  totalStudents: 145,
  monthlyIncome: 12500,
  pendingFeeStudents: 12,
};`;

content = content.replace(oldDummyData, '');
content = content.replace(oldCards, newCards);

fs.writeFileSync('src/pages/owner/OwnerDashboard.tsx', content);
