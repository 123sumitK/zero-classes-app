
import React, { useState, useEffect } from 'react';
import { User, UserRole, Course } from '../../types';
import { storageService } from '../../services/storage';
import { Card, Skeleton, Button, Input } from '../ui/Shared';
import { Trash2, Edit2, Save, X } from 'lucide-react';

export const AdminView: React.FC<{ showToast: (m: string, t: any) => void }> = ({ showToast }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'courses'>('users');
  
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', price: 0 });

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

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-gray-200">
        <button 
          className={`pb-2 px-4 font-medium ${activeTab === 'users' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
        <button 
          className={`pb-2 px-4 font-medium ${activeTab === 'courses' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('courses')}
        >
          Course Management
        </button>
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
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-20" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-8 w-24" /></td>
                    </tr>
                  ))
                ) : (
                  (users || []).map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{u.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : u.role === 'INSTRUCTOR' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Instructor ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  [1, 2].map(i => <tr key={i}><td colSpan={4} className="px-6 py-4"><Skeleton className="h-8 w-full" /></td></tr>)
                ) : (
                  (courses || []).map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {editingCourseId === c.id ? (
                          <div className="space-y-2">
                            <Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Title" className="mb-0" />
                            <textarea className="w-full border rounded p-1 text-xs" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                          </div>
                        ) : c.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{c.instructorId}</td>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
