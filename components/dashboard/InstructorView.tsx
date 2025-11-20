
import React, { useState, useEffect } from 'react';
import { User, UserRole, Course, ClassSchedule, CourseMaterial } from '../../types';
import { storageService } from '../../services/storage';
import { generateCourseOutline } from '../../services/geminiService';
import { Button, Input, Select, Card, Skeleton } from '../ui/Shared';
import { Sparkles, Upload, Video, Trash2, Edit2, Loader2 } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  
  // Create Course State
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCoursePrice, setNewCoursePrice] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);

  // Manage State
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Schedule State
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [schedTopic, setSchedTopic] = useState('');
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

  const handleAICreate = async () => {
    if (!newCourseTitle) return showToast('Enter a title first', 'error');
    setIsGenerating(true);
    const desc = await generateCourseOutline(newCourseTitle);
    setNewCourseDesc(desc);
    setIsGenerating(false);
  };

  const handleCreateCourse = async () => {
    if (!newCourseTitle || !newCoursePrice) return;
    setCreatingCourse(true);
    
    const newCourseData: Course = {
      id: '', 
      title: newCourseTitle,
      description: newCourseDesc,
      instructorId: user.id,
      price: parseFloat(newCoursePrice),
      materials: [],
      schedules: []
    };

    try {
      const createdCourse = await storageService.addCourse(newCourseData);
      setCourses(prev => [...prev, createdCourse]);
      showToast('Course created successfully', 'success');
      setNewCourseTitle(''); setNewCourseDesc(''); setNewCoursePrice('');
      setSelectedCourseId(createdCourse.id);
    } catch (error) {
      showToast('Failed to create course', 'error');
    } finally {
      setCreatingCourse(false);
    }
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
        // 1. Upload to Cloudinary
        const secureUrl = await storageService.uploadToCloudinary(file, CLOUD_NAME, UPLOAD_PRESET);
        
        // 2. Prepare Metadata
        const ext = file.name.split('.').pop()?.toLowerCase();
        let type: 'PDF' | 'DOCX' | 'PPT' | 'OTHER' = 'OTHER';
        if (ext === 'pdf') type = 'PDF';
        else if (['doc', 'docx'].includes(ext || '')) type = 'DOCX';
        else if (['ppt', 'pptx'].includes(ext || '')) type = 'PPT';

        const newMaterial: CourseMaterial = {
            id: Math.random().toString(36).substring(7),
            title: file.name,
            type: type,
            url: secureUrl, // Save the real Cloudinary URL
            uploadedAt: new Date().toISOString()
        };

        // 3. Save to Database
        await storageService.addMaterial(selectedCourseId, newMaterial);
        showToast(`Successfully uploaded: ${file.name}`, 'success');
        await refreshData(); 
    } catch (e: any) {
        console.error(e);
        if (e.message && e.message.includes('unsigned uploads')) {
            showToast('Cloudinary Config Error', 'error');
            alert('⚠️ CLOUDINARY CONFIGURATION REQUIRED ⚠️\n\nYour Upload Preset "zero_classes_preset" is set to "Signed".\n\nTO FIX:\n1. Go to Cloudinary Dashboard -> Settings -> Upload -> Upload Presets\n2. Edit "zero_classes_preset"\n3. Change Signing Mode to "Unsigned"\n4. Save');
        } else {
            showToast(`Upload failed: ${e.message}`, 'error');
        }
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
          date: schedDate,
          time: schedTime,
          meetingUrl: 'https://meet.google.com/new'
      };

      if (editingSchedId) {
        await storageService.updateSchedule(selectedCourseId, { ...payload, id: editingSchedId });
        showToast('Schedule updated', 'success');
        setEditingSchedId(null);
      } else {
        await storageService.addSchedule(selectedCourseId, { ...payload, id: Math.random().toString(36).substring(7) });
        showToast('Class scheduled!', 'success');
      }
      setSchedDate(''); setSchedTime(''); setSchedTopic('');
      await refreshData();
    } catch (e) {
      showToast('Failed to save schedule', 'error');
    }
  };

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
            <Button onClick={handleCreateCourse} className="w-full" disabled={creatingCourse}>
              {creatingCourse ? 'Creating...' : 'Create Course'}
            </Button>
          </div>
        </Card>

        {/* Manage Materials */}
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
                        <input 
                          type="file" 
                          className={`absolute inset-0 w-full h-full opacity-0 z-10 ${selectedCourseId ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                          onChange={handleFileUpload}
                          disabled={!selectedCourseId || uploading}
                        />
                    </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card title="My Active Courses & Materials">
         <div className="space-y-4">
           {(courses || []).map(c => (
             <div key={c.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-gray-800">{c.title}</h4>
                  <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded">${c.price}</span>
                </div>
                <div className="space-y-1 bg-gray-50 p-3 rounded">
                   <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Materials</p>
                   {(!c.materials || c.materials.length === 0) && <p className="text-xs text-gray-400 italic">No files</p>}
                   {(c.materials || []).map(m => (
                     <div key={m.id} className="flex justify-between items-center text-sm text-gray-700 bg-white p-2 rounded shadow-sm">
                        <a href={m.url} target="_blank" rel="noreferrer" className="hover:underline text-blue-600 truncate max-w-[200px]">{m.title}</a>
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
