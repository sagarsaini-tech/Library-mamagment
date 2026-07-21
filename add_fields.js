import fs from 'fs';

let content = fs.readFileSync('src/pages/owner/StaffManagement.tsx', 'utf8');

// Update Staff interface
content = content.replace(/role: string;/g, 'role: string;\\n  address?: string;\\n  emergencyContact?: string;');

// Update formData state initialization
content = content.replace(/role: 'RECEPTIONIST', status: 'Active', joiningDate: ''/g, "role: 'RECEPTIONIST', status: 'Active', joiningDate: '', address: '', emergencyContact: ''");

// Update Firestore setDoc for staff
content = content.replace(/status: formData.status,/g, 'status: formData.status,\\n        address: formData.address,\\n        emergencyContact: formData.emergencyContact,');

// Update UI to add Address and Emergency Contact fields
const oldFields = `<div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>`;

const newFields = `<div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Address</label>
                <input 
                  type="text" 
                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Emergency Contact</label>
                <input 
                  type="text" 
                  value={formData.emergencyContact} onChange={e => setFormData({...formData, emergencyContact: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>`;

content = content.replace(oldFields, newFields);

fs.writeFileSync('src/pages/owner/StaffManagement.tsx', content);
console.log('Added Address and Emergency Contact');
