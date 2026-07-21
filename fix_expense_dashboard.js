import fs from 'fs';
let content = fs.readFileSync('src/pages/owner/ExpenseManagement.tsx', 'utf8');
content = content.replace(/stats\.totalMonthlyIncome\.toLocaleString\(\)/g, "(stats?.totalMonthlyIncome || 0).toLocaleString()");
content = content.replace(/stats\.totalMonthlyExpenses\.toLocaleString\(\)/g, "(stats?.totalMonthlyExpenses || 0).toLocaleString()");
content = content.replace(/stats\.netProfit\.toLocaleString\(\)/g, "(stats?.netProfit || 0).toLocaleString()");
content = content.replace(/stats\.pendingExpensesAmount\.toLocaleString\(\)/g, "(stats?.pendingExpensesAmount || 0).toLocaleString()");
content = content.replace(/expense\.amount\.toLocaleString\(\)/g, "(expense?.amount || 0).toLocaleString()");
fs.writeFileSync('src/pages/owner/ExpenseManagement.tsx', content);

let reports = fs.readFileSync('src/pages/owner/Reports.tsx', 'utf8');
reports = reports.replace(/stats\.totalIncome\.toLocaleString\(\)/g, "(stats?.totalIncome || 0).toLocaleString()");
reports = reports.replace(/stats\.totalExpense\.toLocaleString\(\)/g, "(stats?.totalExpense || 0).toLocaleString()");
reports = reports.replace(/stats\.netProfit\.toLocaleString\(\)/g, "(stats?.netProfit || 0).toLocaleString()");
reports = reports.replace(/stats\.pendingFeesAmount\.toLocaleString\(\)/g, "(stats?.pendingFeesAmount || 0).toLocaleString()");
fs.writeFileSync('src/pages/owner/Reports.tsx', reports);
