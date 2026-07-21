import fs from 'fs';

let content = fs.readFileSync('src/pages/owner/OwnerDashboard.tsx', 'utf8');

// replace dummy arrays with state and live fetch
const imports = `import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
`;

content = content.replace(/import React, \{ useState \} from 'react';/, imports);
content = content.replace(/const growthData = \[[\s\S]*?\];/, '');
content = content.replace(/const recentStudents = \[[\s\S]*?\];/, '');

const componentStart = `export const OwnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [toastMessage, setToastMessage] = useState('');
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, occupied: 0, revenue: 0 });
  const [growthData, setGrowthData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const ownerUid = user.role === 'LIBRARY_OWNER' ? user.id : user.libraryId;
    if (!ownerUid) return;

    const unsubs: (() => void)[] = [];

    // Fetch students
    const qStudents = query(collection(db, \`libraries/\${ownerUid}/students\`));
    unsubs.push(onSnapshot(qStudents, (snapshot) => {
      let total = 0;
      let active = 0;
      const students: any[] = [];
      const growthMap: any = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        total++;
        if (data.status === 'Active') active++;
        students.push({ id: doc.id, ...data });

        // simple growth data
        const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        const month = date.toLocaleString('default', { month: 'short' });
        growthMap[month] = (growthMap[month] || 0) + 1;
      });

      // Sort recent students
      students.sort((a, b) => {
        const t1 = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const t2 = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return t2 - t1;
      });
      
      const recent = students.slice(0, 5).map(s => ({
        id: s.id,
        name: s.fullName,
        seat: s.seatNumber || 'Unassigned',
        phone: s.mobile,
        status: s.status,
        feeStatus: s.feeStatus,
        date: s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() : 'N/A'
      }));
      setRecentStudents(recent);
      
      const gData = Object.keys(growthMap).map(k => ({ name: k, students: growthMap[k] }));
      setGrowthData(gData);
      
      setStats(prev => ({ ...prev, total, active }));
    }));

    // Fetch seats
    const qSeats = query(collection(db, \`libraries/\${ownerUid}/seats\`));
    unsubs.push(onSnapshot(qSeats, (snapshot) => {
      let occupied = 0;
      snapshot.forEach(doc => {
        if (doc.data().status === 'Occupied') occupied++;
      });
      setStats(prev => ({ ...prev, occupied }));
    }));

    // Fetch payments
    const qPayments = query(collection(db, \`libraries/\${ownerUid}/payments\`));
    unsubs.push(onSnapshot(qPayments, (snapshot) => {
      let revenue = 0;
      const currentMonth = new Date().toISOString().slice(0, 7);
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.paymentDate?.startsWith(currentMonth)) {
          revenue += Number(data.amountReceived || 0);
        }
      });
      setStats(prev => ({ ...prev, revenue }));
    }));

    return () => unsubs.forEach(unsub => unsub());
  }, [user]);`;

content = content.replace(/export const OwnerDashboard: React\.FC = \(\) => \{\n  const \[toastMessage, setToastMessage\] = useState\(''\);/, componentStart);

content = content.replace(/>1,248</, `>{stats.total}<`);
content = content.replace(/>892</, `>{stats.active}<`);
content = content.replace(/>85%</, `>{stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0}%<`);
content = content.replace(/>₹1,24,500</, `>₹{stats.revenue}<`);

fs.writeFileSync('src/pages/owner/OwnerDashboard.tsx', content);
