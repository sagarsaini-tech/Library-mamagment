import fs from 'fs';

let rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Utility functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function getUserData() {
      // Use a safer approach to check if document exists first
      return exists(/databases/$(database)/documents/users/$(request.auth.uid)) 
        ? get(/databases/$(database)/documents/users/$(request.auth.uid)).data 
        : null;
    }
    
    function isSuperAdmin() {
      let userData = getUserData();
      return isAuthenticated() && userData != null && userData.get('role', '') == 'SUPER_ADMIN';
    }

    match /users/{userId} {
      allow read: if isAuthenticated() && (isOwner(userId) || isSuperAdmin() || (resource != null && resource.data.get('libraryId', '') == request.auth.uid));
      allow write: if isAuthenticated() && (isOwner(userId) || isSuperAdmin() || request.resource.data.get('libraryId', '') == request.auth.uid || (resource != null && resource.data.get('libraryId', '') == request.auth.uid));
    }
    
    match /libraries/{libraryId} {
      allow read: if isAuthenticated() && (request.auth.uid == libraryId || isSuperAdmin() || (getUserData() != null && getUserData().get('libraryId', '') == libraryId));
      allow write: if isAuthenticated() && (request.auth.uid == libraryId || isSuperAdmin());
    }

    match /libraries/{libraryId}/{document=**} {
      allow read: if isAuthenticated() && (request.auth.uid == libraryId || isSuperAdmin() || (getUserData() != null && getUserData().get('libraryId', '') == libraryId));
      allow write: if isAuthenticated() && (request.auth.uid == libraryId || isSuperAdmin() || (getUserData() != null && getUserData().get('libraryId', '') == libraryId));
    }

    match /system/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isSuperAdmin();
    }
  }
}
`;

fs.writeFileSync('firestore.rules', rules);
