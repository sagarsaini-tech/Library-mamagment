# Project Status Report: StudySync Pro

## Overall Project Architecture
- **Frontend:** React 19, Vite, Tailwind CSS 4, Recharts for charts, Lucide React for icons.
- **Backend/BaaS:** Firebase Authentication, Firestore (NoSQL Database), Firebase Storage.
- **Routing:** React Router v8 with lazy-loaded code-splitting (`React.lazy` and `Suspense`) and Role-Based Access Control (RBAC).
- **State Management:** React Context API (`AuthContext`).

## User Roles
- **SUPER_ADMIN**: Platform owner. Can manage all libraries, owners, and global settings.
- **LIBRARY_OWNER**: Individual library owner. Has full control over their specific library's data (students, staff, fees, seats).
- **STAFF** (Manager, Receptionist, Accountant, Librarian): Library employees with constrained access to their assigned library based on their specific staff role.
- **STUDENT**: End-users who can view their own profile, seat allocations, fee history, and notices for their library.

## Firestore Collections
- `users`: All user profiles across the platform (Admin, Owners, Staff, Students).
- `libraries`: Global library configurations, statuses, and locations.
- `libraries/{libraryId}/students`: Student profiles for a specific library.
- `libraries/{libraryId}/seats`: Seat allocations and layouts.
- `libraries/{libraryId}/fees`: Fee payment records and transactions.
- `libraries/{libraryId}/expenses`: Expense tracking.
- `libraries/{libraryId}/staff`: Staff records.
- `libraries/{libraryId}/visitors`: Visitor and enquiry records.
- `libraries/{libraryId}/notices`: Announcements for the library.
- `system/settings`: Global platform settings.

## Routes
- **Public**: `/login`, `/register`, `/forgot-password`, `/seed-admin`
- **Super Admin** (`/admin/*`): Dashboard, Libraries, Owners, Analytics, Settings
- **Library Owner** (`/owner/*`): Dashboard, Students, Seats, Fees, Expenses, Attendance, Reports, Staff, Visitors, Notices, Settings
- **Student** (`/student/*`): Dashboard, Profile, Attendance, Fees, Notifications, Settings
- **Staff** (`/staff/*`): Dashboard, Visitors, Notices, Profile

## Completed Modules
- Firebase Authentication, Registration, Login & Routing
- Super Admin Dashboard & System Analytics
- Library & Owner Management (Super Admin)
- Owner Dashboard
- Student Management (Owner)
- Seat Management (Owner)
- Fee Management (Owner)
- Expense Management (Owner)
- Reports & Analytics (Owner)
- Staff Management (Owner)
- Visitor & Enquiry Management (Shared)
- Notice Board (Shared)
- Staff Dashboard
- Student Dashboard & Notices
- Global System Settings & Library Config

## Pending Modules
- **Owner Panel**: Attendance Module implementation
- **Student Panel**: Detailed Profile view, Attendance tracking view, Fee Details view, Settings view
