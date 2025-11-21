
import React, { useState, useEffect } from 'react';
import { User, UserRole, Course, Assignment, Submission } from '../../types';
import { storageService } from '../../services/storage';
import { Button, Input, Card, Select, Skeleton, AuditTag, Modal } from '../ui/Shared';
import { Plus, Trash2, FileText, Upload, Download, CheckCircle, Loader2, MessageSquare, Star, ThumbsUp, ThumbsDown, Heart } from 'lucide-react';

// Cloudinary constants
const CLOUD_NAME = 'dj0tdcc8f'; 
const UPLOAD_PRESET = 'zero_classes_preset';

interface AssignmentManagerProps {
  user: User;
  courseId: string;
  isInstructor: boolean;
  showToast: (m: string, t: any) => void;
}

export const AssignmentManager: React.FC<AssignmentManagerProps> = ({ user, courseId, isInstructor, showToast }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({});
  const [loading, setLoading] = useState(true);

  // Instructor Creation
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [creating, setCreating] = useState(false);

  // Instructor Grading
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeValue, setGradeValue] = useState('');
  const [feedbackValue, setFeedbackValue] = useState('');

  // Student Submission
  const [uploadingMap, setUploadingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    setLoading(true);
    const data = await storageService.getAssignments(courseId);
    setAssignments(data);
    
    const subs: Record<string, Submission[]> = {};
    for (const a of data) {
      const allSubs = await storageService.getSubmissions(a.id);
      if (isInstructor) {
        subs[a.id] = allSubs;
      } else {
        subs[a.id] = allSubs.filter(s => s.studentId === user.id);
      }
    }
    setSubmissions(subs);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newTitle || !newDesc) return showToast('Fields required', 'error');
    await storageService.addAssignment({
      courseId,
      title: newTitle,
      description: newDesc,
      dueDate: newDueDate
    }, user.name);
    setNewTitle(''); setNewDesc(''); setNewDueDate(''); setCreating(false);
    fetchData();
    showToast('Assignment Created', 'success');
  };

  const handleDelete = async (id: string) => {
    if(window.confirm('Delete Assignment?')) {
      await storageService.deleteAssignment(id);
      fetchData();
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, assignmentId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingMap(p => ({...p, [assignmentId]: true}));
    try {
      const url = await storageService.uploadToCloudinary(file, CLOUD_NAME, UPLOAD_PRESET);
      await storageService.submitAssignment({
        assignmentId,
        studentId: user.id,
        fileUrl: url,
        submittedAt: new Date().toISOString()
      });
      showToast('Answer Submitted!', 'success');
      fetchData();
    } catch(e) {
      showToast('Upload Failed', 'error');
    } finally {
      setUploadingMap(p => ({...p, [assignmentId]: false}));
    }
  };

  const handleGradeSubmit = async () => {
    if (!gradingId || !gradeValue || !feedbackValue) return showToast('Grade and Feedback required', 'error');
    try {
      await storageService.gradeSubmission(gradingId, parseFloat(gradeValue), feedbackValue);
      showToast('Feedback submitted', 'success');
      setGradingId(null);
      fetchData();
    } catch(e) {
      showToast('Failed to save feedback', 'error');
    }
  };

  const handleReaction = async (subId: string, reaction: string) => {
    try {
      await storageService.reactToSubmission(subId, reaction);
      showToast('Reaction sent!', 'success');
      fetchData();
    } catch(e) {
      showToast('Failed to react', 'error');
    }
  };

  if (loading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-6">
      {isInstructor && (
        <Card className="border-l-4 border-purple-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Subjective Assignments</h3>
            <Button onClick={() => setCreating(!creating)} size="sm" variant="outline">
              {creating ? 'Cancel' : 'Create New'}
            </Button>
          </div>
          
          {creating && (
            <div className="space-y-3 bg-gray-50 p-4 rounded mb-4 animate-in slide-in-from-top-2">
              <Input placeholder="Assignment Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              <textarea 
                className="w-full p-2 border rounded" 
                placeholder="Question Description..." 
                value={newDesc} 
                onChange={e => setNewDesc(e.target.value)} 
              />
              <Input type="date" label="Due Date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
              <Button onClick={handleCreate}>Publish Assignment</Button>
            </div>
          )}
        </Card>
      )}

      <div className="space-y-4">
        {assignments.length === 0 && <p className="text-center text-gray-500 italic">No assignments for this course.</p>}
        {assignments.map(assign => {
          const mySub = submissions[assign.id]?.[0];
          const subCount = submissions[assign.id]?.length || 0;

          return (
            <div key={assign.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-lg text-gray-800">{assign.title}</h4>
                  <p className="text-gray-600 text-sm mt-1">{assign.description}</p>
                  <AuditTag createdBy={assign.createdBy} lastEditedBy={assign.lastEditedBy} updatedAt={assign.updatedAt} userRole={user.role} />
                  {assign.dueDate && <p className="text-xs text-red-500 mt-2">Due: {assign.dueDate}</p>}
                </div>
                {isInstructor && (
                  <button onClick={() => handleDelete(assign.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                {isInstructor ? (
                   <div>
                     <p className="font-bold text-sm mb-2">Student Submissions ({subCount})</p>
                     {subCount === 0 ? <p className="text-xs text-gray-400">No submissions yet.</p> : (
                       <div className="space-y-4">
                         {submissions[assign.id].map(sub => (
                           <div key={sub.id} className="bg-gray-50 p-3 rounded text-sm border border-gray-200">
                              <div className="flex justify-between items-start mb-2">
                                <span>Student ID: {sub.studentId.substring(0,6)}...</span>
                                <span className="text-xs text-gray-500">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                              </div>
                              
                              <a href={sub.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 mb-2">
                                <Download size={14} /> View PDF
                              </a>

                              <div className="mt-2">
                                  {sub.grade ? (
                                    <div className="bg-green-50 p-2 rounded border border-green-100">
                                       <p className="font-bold text-green-800">Grade: {sub.grade}/100</p>
                                       <p className="italic text-green-700">"{sub.feedback}"</p>
                                       {sub.studentReaction && (
                                          <p className="mt-1 text-xs text-gray-500">Student Reacted: {sub.studentReaction}</p>
                                       )}
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="outline" onClick={() => { setGradingId(sub.id); setGradeValue(''); setFeedbackValue(''); }}>
                                      <MessageSquare size={14} className="mr-1" /> Grade & Feedback
                                    </Button>
                                  )}
                                </div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                ) : (
                  // Student View
                  <div>
                    {mySub ? (
                      <div className="space-y-3">
                        <div className="bg-green-50 border border-green-200 p-3 rounded flex items-center gap-3">
                          <CheckCircle className="text-green-600" size={20} />
                          <div>
                            <p className="text-sm font-bold text-green-800">Submitted</p>
                            <a href={mySub.fileUrl} target="_blank" className="text-xs text-green-600 hover:underline">View my answer</a>
                          </div>
                        </div>
                        
                        {mySub.feedback && (
                          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded animate-in fade-in">
                             <p className="text-sm font-bold text-yellow-800 flex items-center gap-2"><Star size={16} /> Instructor Feedback</p>
                             <p className="text-sm text-gray-800 mt-1 mb-2">{mySub.feedback}</p>
                             <p className="text-xs text-gray-500 mb-2">Grade: <strong>{mySub.grade}/100</strong></p>
                             
                             <div className="flex gap-2 items-center pt-2 border-t border-yellow-200">
                                <span className="text-xs text-gray-600">React to feedback:</span>
                                <button onClick={() => handleReaction(mySub.id, '👍')} className={`p-1.5 rounded hover:bg-yellow-100 ${mySub.studentReaction === '👍' ? 'bg-yellow-200' : ''}`}>👍</button>
                                <button onClick={() => handleReaction(mySub.id, '❤️')} className={`p-1.5 rounded hover:bg-yellow-100 ${mySub.studentReaction === '❤️' ? 'bg-yellow-200' : ''}`}>❤️</button>
                                <button onClick={() => handleReaction(mySub.id, '👎')} className={`p-1.5 rounded hover:bg-yellow-100 ${mySub.studentReaction === '👎' ? 'bg-yellow-200' : ''}`}>👎</button>
                             </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <label className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 transition-colors ${uploadingMap[assign.id] ? 'opacity-50 pointer-events-none' : ''}`}>
                           {uploadingMap[assign.id] ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                           {uploadingMap[assign.id] ? 'Uploading...' : 'Upload PDF Answer'}
                           <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleUpload(e, assign.id)} />
                        </label>
                        <span className="text-xs text-gray-500">Max 5MB. PDF Only.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grading Modal */}
      <Modal isOpen={!!gradingId} onClose={() => setGradingId(null)} title="Grade Submission">
        <div className="space-y-4">
           <Input type="number" label="Grade (0-100)" value={gradeValue} onChange={e => setGradeValue(e.target.value)} />
           <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
               <textarea className="w-full border rounded p-2 text-sm" rows={4} placeholder="Enter constructive feedback..." value={feedbackValue} onChange={e => setFeedbackValue(e.target.value)} />
           </div>
           <Button onClick={handleGradeSubmit} className="w-full">Submit Grade</Button>
        </div>
      </Modal>
    </div>
  );
};
