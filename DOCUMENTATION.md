# Project Documentation

## Project Structure
The project is built with React 19, Vite, and Tailwind CSS 4. It uses Firebase for Authentication, Firestore for database, and Storage for files.
- `src/components/`: Reusable UI components and layout wrappers (e.g., `ProtectedRoute`).
- `src/context/`: React context providers (e.g., `AuthContext`).
- `src/pages/`: Page components divided by user roles (owner, student, staff, admin) and shared.
- `src/lib/`: Library initialization and utilities (e.g., Firebase config).

## Firestore Collections
1. `users`: Stores all user profiles across roles (`LIBRARY_OWNER`, `STUDENT`, `SUPER_ADMIN`, `MANAGER`, etc.). Contains `role`, `email`, `fullName`, and associated `libraryId`.
2. `libraries`: Stores library configuration, capacity, status (`active`, `suspended`), and address info. Managed by `LIBRARY_OWNER` and `SUPER_ADMIN`.
3. `libraries/{libraryId}/students`: Stores student records specifically tied to a library.
4. `libraries/{libraryId}/seats`: Stores seat layouts and allocations.
5. `libraries/{libraryId}/fees`: Stores fee payments and transaction history.
6. `libraries/{libraryId}/expenses`: Stores library expense tracking.
7. `libraries/{libraryId}/staff`: Stores staff members allocated to the library.
8. `libraries/{libraryId}/visitors`: Stores visitor inquiries.
9. `libraries/{libraryId}/notices`: Stores notice board announcements.
10. `system/settings`: Global system configuration manageable by `SUPER_ADMIN`.

## Authentication Flow
The application uses Firebase Authentication (Email/Password).
- `AuthProvider` wraps the application, listening to `onAuthStateChanged`.
- Upon login, the user's role is fetched from the `users` collection.
- Based on `role`, users are redirected to their respective dashboards (`/owner`, `/student`, `/staff`, `/admin`).
- Unauthenticated users are redirected to `/login`.

## Role Permissions
- **SUPER_ADMIN**: Full read/write access to all collections and system settings. Can suspend/activate libraries and owners.
- **LIBRARY_OWNER**: Full access to their specific `libraryId` subcollections. Cannot access other libraries.
- **STAFF (MANAGER, RECEPTIONIST, etc.)**: Access to specific library management modules based on predefined roles (managed via UI). Read/Write constrained to their assigned `libraryId`.
- **STUDENT**: Read-only access to their own profile, seat assignment, fee history, and library notices. Can update personal profile information.

## Reusable Components & Hooks
- `ProtectedRoute`: Validates authentication state before rendering child routes.
- `AuthContext`: Provides a unified interface for authentication state and login/logout methods.
- Lazy-loaded pages: All route components are dynamically imported using `React.lazy` to improve code splitting and reduce initial bundle size.

## Optimizations Performed
- **Lazy Loading**: Implemented `React.lazy` and `Suspense` in `App.tsx` for all routes to enable code splitting.
- **Firebase Rules**: Hardened `firestore.rules` to strictly enforce role-based access control (RBAC). Added `system` collection rules.
- **Routing Security**: Validated protected routes logic to ensure role boundaries are respected on the client-side.
- **Performance**: Reduced initial payload by separating the huge routing block into modular chunks.
- **Codebase Audited**: Checked for unused imports and standardized layout structures.
