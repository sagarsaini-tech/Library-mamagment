import fs from 'fs';

const code = fs.readFileSync('src/pages/owner/Reports.tsx', 'utf8');

// We need to inject Student Growth Chart and Fee Collection Trend logic.
// For student growth, we can map over students and group by createdAt.
// For fee collection trend, we already have payments and expenses by month.

const chartsDataCode = `
  const studentGrowthData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    const { startObj, endObj } = getDateFilter();
    let current = new Date(startObj);
    current.setDate(1);
    while (current <= endObj) {
      const key = \\\`\\\${current.getFullYear()}-\\\${String(current.getMonth() + 1).padStart(2, '0')}\\\`;
      dataMap[key] = 0;
      current.setMonth(current.getMonth() + 1);
    }
    
    students.forEach(s => {
      if (s.createdAt) {
        // createdAt might be a firebase timestamp or string
        const d = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
        if (!isNaN(d.getTime())) {
          const key = \\\`\\\${d.getFullYear()}-\\\${String(d.getMonth() + 1).padStart(2, '0')}\\\`;
          if (dataMap[key] !== undefined) {
            dataMap[key]++;
          }
        }
      }
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let cumulative = 0;
    return Object.keys(dataMap).sort().map(k => {
      const [year, month] = k.split('-');
      cumulative += dataMap[k];
      return {
        name: \\\`\\\${monthNames[parseInt(month) - 1]} \\\${year}\\\`,
        NewStudents: dataMap[k],
        TotalStudents: cumulative
      };
    });
  }, [students, dateRange, customStartDate, customEndDate]);

  const feeTrendData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    const { startObj, endObj } = getDateFilter();
    let current = new Date(startObj);
    current.setDate(1);
    while (current <= endObj) {
      const key = \\\`\\\${current.getFullYear()}-\\\${String(current.getMonth() + 1).padStart(2, '0')}\\\`;
      dataMap[key] = 0;
      current.setMonth(current.getMonth() + 1);
    }
    
    filteredPayments.forEach(p => {
      const key = p.paymentDate.slice(0, 7);
      if (dataMap[key] !== undefined) {
        dataMap[key] += (p.amountReceived || 0);
      }
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return Object.keys(dataMap).sort().map(k => {
      const [year, month] = k.split('-');
      return {
        name: \\\`\\\${monthNames[parseInt(month) - 1]} \\\${year}\\\`,
        Collection: dataMap[k]
      };
    });
  }, [filteredPayments, dateRange, customStartDate, customEndDate]);
`;

const jsxCode = `
        {/* Charts: Financial Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print-break">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Income vs Expense Trend</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => \\\`₹\\\${val}\\\`} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorInc)" />
                  <Area type="monotone" dataKey="Expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Monthly Income</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => \\\`₹\\\${val}\\\`} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Monthly Expense</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => \\\`₹\\\${val}\\\`} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts: Growth and Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-break">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Student Growth</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={studentGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="NewStudents" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="TotalStudents" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Fee Collection Trend</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={feeTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => \\\`₹\\\${val}\\\`} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="Collection" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
`;

// Insert the new logic before // Export Functions
let newCode = code.replace('  // Export Functions', chartsDataCode.replace(/\\\\\\\`/g, '`') + '\\n  // Export Functions');

// Replace the previous grid for charts with the new ones
const oldGridStart = '{/* Charts: Financial Overview */}';
const oldGridEnd = '{/* Charts: Composition */}';

if (newCode.includes(oldGridStart) && newCode.includes(oldGridEnd)) {
  const parts1 = newCode.split(oldGridStart);
  const parts2 = parts1[1].split(oldGridEnd);
  
  newCode = parts1[0] + jsxCode.replace(/\\\\\\\`/g, '`') + '\\n        ' + oldGridEnd + parts2[1];
  
  fs.writeFileSync('src/pages/owner/Reports.tsx', newCode);
  console.log('Patched successfully');
} else {
  console.log('Failed to find split points');
}
