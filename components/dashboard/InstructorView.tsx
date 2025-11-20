
import React, { useState, useEffect } from 'react';
import { User, UserRole, Course, ClassSchedule } from '../../types';
import { storageService } from '../../services/storage';
import { generateCourseOutline } from '../../services/geminiService';
import { Button, Input, Select, Card, Skeleton } from '../ui/Shared';
import { Sparkles, Upload, Video, Trash2, Edit2, Save, X } from 'lucide-react';

interface InstructorViewProps {
  user: User;
  view: string;
  showToast: (m: string, t: any) => void;
}

export const InstructorView: React.FC<InstructorViewProps> = ({ user, view, showToast }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Course State
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCoursePrice, setNewCoursePrice] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Manage State
  const [selectedCourseId, setSelectedCourseId] = useState('');
  
  // Schedule State
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [schedTopic, setSchedTopic] = useState('');
  const [editingSchedId, setEditingSchedId] = useState<string | null>(null);

  useEffect(() => {
    refreshData();
  }, [user, view]);

  const refreshData = () => {
    setLoading(true);
    setTimeout(() => {
      const all = storageService.getCourses();
      if (user.role === UserRole.ADMIN) setCourses(all);
      else setCourses(all.filter(c => c.instructorId === user.id));
      setLoading(false);
    }, 800);
  };

  const handleAICreate = async () => {
    if (!newCourseTitle) return showToast('Enter a title first', 'error');
    setIsGenerating(true);
    const desc = await generateCourseOutline(newCourseTitle);
    setNewCourseDesc(desc);
    setIsGenerating(false);
  };

  const handleCreateCourse = () => {
    if (!newCourseTitle || !newCoursePrice) return;
    const newCourse: Course = {
      id: Math.random().toString(36).substr(2, 9),
      title: newCourseTitle,
      description: newCourseDesc,
      instructorId: user.id,
      price: parseFloat(newCoursePrice),
      materials: [],
      schedules: []
    };
    storageService.addCourse(newCourse);
    setCourses(prev => [...prev, newCourse]);
    showToast('Course created successfully', 'success');
    setNewCourseTitle(''); setNewCourseDesc(''); setNewCoursePrice('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCourseId) return showToast('Select a course first', 'error');
    const file = e.target.files?.[0];
    if (file) {
      setTimeout(() => {
        storageService.addMaterial(selectedCourseId, {
          id: Math.random().toString(),
          title: file.name,
          type: 'PDF',
          url: '#',
          uploadedAt: new Date().toISOString()
        });
        showToast(`Uploaded ${file.name}`, 'success');
        refreshData();
      }, 800);
    }
  };

  const handleDeleteMaterial = (courseId: string, matId: string) => {
    if (window.confirm('Delete this file?')) {
      storageService.deleteMaterial(courseId, matId);
      refreshData();
      showToast('Material deleted', 'success');
    }
  };

  // Schedule Logic
  const handleAddSchedule = () => {
    if (!selectedCourseId || !schedDate || !schedTime) return;
    if (editingSchedId) {
      // Update Mode
      storageService.updateSchedule(selectedCourseId, {
        id: editingSchedId,
        courseId: selectedCourseId,
        topic: schedTopic,
        date: schedDate,
        time: schedTime,
        meetingUrl: 'https://meet.google.com/mock-updated'
      });
      showToast('Schedule updated', 'success');
      setEditingSchedId(null);
    } else {
      // Add Mode
      storageService.addSchedule(selectedCourseId, {
        id: Math.random().toString(),
        courseId: selectedCourseId,
        topic: schedTopic || 'Class Session',
        date: schedDate,
        time: schedTime,
        meetingUrl: 'https://meet.google.com/mock-link-xyz'
      });
      showToast('Class scheduled!', 'success');
    }
    setSchedDate(''); setSchedTime(''); setSchedTopic('');
    refreshData();
  };

  const startEditSchedule = (s: ClassSchedule) => {
    setSelectedCourseId(s.courseId);
    setSchedTopic(s.topic);
    setSchedDate(s.date);
    setSchedTime(s.time);
    setEditingSchedId(s.id);
    showToast('Editing schedule above...', 'info');
  };

  const handleDeleteSchedule = (courseId: string, sId: string) => {
    if (window.confirm('Cancel this class?')) {
      storageService.deleteSchedule(courseId, sId);
      refreshData();
      showToast('Class cancelled', 'success');
    }
  };

  if (view === 'schedule') {
    if (loading) return <div className="p-4"><Skeleton className="h-64 w-full" /></div>;

    return (
      <div className="space-y-6">
        <Card title={editingSchedId ? "Edit Class Schedule" : "Schedule Live Class"}>
          <div className="grid gap-4">
            <Select 
              label="Select Course"
              options={[{ value: '', label: 'Select...' }, ...courses.map(c => ({ value: c.id, label: c.title }))]}
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              disabled={!!editingSchedId}
            />
            <Input label="Topic" value={schedTopic} onChange={e => setSchedTopic(e.target.value)} placeholder="e.g. Weekly Q&A" />
            <div className="grid grid-cols-2 gap-4">
              <Input type="date" label="Date" value={schedDate} onChange={e => setSchedDate(e.target.value)} />
              <Input type="time" label="Time" value={schedTime} onChange={e => setSchedTime(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddSchedule} disabled={!selectedCourseId} className="flex-1">
                <Video className="inline w-4 h-4 mr-2" />
                {editingSchedId ? 'Update Schedule' : 'Schedule & Generate Link'}
              </Button>
              {editingSchedId && (
                <Button variant="secondary" onClick={() => { setEditingSchedId(null); setSchedTopic(''); setSchedDate(''); setSchedTime(''); }}>
                  Cancel Edit
                </Button>
              )}
            </div>
          </div>
        </Card>

        <h3 className="text-lg font-bold mt-8">Upcoming Classes</h3>
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Topic</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {courses.flatMap(c => c.schedules).map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{s.topic}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{s.date} {s.time}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                     <div className="flex gap-3">
                        <button onClick={() => startEditSchedule(s)} className="text-blue-600 hover:text-blue-800"><Edit2 size={16}/></button>
                        <button onClick={() => handleDeleteSchedule(s.courseId, s.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16}/></button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-4"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Create Course */}
        <Card title="Create New Course" className="h-full">
          <div className="space-y-4">
            <Input label="Course Title" value={newCourseTitle} onChange={e => setNewCourseTitle(e.target.value)} />
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm h-32 focus:ring-primary-500 focus:border-primary-500"
                value={newCourseDesc}
                onChange={e => setNewCourseDesc(e.target.value)}
              />
              <button 
                onClick={handleAICreate}
                disabled={isGenerating}
                className="absolute right-2 bottom-2 text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full hover:bg-purple-200 flex items-center gap-1 transition-colors font-medium"
              >
                <Sparkles size={12} /> {isGenerating ? 'Generating...' : 'AI Generate'}
              </button>
            </div>
            <Input label="Price ($)" type="number" value={newCoursePrice} onChange={e => setNewCoursePrice(e.target.value)} />
            <Button onClick={handleCreateCourse} className="w-full">Create Course</Button>
          </div>
        </Card>

        {/* Manage Materials */}
        <div className="space-y-6">
          <Card title="Upload Course Materials">
            <div className="space-y-4">
              <Select 
                label="Select Course"
                options={[{ value: '', label: 'Select...' }, ...courses.map(c => ({ value: c.id, label: c.title }))]}
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
              />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors bg-gray-50">
                <Upload className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600 font-medium">Click to upload materials</p>
                <input 
                  type="file" 
                  className="mt-4 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                  onChange={handleFileUpload}
                  disabled={!selectedCourseId}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card title="My Active Courses & Materials">
         <div className="space-y-4">
           {courses.map(c => (
             <div key={c.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-gray-800">{c.title}</h4>
                  <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded">${c.price}</span>
                </div>
                <div className="space-y-1 bg-gray-50 p-3 rounded">
                   <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Materials</p>
                   {c.materials.length === 0 && <p className="text-xs text-gray-400 italic">No files</p>}
                   {c.materials.map(m => (
                     <div key={m.id} className="flex justify-between items-center text-sm text-gray-700 bg-white p-2 rounded shadow-sm">
                        <span>{m.title}</span>
                        <button onClick={() => handleDeleteMaterial(c.id, m.id)} className="text-red-500 hover:text-red-700 text-xs">
                           <Trash2 size={14} />
                        </button>
                     </div>
                   ))}
                </div>
             </div>
           ))}
         </div>
      </Card>
    </div>
  );
};
