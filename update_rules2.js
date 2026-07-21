import fs from 'fs';
let rules = fs.readFileSync('firestore.rules', 'utf8');

const search = "  }\n}";
const replace = `    match /system/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isSuperAdmin();
    }
  }
}`;
rules = rules.replace(search, replace);
fs.writeFileSync('firestore.rules', rules);
