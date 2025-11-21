
import React, { useState, useEffect } from 'react';
import { User, UserRole, Course, ClassSchedule, CourseMaterial, QuizResult } from '../../types';
import { storageService } from '../../services/storage';
import { generateCourseOutline } from '../../services/geminiService';
import { Button, Input, Select, Card, Skeleton, AuditTag, PageHeader, Badge } from '../ui/Shared';
import { Sparkles, Upload, Video, Trash2, Edit2, Loader2, Calendar, BookOpen, Award, Settings, FileText, Plus, Clock, User as UserIcon, Link, BarChart3, Users, CheckCircle, MousePointerClick } from 'lucide-react';
import { QuizManager } from '../features/QuizManager';
import { AssignmentManager } from '../features/AssignmentManager';

interface InstructorViewProps {
  user: User;
  view: string;
  showToast: (m: string, t: any) => void;
}

// Cloudinary Configuration
const CLOUD_NAME = 'dj0tdcc8f'; 
const UPLOAD_PRESET = 'zero_classes_preset'; 

export const InstructorView: React.FC<InstructorViewProps> = ({ user, view, showToast }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [allInstructors, setAllInstructors] = useState<User[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Tab States for "Course Manager"
  const [activeTab, setActiveTab] = useState('courses'); 
  const [courseSubTab, setCourseSubTab] = useState<'list' | 'create'>('list');

  // Create/Edit Course State
  const [editCourseId, setEditCourseId] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState({ title: '', description: '', price: '', thumbnail: '', assignedInstructorId: '' });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [processingCourse, setProcessingCourse] = useState(false);

  // Manage State
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Schedule State
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [schedTopic, setSchedTopic] = useState('');
  const [schedAgenda, setSchedAgenda] = useState(''); 
  const [editingSchedId, setEditingSchedId] = useState<string | null>(null);

  useEffect(() => {
    refreshData();
  }, [user, view]);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [allCourses, allUsers] = await Promise.all([
          storageService.getCourses(),
          storageService.getUsers()
      ]);
      
      const safeAllCourses = Array.isArray(allCourses) ? allCourses : [];
      
      // Set Courses based on Role
      if (user.role === UserRole.ADMIN) {
        setCourses(safeAllCourses);
        setAllInstructors(allUsers.filter(u => u.role === UserRole.INSTRUCTOR));
      } else {
        setCourses(safeAllCourses.filter(c => c.instructorId === user.id));
      }

      // Calculate Total Students Enrolled (Unique Count)
      const studentCount = allUsers.filter(u => u.role === UserRole.STUDENT && u.enrolledCourseIds && u.enrolledCourseIds.length > 0).length;
      setTotalStudents(studentCount);

    } catch (error) {
      console.error("Failed to refresh data", error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS (Keep existing logic mostly same, just reorganized tabs) ---

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
        const url = await storageService.uploadToCloudinary(file, CLOUD_NAME, UPLOAD_PRESET);
        setCourseForm(p => ({ ...p, thumbnail: url }));
    } catch (e) { showToast('Image upload failed', 'error'); } 
    finally { setUploading(false); }
  };

  const handleAICreate = async () => {
    if (!courseForm.title) return showToast('Enter a title first', 'error');
    setIsGenerating(true);
    const desc = await generateCourseOutline(courseForm.title);
    setCourseForm(p => ({ ...p, description: desc }));
    setIsGenerating(false);
  };

  const handleSaveCourse = async () => {
    if (!courseForm.title || !courseForm.price) return showToast('Title and Price required', 'error');
    setProcessingCourse(true);
    const targetInstructorId = user.role === UserRole.ADMIN && courseForm.assignedInstructorId ? courseForm.assignedInstructorId : user.id;
    try {
       if (editCourseId) {
          await storageService.updateCourse(editCourseId, {
              title: courseForm.title, description: courseForm.description, price: parseFloat(courseForm.price),
              thumbnailUrl: courseForm.thumbnail, instructorId: targetInstructorId
          }, user.name);
          showToast('Course updated', 'success');
       } else {
          const newCourseData = {
            title: courseForm.title, description: courseForm.description, instructorId: targetInstructorId,
            price: parseFloat(courseForm.price), thumbnailUrl: courseForm.thumbnail, materials: [], schedules: []
          };
          // @ts-ignore
          await storageService.addCourse(newCourseData, user.name);
          showToast('Course created', 'success');
       }
       setCourseForm({ title: '', description: '', price: '', thumbnail: '', assignedInstructorId: '' });
       setEditCourseId(null);
       setCourseSubTab('list');
       refreshData();
    } catch (error) { showToast('Failed to save course', 'error'); } finally { setProcessingCourse(false); }
  };

  const startEdit = (c: Course) => {
      setEditCourseId(c.id);
      setCourseForm({ title: c.title, description: c.description, price: c.price.toString(), thumbnail: c.thumbnailUrl || '', assignedInstructorId: c.instructorId });
      setCourseSubTab('create');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCourseId) { showToast('Please select a course first', 'error'); return; }
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
        const secureUrl = await storageService.uploadToCloudinary(file, CLOUD_NAME, UPLOAD_PRESET);
        const ext = file.name.split('.').pop()?.toLowerCase();
        let type: 'PDF' | 'DOCX' | 'PPT' | 'OTHER' = 'OTHER';
        if (ext === 'pdf') type = 'PDF'; else if (['doc', 'docx'].includes(ext || '')) type = 'DOCX'; else if (['ppt', 'pptx'].includes(ext || '')) type = 'PPT';
        const newMaterial: CourseMaterial = { id: Math.random().toString(36).substring(7), title: file.name, type: type, url: secureUrl, uploadedAt: new Date().toISOString() };
        await storageService.addMaterial(selectedCourseId, newMaterial);
        showToast(`Successfully uploaded: ${file.name}`, 'success');
        await refreshData(); 
    } catch (e: any) { showToast(`Upload failed: ${e.message}`, 'error'); } finally { setUploading(false); e.target.value = ''; }
  };

  const handleDeleteMaterial = async (courseId: string, matId: string) => {
    if (window.confirm('Delete this file?')) { await storageService.deleteMaterial(courseId, matId); await refreshData(); showToast('Material deleted', 'success'); }
  };

  const handleAddSchedule = async () => {
    if (!selectedCourseId || !schedDate || !schedTime) return;
    try {
      const payload = { courseId: selectedCourseId, topic: schedTopic || 'Class Session', agenda: schedAgenda, date: schedDate, time: schedTime, meetingUrl: 'https://meet.google.com/new', instructorName: user.name };
      if (editingSchedId) {
        await storageService.updateSchedule(selectedCourseId, { ...payload, id: editingSchedId });
        showToast('Schedule updated', 'success');
        setEditingSchedId(null);
      } else {
        await storageService.addSchedule(selectedCourseId, { ...payload, id: Math.random().toString(36).substring(7) });
        showToast('Class scheduled!', 'success');
      }
      setSchedDate(''); setSchedTime(''); setSchedTopic(''); setSchedAgenda('');
      await refreshData();
    } catch (e) { showToast('Failed to save schedule', 'error'); }
  };

  if (loading) return <div className="p-4"><Skeleton className="h-96 w-full" /></div>;

  // --- DASHBOARD VIEW (Stats) ---
  if (view === 'dashboard') {
      const totalCourses = courses.length;
      const totalSchedules = courses.reduce((acc, c) => acc + (c.schedules?.length || 0), 0);
      const totalMaterials = courses.reduce((acc, c) => acc + (c.materials?.length || 0), 0);
      const totalAttendance = courses.reduce((acc, c) => acc + c.schedules.reduce((sAcc, s) => sAcc + (s.attendance?.length || 0), 0), 0);

      return (
        <div>
            <PageHeader 
                title="Dashboard Overview" 
                description="Real-time analytics of your teaching activities and student engagement."
                theme="green"
                icon={<BarChart3 className="text-white" size={24} />}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Courses Created', val: totalCourses, icon: <BookOpen size={24} />, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Classes Scheduled', val: totalSchedules, icon: <Calendar size={24} />, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Materials Uploaded', val: totalMaterials, icon: <FileText size={24} />, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Students Enrolled', val: totalStudents, icon: <Users size={24} />, color: 'text-green-600', bg: 'bg-green-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.bg} ${stat.color}`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900">{stat.val}</p>
                        </div>
                    </div>
                ))}
            </div>

            <Card title="Live Class Engagement">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div className="text-center p-8 bg-indigo-50 rounded-xl border border-indigo-100">
                        <MousePointerClick size={48} className="text-indigo-500 mx-auto mb-4" />
                        <h3 className="text-3xl font-bold text-indigo-900">{totalAttendance}</h3>
                        <p className="text-indigo-700 font-medium">Total Student Check-ins</p>
                        <p className="text-xs text-indigo-500 mt-2">* Tracks clicks on "Join Class" button</p>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 mb-4">Recent Activity</h4>
                        <div className="space-y-3">
                            {courses.flatMap(c => c.schedules).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0,3).map(s => (
                                <div key={s.id} className="flex justify-between items-center p-3 border rounded-lg bg-gray-50">
                                    <div>
                                        <p className="font-bold text-sm text-gray-800">{s.topic}</p>
                                        <p className="text-xs text-gray-500">{s.date} at {s.time}</p>
                                    </div>
                                    <Badge color="blue">{s.attendance?.length || 0} Joined</Badge>
                                </div>
                            ))}
                            {courses.flatMap(c => c.schedules).length === 0 && <p className="text-gray-400 text-sm">No recent classes.</p>}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
      );
  }

  // --- SCHEDULE VIEW (Read Only List) ---
  if (view === 'schedule') {
      const upcomingSchedules = courses.flatMap(c => c.schedules)
        .map(s => ({...s, courseName: courses.find(c => c.id === s.courseId)?.title }))
        .sort((a, b) => new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime());

      return (
          <div>
              <PageHeader 
                  title="Upcoming Live Classes" 
                  description="A list of all scheduled sessions for your courses."
                  theme="purple"
                  icon={<Calendar className="text-white" size={24} />}
              />
              <div className="grid gap-4">
                 {upcomingSchedules.length === 0 && (
                     <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                         <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                         <p className="text-gray-500">No upcoming classes found.</p>
                         <Button className="mt-4" variant="outline" onClick={() => showToast('Go to Course Manager > Live Classes to create one', 'info')}>Create Schedule</Button>
                     </div>
                 )}
                 {upcomingSchedules.map(s => (
                     <div key={s.id} className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-l-purple-500 flex justify-between items-center">
                         <div>
                             <h4 className="font-bold text-lg text-gray-900">{s.topic}</h4>
                             <div className="flex gap-3 mt-2 text-sm text-gray-600">
                                 <Badge color="blue">{s.courseName}</Badge>
                                 <span className="flex items-center gap-1"><Clock size={14} /> {s.date} at {s.time}</span>
                             </div>
                             {s.agenda && <p className="text-sm text-gray-500 mt-2 italic">Agenda: {s.agenda}</p>}
                         </div>
                         <div className="text-right">
                             <p className="text-2xl font-bold text-gray-800">{s.attendance?.length || 0}</p>
                             <p className="text-xs text-gray-500 uppercase font-bold">Joined</p>
                             <a href={s.meetingUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="accent" className="mt-2">Join</Button></a>
                         </div>
                     </div>
                 ))}
              </div>
          </div>
      );
  }

  // --- COURSE MANAGER VIEW (Tabs) ---
  return (
    <div>
       <PageHeader 
          title="Course Manager" 
          description="Create content, schedule classes, and manage assessments."
          theme="amber"
          icon={<Settings className="text-white" size={24} />}
       />

      <div className="bg-white p-1 rounded-lg shadow-sm border border-gray-100 inline-flex mb-6 overflow-x-auto max-w-full">
         {[
            { id: 'courses', icon: BookOpen, label: 'Courses' },
            { id: 'schedule', icon: Video, label: 'Live Classes' },
            { id: 'quizzes', icon: Settings, label: 'Quizzes' },
            { id: 'assignments', icon: FileText, label: 'Assignments' },
            { id: 'performance', icon: Award, label: 'Analytics' },
         ].map(tab => (
            <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
            >
                <tab.icon size={16} /> {tab.label}
            </button>
         ))}
      </div>

      {activeTab === 'courses' && (
        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                     <button onClick={() => { setCourseSubTab('list'); setEditCourseId(null); setCourseForm({title: '', description: '', price: '', thumbnail: '', assignedInstructorId: ''}) }} className={`px-3 py-1.5 text-sm rounded-md font-medium transition-all ${courseSubTab === 'list' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>My Courses</button>
                     <button onClick={() => setCourseSubTab('create')} className={`px-3 py-1.5 text-sm rounded-md font-medium transition-all flex items-center gap-1 ${courseSubTab === 'create' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}><Plus size={14} /> Create New</button>
                 </div>
              </div>

              {courseSubTab === 'list' ? (
                 <div className="grid gap-4">
                    {courses.map(c => (
                       <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow group">
                          <div className="flex items-center gap-4 w-full">
                             {c.thumbnailUrl ? <img src={c.thumbnailUrl} className="w-20 h-16 rounded-lg object-cover shadow-sm" /> : <div className="w-20 h-16 bg-gray-100 rounded-lg flex items-center justify-center"><BookOpen /></div>}
                             <div className="flex-1">
                                <h4 className="font-bold text-gray-900 group-hover:text-primary-600">{c.title}</h4>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                   <Badge color="green">${c.price}</Badge>
                                   <span>{c.materials.length} Files</span>
                                </div>
                                <AuditTag createdBy={c.createdBy} lastEditedBy={c.lastEditedBy} updatedAt={c.updatedAt} userRole={user.role} />
                             </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => startEdit(c)} className="shrink-0"><Edit2 size={14} className="mr-1" /> Edit</Button>
                       </div>
                    ))}
                 </div>
              ) : (
                <Card title={editCourseId ? "Edit Course" : "Create New Course"} className="border-t-4 border-t-primary-500">
                  <div className="space-y-5">
                    <Input label="Course Title" value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} placeholder="e.g. Advanced React Patterns" />
                    {user.role === UserRole.ADMIN && (
                        <Select label="Assign Instructor" options={[{value: '', label: 'Select Instructor...'}, ...allInstructors.map(i => ({value: i.id, label: i.name}))]} value={courseForm.assignedInstructorId} onChange={e => setCourseForm({...courseForm, assignedInstructorId: e.target.value})} />
                    )}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description & Outline</label>
                      <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm h-40 focus:ring-primary-500 resize-none" value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} />
                      <button onClick={handleAICreate} disabled={isGenerating} className="absolute right-3 bottom-3 text-xs bg-purple-600 text-white px-3 py-1.5 rounded-full shadow flex items-center gap-1"><Sparkles size={12} /> AI Auto-Generate</button>
                    </div>
                    <Input label="Price ($)" type="number" value={courseForm.price} onChange={e => setCourseForm({...courseForm, price: e.target.value})} />
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <div className="flex-1">
                          <label className="block text-sm font-bold text-gray-700 mb-1">Course Thumbnail</label>
                          <input type="file" onChange={handleThumbUpload} className="text-sm" disabled={uploading} />
                      </div>
                      {courseForm.thumbnail && <img src={courseForm.thumbnail} alt="Preview" className="w-20 h-20 rounded-lg object-cover shadow-md" />}
                    </div>
                    <div className="pt-4 border-t">
                        <Button onClick={handleSaveCourse} className="w-full py-3" disabled={processingCourse || uploading}>{processingCourse ? 'Processing...' : (editCourseId ? 'Update Course' : 'Create Course')}</Button>
                    </div>
                  </div>
                </Card>
              )}
          </div>
          <div className="space-y-6">
            <Card title="Manage Materials">
              <div className="space-y-4">
                <Select label="Select Course" options={[{ value: '', label: 'Select...' }, ...(courses || []).map(c => ({ value: c.id, label: c.title }))]} value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} />
                <div className={`border-2 border-dashed border-gray-300 rounded-xl p-8 text-center transition-all bg-gray-50 group ${selectedCourseId ? 'hover:border-primary-400 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                  {uploading ? <Loader2 className="animate-spin text-primary-500 h-8 w-8 mx-auto" /> : (
                      <div className="relative">
                          <Upload className="h-8 w-8 text-primary-500 mx-auto mb-2" />
                          <p className="text-sm font-bold">Upload Files</p>
                          <input type="file" className={`absolute inset-0 w-full h-full opacity-0 ${selectedCourseId ? 'cursor-pointer' : ''}`} onChange={handleFileUpload} disabled={!selectedCourseId || uploading} />
                      </div>
                  )}
                </div>
              </div>
            </Card>
            <Card title="Active Files" className="h-fit">
              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                 {(courses.find(c => c.id === selectedCourseId)?.materials || []).map(m => (
                   <div key={m.id} className="flex justify-between items-center text-sm bg-white p-3 rounded border">
                      <span className="truncate max-w-[180px] font-medium">{m.title}</span>
                      <button onClick={() => handleDeleteMaterial(selectedCourseId, m.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                   </div>
                 ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="grid md:grid-cols-2 gap-6">
           <Card title="Create New Session" className="h-fit border-t-4 border-t-indigo-500">
              <Select label="Select Course" options={[{ value: '', label: 'Select...' }, ...(courses || []).map(c => ({ value: c.id, label: c.title }))]} value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} />
              <Input label="Session Topic" value={schedTopic} onChange={e => setSchedTopic(e.target.value)} />
              <Input label="Agenda" value={schedAgenda} onChange={e => setSchedAgenda(e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                 <Input label="Date" type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} />
                 <Input label="Time" type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} />
              </div>
              <Button onClick={handleAddSchedule} className="w-full mt-4" variant="accent"><Video className="inline mr-2" size={16} /> Schedule</Button>
           </Card>
           <Card title="Scheduled Sessions">
              <div className="space-y-4">
                 {(courses || []).flatMap(c => c.schedules.map(s => ({...s, courseName: c.title}))).map(s => (
                   <div key={s.id} className="bg-gray-50 p-4 rounded-lg border flex justify-between items-start">
                      <div>
                         <h5 className="font-bold text-gray-900">{s.topic}</h5>
                         <p className="text-xs text-gray-500">{s.courseName} • {s.date} at {s.time}</p>
                         <p className="text-xs text-blue-600 mt-1">{s.attendance?.length || 0} Joined</p>
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => { setSelectedCourseId(s.courseId); setSchedTopic(s.topic); setSchedAgenda(s.agenda || ''); setSchedDate(s.date); setSchedTime(s.time); setEditingSchedId(s.id); }} className="text-blue-500"><Edit2 size={14} /></button>
                         <button onClick={async () => { if(window.confirm('Delete?')) { await storageService.deleteSchedule(s.courseId, s.id); refreshData(); } }} className="text-red-500"><Trash2 size={14} /></button>
                      </div>
                   </div>
                 ))}
              </div>
           </Card>
        </div>
      )}

      {activeTab === 'quizzes' && <div className="bg-white p-6 rounded-xl border"><QuizManager user={user} courses={courses} showToast={showToast} /></div>}
      {activeTab === 'assignments' && (
        <div>
           <div className="max-w-md mb-6"><Select label="Select Course" options={[{ value: '', label: 'Select...' }, ...courses.map(c => ({ value: c.id, label: c.title }))]} value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} /></div>
           {selectedCourseId && <div className="bg-white p-6 rounded-xl border"><AssignmentManager user={user} courseId={selectedCourseId} isInstructor={true} showToast={showToast} /></div>}
        </div>
      )}
      {activeTab === 'performance' && <Card title="Analytics" className="text-center py-12"><BarChart3 className="mx-auto h-12 w-12 text-gray-300 mb-2" /><p>Detailed charts coming soon.</p></Card>}
    </div>
  );
};
