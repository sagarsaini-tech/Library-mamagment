import fs from 'fs';

const code = fs.readFileSync('src/pages/owner/Reports.tsx', 'utf8');

const exportCSVcode = `
  const exportCSV = (type: string) => {
    let csv = '';
    let filename = '';

    if (type === 'overview') {
      csv = "Metric,Value\\n";
      csv += \\\`Total Students,\\\${stats.totalStudents}\\n\\\`;
      csv += \\\`Active Students,\\\${stats.activeStudents}\\n\\\`;
      csv += \\\`Occupied Seats,\\\${stats.occupiedSeats}\\n\\\`;
      csv += \\\`Vacant Seats,\\\${stats.vacantSeats}\\n\\\`;
      csv += \\\`Income,\\\${stats.totalIncome}\\n\\\`;
      csv += \\\`Expenses,\\\${stats.totalExpense}\\n\\\`;
      csv += \\\`Net Profit,\\\${stats.netProfit}\\n\\\`;
      filename = "Library_Overview_Report.csv";
    } else if (type === 'students') {
      csv = "Student ID,Status,Fee Status,Pending Amount,Created At\\n";
      students.forEach(s => {
        csv += \\\`\\\${s.id},\\\${s.status},\\\${s.feeStatus},\\\${s.pendingAmount || 0},\\\${s.createdAt ? new Date(s.createdAt.toDate ? s.createdAt.toDate() : s.createdAt).toLocaleDateString() : 'N/A'}\\n\\\`;
      });
      filename = "Students_Report.csv";
    } else if (type === 'fees') {
      csv = "Payment ID,Amount Received,Date,Status\\n";
      filteredPayments.forEach(p => {
        csv += \\\`\\\${p.id},\\\${p.amountReceived},\\\${p.paymentDate},\\\${p.status}\\n\\\`;
      });
      filename = "Fees_Report.csv";
    } else if (type === 'expenses') {
      csv = "Expense ID,Category,Amount,Date,Status\\n";
      filteredExpenses.forEach(e => {
        csv += \\\`\\\${e.id},\\\${e.category},\\\${e.amount},\\\${e.date},\\\${e.status}\\n\\\`;
      });
      filename = "Expenses_Report.csv";
    } else if (type === 'seats') {
      csv = "Seat Number,Status\\n";
      seats.forEach(s => {
        csv += \\\`\\\${s.seatNumber},\\\${s.isOccupied ? 'Occupied' : 'Vacant'}\\n\\\`;
      });
      filename = "Seats_Report.csv";
    }

    if (csv) {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    }
  };
`;

const jsxButtonsCode = `
          <div className="flex gap-2 border-l border-slate-200 pl-3">
            <select 
              onChange={(e) => { if(e.target.value) { exportCSV(e.target.value); e.target.value = ''; } }}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 shadow-sm"
            >
              <option value="">Export CSV...</option>
              <option value="overview">Overview</option>
              <option value="students">Students</option>
              <option value="fees">Fees</option>
              <option value="expenses">Expenses</option>
              <option value="seats">Seats</option>
            </select>
            <button onClick={exportPrint} className="flex items-center justify-center px-4 py-2.5 bg-indigo-600 border border-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm" title="Print/PDF">
              <Printer className="w-4 h-4 mr-2" /> PDF / Print
            </button>
          </div>
`;

// Simple string replacement using regex or index
let result = code.replace(/const exportCSV = \([\s\S]*?if \(csv\) {[\s\S]*?\}\s*};\s*/m, exportCSVcode.replace(/\\\\\\\`/g, '`') + '\\n  ');

result = result.replace(/<div className="flex gap-2 border-l border-slate-200 pl-3">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, jsxButtonsCode + '        </div>\\n      </div>');

fs.writeFileSync('src/pages/owner/Reports.tsx', result);
console.log('Exports patched');
