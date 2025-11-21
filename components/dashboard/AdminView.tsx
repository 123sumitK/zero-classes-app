
import React, { useState, useEffect } from 'react';
import { User, UserRole, Course } from '../../types';
import { storageService } from '../../services/storage';
import { Card, Skeleton, Button, Input } from '../ui/Shared';
import { Trash2, Edit2, Save, X, Activity, Search, UserCheck } from 'lucide-react';

export const AdminView: React.FC<{ showToast: (m: string, t: any) => void }> = ({ showToast }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'courses'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Editing State
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', price: 0 });

  // User Activity Modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedUsers, fetchedCourses] = await Promise.all([
        storageService.getUsers(),
        storageService.getCourses()
      ]);
      setUsers(Array.isArray(fetchedUsers) ? fetchedUsers : []);
      setCourses(Array.isArray(fetchedCourses) ? fetchedCourses : []);
    } catch (e) {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    await storageService.updateUserRole(userId, newRole);
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    showToast('User role updated', 'success');
  };

  const handleDeleteCourse = async (id: string) => {
    if (window.confirm('Delete this course?')) {
      await storageService.deleteCourse(id);
      setCourses(courses.filter(c => c.id !== id));
      showToast('Course deleted', 'success');
    }
  };

  const startEditCourse = (c: Course) => {
    setEditingCourseId(c.id);
    setEditForm({ title: c.title, description: c.description, price: c.price });
  };

  const saveCourse = async () => {
    if (!editingCourseId) return;
    await storageService.updateCourse(editingCourseId, {
      title: editForm.title,
      description: editForm.description,
      price: editForm.price
    });
    setCourses(courses.map(c => c.id === editingCourseId ? { ...c, ...editForm } : c));
    setEditingCourseId(null);
    showToast('Course updated successfully', 'success');
  };

  const viewUserActivity = async (user: User) => {
    try {
        const freshUser = await storageService.getUser(user.id); // Get latest logs
        setSelectedUser(freshUser);
        setShowActivityModal(true);
    } catch(e) { showToast('Failed to fetch activity', 'error'); }
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center border-b border-gray-200 pb-2">
        <div className="flex gap-4">
            <button className={`pb-2 px-4 font-medium ${activeTab === 'users' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500'}`} onClick={() => setActiveTab('users')}>User Management</button>
            <button className={`pb-2 px-4 font-medium ${activeTab === 'courses' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500'}`} onClick={() => setActiveTab('courses')}>Course Management</button>
        </div>
        <div className="relative">
           <Search className="absolute left-2 top-2.5 text-gray-400 w-4 h-4" />
           <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="mb-0 pl-8 h-9 text-sm w-64" />
        </div>
      </div>

      {activeTab === 'users' ? (
        <Card title="Platform Users" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i}><td colSpan={4} className="px-6 py-4"><Skeleton className="h-8 w-full" /></td></tr>
                  ))
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center gap-2">
                        {u.profileImage ? <img src={u.profileImage} className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 rounded-full bg-gray-200" />}
                        {u.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : u.role === 'INSTRUCTOR' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 flex items-center gap-3">
                        <select 
                          className="border border-gray-300 rounded text-xs p-1"
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          disabled={u.email === 'admin@zero.com'}
                        >
                           <option value="STUDENT">Student</option>
                           <option value="INSTRUCTOR">Instructor</option>
                           <option value="ADMIN">Admin</option>
                        </select>
                        <button onClick={() => viewUserActivity(u)} className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1">
                            <Activity size={14} /> Activity
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card title="All Courses" className="overflow-hidden">
           {/* Course Table Same as before but using filtered courses if needed */}
           <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {(courses || []).map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {editingCourseId === c.id ? (
                          <div className="space-y-2">
                            <Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Title" className="mb-0" />
                            <textarea className="w-full border rounded p-1 text-xs" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                          </div>
                        ) : c.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                         {editingCourseId === c.id ? (
                           <Input type="number" value={editForm.price} onChange={e => setEditForm({...editForm, price: parseFloat(e.target.value)})} className="mb-0 w-20" />
                         ) : `$${c.price}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex gap-2">
                          {editingCourseId === c.id ? (
                            <>
                              <button onClick={saveCourse} className="text-green-600 hover:text-green-800"><Save size={18} /></button>
                              <button onClick={() => setEditingCourseId(null)} className="text-gray-500 hover:text-gray-700"><X size={18} /></button>
                            </>
                          ) : (
                            <button onClick={() => startEditCourse(c)} className="text-blue-600 hover:text-blue-800"><Edit2 size={18} /></button>
                          )}
                          <button onClick={() => handleDeleteCourse(c.id)} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Activity Modal */}
      {showActivityModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                         <Activity className="text-primary-500" /> Activity: {selectedUser.name}
                      </h3>
                      <button onClick={() => setShowActivityModal(false)} className="text-gray-500 hover:text-gray-700"><X /></button>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1">
                      {selectedUser.role === UserRole.INSTRUCTOR && (
                          <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-100 text-sm">
                              <p><strong>Qualification:</strong> {selectedUser.instructorProfile?.qualification || 'N/A'}</p>
                              <p><strong>Experience:</strong> {selectedUser.instructorProfile?.experience || 'N/A'}</p>
                              <p><strong>Bio:</strong> {selectedUser.instructorProfile?.bio || 'N/A'}</p>
                          </div>
                      )}
                      <h4 className="font-bold text-gray-700 mb-2 text-sm">Recent Logs</h4>
                      <div className="space-y-2">
                          {(selectedUser.activityLog || []).slice().reverse().map((log, idx) => (
                              <div key={idx} className="text-xs border-l-2 border-gray-300 pl-2 py-1">
                                  <span className="font-mono text-gray-500">{new Date(log.date).toLocaleString()}</span>
                                  <p className="font-medium text-gray-800">{log.action} <span className="font-normal text-gray-600">{log.details ? `- ${log.details}` : ''}</span></p>
                              </div>
                          ))}
                          {(!selectedUser.activityLog || selectedUser.activityLog.length === 0) && <p className="text-gray-500 italic">No activity recorded.</p>}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
