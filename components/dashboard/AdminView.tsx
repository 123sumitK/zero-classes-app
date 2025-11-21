import React, { useState, useEffect } from 'react';
import { User, UserRole, Course, PlatformSettings } from '../../types';
import { storageService } from '../../services/storage';
import { Card, Skeleton, Button, Input, Modal, Pagination, SearchInput, PageHeader, Badge } from '../ui/Shared';
import { Trash2, Edit2, Save, X, Activity, Search, Settings as SettingsIcon, Globe, ShieldCheck } from 'lucide-react';

export const AdminView: React.FC<{ showToast: (m: string, t: any) => void }> = ({ showToast }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>({copyrightText: '', version: '', socialLinks: {}});
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'courses' | 'settings'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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
      if (activeTab === 'settings') {
          const s = await storageService.getPlatformSettings();
          setSettings(s);
      } else {
          const [fetchedUsers, fetchedCourses] = await Promise.all([
            storageService.getUsers(),
            storageService.getCourses()
          ]);
          setUsers(Array.isArray(fetchedUsers) ? fetchedUsers : []);
          setCourses(Array.isArray(fetchedCourses) ? fetchedCourses : []);
      }
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

  const saveSettings = async () => {
      try {
          await storageService.updatePlatformSettings(settings);
          showToast('Platform settings updated', 'success');
      } catch(e) { showToast('Update failed', 'error'); }
  };

  const viewUserActivity = async (user: User) => {
    try {
        const freshUser = await storageService.getUser(user.id);
        setSelectedUser(freshUser);
        setShowActivityModal(true);
    } catch(e) { showToast('Failed to fetch activity', 'error'); }
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div>
      <PageHeader 
          title="Administration Console" 
          description="Manage system users, courses, and platform configuration."
          theme="blue"
          icon={<ShieldCheck className="text-white" size={24} />}
          imageSrc="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80"
      />

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-200 pb-4 mb-6 gap-4">
        <div className="bg-gray-100 p-1 rounded-lg inline-flex overflow-x-auto">
            <button className={`py-1.5 px-4 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('users')}>Users</button>
            <button className={`py-1.5 px-4 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'courses' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('courses')}>Courses</button>
            <button className={`py-1.5 px-4 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('settings')}>Settings</button>
        </div>
        {activeTab === 'users' && (
           <SearchInput value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        )}
      </div>

      {activeTab === 'users' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i}><td colSpan={4} className="px-6 py-4"><Skeleton className="h-8 w-full" /></td></tr>
                  ))
                ) : (
                  paginatedUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center gap-3 whitespace-nowrap">
                        {u.profileImage ? <img src={u.profileImage} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500 font-bold">{u.name.charAt(0)}</div>}
                        {u.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{u.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                         <Badge color={u.role === 'ADMIN' ? 'red' : u.role === 'INSTRUCTOR' ? 'blue' : 'green'}>{u.role}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 flex items-center gap-3 whitespace-nowrap">
                        <select 
                          className="border border-gray-300 rounded-md text-xs p-1.5 bg-gray-50 hover:bg-white transition-colors focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          disabled={u.email === 'admin@zero.com'}
                        >
                           <option value="STUDENT">Student</option>
                           <option value="INSTRUCTOR">Instructor</option>
                           <option value="ADMIN">Admin</option>
                        </select>
                        <button onClick={() => viewUserActivity(u)} className="text-blue-600 hover:text-blue-800 text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                            <Activity size={14} /> Logs
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-100">
             <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </div>
      )}

      {activeTab === 'courses' && (
        <Card title="All Courses" className="overflow-hidden">
           <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Course Title</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {(courses || []).map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {editingCourseId === c.id ? (
                          <div className="space-y-2">
                            <Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Title" className="mb-0" />
                            <textarea className="w-full border rounded p-1 text-xs" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                          </div>
                        ) : c.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                         {editingCourseId === c.id ? (
                           <Input type="number" value={editForm.price} onChange={e => setEditForm({...editForm, price: parseFloat(e.target.value)})} className="mb-0 w-20" />
                         ) : `$${c.price}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
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

      {activeTab === 'settings' && (
          <Card title="Platform Configuration">
              <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                      <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><SettingsIcon size={18} /> General</h4>
                      <Input label="Footer Copyright Text" value={settings.copyrightText} onChange={e => setSettings({...settings, copyrightText: e.target.value})} />
                      <Input label="App Version" value={settings.version} onChange={e => setSettings({...settings, version: e.target.value})} />
                  </div>
                  <div className="space-y-4">
                      <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><Globe size={18} /> Social Media Links</h4>
                      <Input label="Twitter URL" placeholder="https://twitter.com/..." value={settings.socialLinks?.twitter || ''} onChange={e => setSettings({...settings, socialLinks: {...settings.socialLinks, twitter: e.target.value}})} />
                      <Input label="Facebook URL" placeholder="https://facebook.com/..." value={settings.socialLinks?.facebook || ''} onChange={e => setSettings({...settings, socialLinks: {...settings.socialLinks, facebook: e.target.value}})} />
                      <Input label="LinkedIn URL" placeholder="https://linkedin.com/..." value={settings.socialLinks?.linkedin || ''} onChange={e => setSettings({...settings, socialLinks: {...settings.socialLinks, linkedin: e.target.value}})} />
                      <Input label="Instagram URL" placeholder="https://instagram.com/..." value={settings.socialLinks?.instagram || ''} onChange={e => setSettings({...settings, socialLinks: {...settings.socialLinks, instagram: e.target.value}})} />
                  </div>
              </div>
              <Button onClick={saveSettings} className="mt-6 w-full sm:w-auto">Save Configuration</Button>
          </Card>
      )}

      <Modal isOpen={showActivityModal} onClose={() => setShowActivityModal(false)} title={`Activity Log: ${selectedUser?.name}`}>
          {selectedUser && (
             <>
                {selectedUser.role === 'INSTRUCTOR' && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm">
                        <p><strong>Qualification:</strong> {selectedUser.instructorProfile?.qualification || 'N/A'}</p>
                        <p><strong>Experience:</strong> {selectedUser.instructorProfile?.experience || 'N/A'}</p>
                    </div>
                )}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {(selectedUser.activityLog || []).slice().reverse().map((log, idx) => (
                        <div key={idx} className="text-xs border-l-2 border-gray-300 pl-3 py-2 hover:bg-gray-50 transition-colors rounded-r">
                            <span className="font-mono text-gray-400 block mb-0.5">{new Date(log.date).toLocaleString()}</span>
                            <p className="font-bold text-gray-800">{log.action} <span className="font-normal text-gray-600">{log.details ? `- ${log.details}` : ''}</span></p>
                        </div>
                    ))}
                </div>
             </>
          )}
      </Modal>
    </div>
  );
};