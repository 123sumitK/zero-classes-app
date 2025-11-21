
import React, { useState, useEffect } from 'react';
import { User, UserRole, Course, ClassSchedule, CourseMaterial, QuizResult } from '../../types';
import { storageService } from '../../services/storage';
import { generateCourseOutline } from '../../services/geminiService';
import { Button, Input, Select, Card, Skeleton, AuditTag } from '../ui/Shared';
import { Sparkles, Upload, Video, Trash2, Edit2, Loader2, Calendar, BookOpen, Award, Settings, FileText, Save, X, Plus, Clock, User as UserIcon, Link } from 'lucide-react';
import { QuizManager } from '../features/QuizManager';
import { AssignmentManager } from '../features/AssignmentManager';

interface InstructorViewProps {
  user: User;
  view: string;
  showToast: (m: string, t: any) => void;
}

// Cloudinary Configuration from User Screenshot
const CLOUD_NAME = 'dj0tdcc8f'; 
const UPLOAD_PRESET = 'zero_classes_preset'; 

export const InstructorView: React.FC<InstructorViewProps> = ({ user, view, showToast }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [allInstructors, setAllInstructors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses'); 
  
  // Course Management Sub-tabs
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
      const all = await storageService.getCourses();
      const safeAll = Array.isArray(all) ? all : [];
      if (user.role === UserRole.ADMIN) {
        setCourses(safeAll);
        // Fetch instructors for the dropdown
        const users = await storageService.getUsers();
        setAllInstructors(users.filter(u => u.role === UserRole.INSTRUCTOR));
      } else {
        setCourses(safeAll.filter(c => c.instructorId === user.id));
      }
    } catch (error) {
      console.error("Failed to refresh data", error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

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
    
    const targetInstructorId = user.role === UserRole.ADMIN && courseForm.assignedInstructorId 
        ? courseForm.assignedInstructorId 
        : user.id;

    try {
       if (editCourseId) {
          // Update
          await storageService.updateCourse(editCourseId, {
              title: courseForm.title,
              description: courseForm.description,
              price: parseFloat(courseForm.price),
              thumbnailUrl: courseForm.thumbnail,
              instructorId: targetInstructorId
          }, user.name);
          showToast('Course updated', 'success');
       } else {
          // Create
          const newCourseData = {
            title: courseForm.title,
            description: courseForm.description,
            instructorId: targetInstructorId,
            price: parseFloat(courseForm.price),
            thumbnailUrl: courseForm.thumbnail,
            materials: [],
            schedules: []
          };
          // @ts-ignore
          await storageService.addCourse(newCourseData, user.name);
          showToast('Course created', 'success');
       }
       
       setCourseForm({ title: '', description: '', price: '', thumbnail: '', assignedInstructorId: '' });
       setEditCourseId(null);
       setCourseSubTab('list');
       refreshData();
    } catch (error) {
       showToast('Failed to save course', 'error');
    } finally {
       setProcessingCourse(false);
    }
  };

  const startEdit = (c: Course) => {
      setEditCourseId(c.id);
      setCourseForm({ 
          title: c.title, 
          description: c.description, 
          price: c.price.toString(), 
          thumbnail: c.thumbnailUrl || '',
          assignedInstructorId: c.instructorId
      });
      setCourseSubTab('create'); // Re-use create form for editing
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCourseId) {
        showToast('Please select a course first', 'error');
        e.target.value = '';
        return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
        const secureUrl = await storageService.uploadToCloudinary(file, CLOUD_NAME, UPLOAD_PRESET);
        const ext = file.name.split('.').pop()?.toLowerCase();
        let type: 'PDF' | 'DOCX' | 'PPT' | 'OTHER' = 'OTHER';
        if (ext === 'pdf') type = 'PDF';
        else if (['doc', 'docx'].includes(ext || '')) type = 'DOCX';
        else if (['ppt', 'pptx'].includes(ext || '')) type = 'PPT';

        const newMaterial: CourseMaterial = {
            id: Math.random().toString(36).substring(7),
            title: file.name,
            type: type,
            url: secureUrl,
            uploadedAt: new Date().toISOString()
        };
        await storageService.addMaterial(selectedCourseId, newMaterial);
        showToast(`Successfully uploaded: ${file.name}`, 'success');
        await refreshData(); 
    } catch (e: any) {
        showToast(`Upload failed: ${e.message}`, 'error');
    } finally {
        setUploading(false);
        e.target.value = '';
    }
  };

  const handleDeleteMaterial = async (courseId: string, matId: string) => {
    if (window.confirm('Delete this file?')) {
      try {
        await storageService.deleteMaterial(courseId, matId);
        await refreshData();
        showToast('Material deleted', 'success');
      } catch (e) {
        showToast('Failed to delete material', 'error');
      }
    }
  };

  const handleAddSchedule = async () => {
    if (!selectedCourseId || !schedDate || !schedTime) return;
    try {
      const payload = {
          courseId: selectedCourseId,
          topic: schedTopic || 'Class Session',
          agenda: schedAgenda,
          date: schedDate,
          time: schedTime,
          meetingUrl: 'https://meet.google.com/new',
          instructorName: user.name
      };

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
    } catch (e) {
      showToast('Failed to save schedule', 'error');
    }
  };

  if (loading) return <div className="p-4"><Skeleton className="h-96 w-full" /></div>;

  // Instructor Profile Warning
  const isProfileIncomplete = user.role === UserRole.INSTRUCTOR && (!user.instructorProfile?.qualification || !user.instructorProfile?.bio);

  return (
    <div className="space-y-6">
       {isProfileIncomplete && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
             <p className="text-yellow-700 font-bold">Your Instructor Profile is incomplete!</p>
             <p className="text-yellow-600 text-sm">Please update your bio and qualification in the "My Profile" section to appear credible to students.</p>
          </div>
       )}

      {/* Instructor Nav Tabs */}
      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto pb-2">
         <button onClick={() => setActiveTab('courses')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'courses' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}>
            <BookOpen className="inline mr-2 w-4 h-4" /> Manage Courses
         </button>
         <button onClick={() => setActiveTab('schedule')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'schedule' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}>
            <Video className="inline mr-2 w-4 h-4" /> Live Classes
         </button>
         <button onClick={() => setActiveTab('quizzes')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'quizzes' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}>
            <Settings className="inline mr-2 w-4 h-4" /> Quiz Manager
         </button>
         <button onClick={() => setActiveTab('assignments')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'assignments' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}>
            <FileText className="inline mr-2 w-4 h-4" /> Assignments
         </button>
         <button onClick={() => setActiveTab('performance')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'performance' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}>
            <Award className="inline mr-2 w-4 h-4" /> Student Performance
         </button>
      </div>

      {activeTab === 'courses' && (
        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Create/List */}
          <div className="lg:col-span-2">
              <div className="flex gap-2 mb-4">
                 <Button size="sm" variant={courseSubTab === 'list' ? 'primary' : 'outline'} onClick={() => { setCourseSubTab('list'); setEditCourseId(null); setCourseForm({title: '', description: '', price: '', thumbnail: '', assignedInstructorId: ''}) }}>My Courses</Button>
                 <Button size="sm" variant={courseSubTab === 'create' ? 'primary' : 'outline'} onClick={() => setCourseSubTab('create')}><Plus size={16} className="mr-1" /> Create New</Button>
              </div>

              {courseSubTab === 'list' ? (
                 <div className="grid gap-4">
                    {courses.length === 0 && <p className="text-gray-500 italic">No courses yet. Create one!</p>}
                    {courses.map(c => (
                       <div key={c.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 flex justify-between items-center">
                          <div className="flex items-center gap-4">
                             {c.thumbnailUrl ? <img src={c.thumbnailUrl} className="w-16 h-16 rounded object-cover" /> : <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center"><BookOpen /></div>}
                             <div>
                                <h4 className="font-bold text-gray-800">{c.title}</h4>
                                <p className="text-sm text-gray-500">${c.price} • {c.materials.length} Files</p>
                                <AuditTag createdBy={c.createdBy} lastEditedBy={c.lastEditedBy} updatedAt={c.updatedAt} userRole={user.role} />
                             </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => startEdit(c)}><Edit2 size={16} /> Edit</Button>
                       </div>
                    ))}
                 </div>
              ) : (
                <Card title={editCourseId ? "Edit Course" : "Create New Course"}>
                  <div className="space-y-4">
                    <Input label="Course Title" value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} />
                    
                    {user.role === UserRole.ADMIN && (
                        <Select 
                            label="Assign Instructor"
                            options={[{value: '', label: 'Select Instructor...'}, ...allInstructors.map(i => ({value: i.id, label: i.name}))]}
                            value={courseForm.assignedInstructorId}
                            onChange={e => setCourseForm({...courseForm, assignedInstructorId: e.target.value})}
                        />
                    )}

                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm h-32 focus:ring-primary-500 focus:border-primary-500"
                        value={courseForm.description}
                        onChange={e => setCourseForm({...courseForm, description: e.target.value})}
                      />
                      <button onClick={handleAICreate} disabled={isGenerating} className="absolute right-2 bottom-2 text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full hover:bg-purple-200 flex items-center gap-1 transition-colors font-medium">
                        <Sparkles size={12} /> {isGenerating ? 'Generating...' : 'AI Generate'}
                      </button>
                    </div>
                    <Input label="Price ($)" type="number" value={courseForm.price} onChange={e => setCourseForm({...courseForm, price: e.target.value})} />
                    
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Course Thumbnail</label>
                          <input type="file" onChange={handleThumbUpload} className="text-sm" disabled={uploading} />
                      </div>
                      {courseForm.thumbnail && <img src={courseForm.thumbnail} alt="Preview" className="w-12 h-12 rounded object-cover" />}
                    </div>

                    <Button onClick={handleSaveCourse} className="w-full" disabled={processingCourse || uploading}>
                      {processingCourse ? 'Saving...' : (editCourseId ? 'Update Course' : 'Create Course')}
                    </Button>
                  </div>
                </Card>
              )}
          </div>

          {/* Right Column: Materials */}
          <div className="space-y-6">
            <Card title="Upload Course Materials">
              <div className="space-y-4">
                <Select 
                  label="Select Course"
                  options={[{ value: '', label: 'Select...' }, ...(courses || []).map(c => ({ value: c.id, label: c.title }))]}
                  value={selectedCourseId}
                  onChange={e => setSelectedCourseId(e.target.value)}
                />
                <div className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-colors bg-gray-50 ${selectedCourseId ? 'hover:border-primary-400 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                  {uploading ? (
                      <div className="flex flex-col items-center justify-center py-4">
                          <Loader2 className="animate-spin text-primary-500 h-8 w-8 mb-2" />
                          <p className="text-sm text-gray-600">Uploading to Cloud...</p>
                      </div>
                  ) : (
                      <div className="relative">
                          <Upload className="mx-auto h-10 w-10 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600 font-medium">
                              {selectedCourseId ? 'Click to upload materials' : 'Select a course to enable upload'}
                          </p>
                          <input type="file" className={`absolute inset-0 w-full h-full opacity-0 z-10 ${selectedCourseId ? 'cursor-pointer' : 'cursor-not-allowed'}`} onChange={handleFileUpload} disabled={!selectedCourseId || uploading} />
                      </div>
                  )}
                </div>
              </div>
            </Card>

            <Card title="Active Materials">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                 {(courses.find(c => c.id === selectedCourseId)?.materials || []).map(m => (
                   <div key={m.id} className="flex justify-between items-center text-sm text-gray-700 bg-white p-2 rounded shadow-sm border">
                      <span className="truncate max-w-[200px]">{m.title}</span>
                      <button onClick={() => handleDeleteMaterial(selectedCourseId, m.id)} className="text-red-500 hover:text-red-700 text-xs"><Trash2 size={14} /></button>
                   </div>
                 ))}
                 {!selectedCourseId && <p className="text-gray-400 text-sm italic text-center">Select a course above</p>}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="grid md:grid-cols-2 gap-6">
           <Card title="Schedule Live Class">
              <Select 
                label="Select Course"
                options={[{ value: '', label: 'Select...' }, ...(courses || []).map(c => ({ value: c.id, label: c.title }))]}
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
              />
              <Input label="Session Topic" value={schedTopic} onChange={e => setSchedTopic(e.target.value)} placeholder="e.g. Introduction to React" />
              <Input label="Agenda / Description" value={schedAgenda} onChange={e => setSchedAgenda(e.target.value)} placeholder="Brief details about the class..." />
              <div className="grid grid-cols-2 gap-4">
                 <Input label="Date" type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} />
                 <Input label="Time" type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} />
              </div>
              <Button onClick={handleAddSchedule} className="w-full mt-4">
                <Video className="inline mr-2" size={16} /> Schedule Class
              </Button>
           </Card>

           <Card title="Upcoming Sessions">
              <div className="space-y-3">
                 {(courses || []).flatMap(c => c.schedules.map(s => ({...s, courseName: c.title}))).map(s => (
                   <div key={s.id} className="border-l-4 border-blue-500 bg-white p-4 shadow-sm rounded-r hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                           <h5 className="font-bold text-gray-900 text-lg">{s.topic}</h5>
                           <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                              <UserIcon size={14} /> {user.name}
                           </div>
                           <div className="flex items-center gap-2 text-sm text-blue-600 font-medium mt-1">
                              <Clock size={14} /> {s.date} • {s.time}
                           </div>
                        </div>
                        <a href={s.meetingUrl} target="_blank" rel="noreferrer" className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100">
                           <Link size={18} />
                        </a>
                      </div>
                      
                      {s.agenda && (
                         <div className="mt-3 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wide mb-1">Agenda</p>
                            <p className="text-sm text-gray-700 italic">{s.agenda}</p>
                         </div>
                      )}

                      <div className="flex gap-2 mt-4 justify-end border-t border-gray-100 pt-2">
                         <button onClick={() => { 
                            setSelectedCourseId(s.courseId); 
                            setSchedTopic(s.topic);
                            setSchedAgenda(s.agenda || ''); 
                            setSchedDate(s.date); 
                            setSchedTime(s.time); 
                            setEditingSchedId(s.id); 
                         }} className="text-xs font-medium text-gray-600 hover:text-primary-600 flex items-center gap-1">
                            <Edit2 size={12} /> Edit
                         </button>
                         <button onClick={async () => {
                            if(window.confirm('Delete session?')) {
                               await storageService.deleteSchedule(s.courseId, s.id);
                               refreshData();
                            }
                         }} className="text-xs font-medium text-red-500 hover:text-red-700 flex items-center gap-1">
                            <Trash2 size={12} /> Delete
                         </button>
                      </div>
                   </div>
                 ))}
                 {courses.flatMap(c => c.schedules).length === 0 && <p className="text-gray-400 text-center py-8 italic">No upcoming classes scheduled.</p>}
              </div>
           </Card>
        </div>
      )}

      {activeTab === 'quizzes' && (
         <QuizManager user={user} courses={courses} showToast={showToast} />
      )}

      {activeTab === 'assignments' && (
        <div>
           <Select 
              label="Select Course for Assignments"
              options={[{ value: '', label: 'Select...' }, ...courses.map(c => ({ value: c.id, label: c.title }))]}
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
           />
           {selectedCourseId ? (
             <AssignmentManager user={user} courseId={selectedCourseId} isInstructor={true} showToast={showToast} />
           ) : (
             <p className="text-gray-500 italic">Please select a course to view its assignments.</p>
           )}
        </div>
      )}

      {activeTab === 'performance' && (
         <Card title="Student Performance">
            <p className="text-gray-500 mb-4">View quiz results for students enrolled in your courses.</p>
            <div className="bg-blue-50 p-4 rounded text-blue-700 text-center">
               Analytics feature coming soon in next update!
            </div>
         </Card>
      )}
    </div>
  );
};
