import fs from 'fs';

let ownerContent = fs.readFileSync('src/pages/owner/OwnerLayout.tsx', 'utf8');

ownerContent = ownerContent.replace(
  "import { LayoutDashboard, Users, UserSquare2, Receipt, Wallet, CalendarCheck, FileBarChart, Settings, LogOut, Library, Bell, ChevronDown, Menu, X } from 'lucide-react';",
  "import { LayoutDashboard, Users, UserSquare2, Receipt, Wallet, CalendarCheck, FileBarChart, Settings, LogOut, Library, Bell, ChevronDown, Menu, X, Contact } from 'lucide-react';"
);

ownerContent = ownerContent.replace(
  "{ name: 'Dashboard', path: '/owner', icon: <LayoutDashboard className=\"w-5 h-5 mr-3\" /> },",
  "{ name: 'Dashboard', path: '/owner', icon: <LayoutDashboard className=\"w-5 h-5 mr-3\" /> },\n    { name: 'Visitors', path: '/owner/visitors', icon: <Contact className=\"w-5 h-5 mr-3\" /> },"
);

fs.writeFileSync('src/pages/owner/OwnerLayout.tsx', ownerContent);

let staffContent = fs.readFileSync('src/pages/staff/StaffLayout.tsx', 'utf8');
staffContent = staffContent.replace(
  "import { LayoutDashboard, UserSquare2, LogOut, Library, Menu, X, ChevronDown, Bell } from 'lucide-react';",
  "import { LayoutDashboard, UserSquare2, LogOut, Library, Menu, X, ChevronDown, Bell, Contact } from 'lucide-react';"
);

staffContent = staffContent.replace(
  "const navItems = [",
  "const navItems = [\n    ...(user?.role === 'RECEPTIONIST' ? [{ name: 'Visitors', path: '/staff/visitors', icon: <Contact className=\"w-5 h-5 mr-3\" /> }] : []),"
);

fs.writeFileSync('src/pages/staff/StaffLayout.tsx', staffContent);

