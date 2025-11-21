
import React, { useState, useEffect } from 'react';
import { User, Course, QuizResult } from '../../types';
import { storageService } from '../../services/storage';
import { Button, Card, Skeleton, ProgressBar, Checkbox } from '../ui/Shared';
import { BookOpen, Download, Award, Trophy, Clock, User as UserIcon, Play, ArrowRight, ArrowLeft } from 'lucide-react';
import { QuizManager } from '../features/QuizManager';
import { AssignmentManager } from '../features/AssignmentManager';

interface StudentViewProps {
  user: User;
  view: string;
  showToast: (m: string, t: any) => void;
  refreshUser: () => Promise<void>;
}

export const StudentView: React.FC<StudentViewProps> = ({ user, view, showToast, refreshUser }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, string[]>>(user.progress || {});
  const [loading, setLoading] = useState(true);
  
  const [performance, setPerformance] = useState<QuizResult[]>([]);
  const [instructors, setInstructors] = useState<Record<string, User>>({});
  
  // Detail Page State
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'materials' | 'quizzes' | 'assignments' | 'schedules'>('materials');

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const freshUser = await storageService.getUser(user.id);
        if (isMounted) setProgressMap(freshUser.progress || {});

        const allCourses = await storageService.getCourses();
        const safeAllCourses = Array.isArray(allCourses) ? allCourses : [];

        const results = await storageService.getStudentResults(user.id);
        const allUsers = await storageService.getUsers();
        const instMap: Record<string, User> = {};
        allUsers.forEach(u => { if(u.role === 'INSTRUCTOR') instMap[u.id] = u; });

        if (isMounted) {
           setCourses(safeAllCourses.filter(c => freshUser.enrolledCourseIds?.includes(c.id)));
           setAvailableCourses(safeAllCourses.filter(c => !freshUser.enrolledCourseIds?.includes(c.id)));
           setPerformance(results);
           setInstructors(instMap);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [user.id, view]);

  const handleEnroll = async (course: Course) => {
    const confirm = window.confirm(`Purchase "${course.title}" for $${course.price}?`);
    if (confirm) {
      try {
        await storageService.enrollStudent(user.id, course.id);
        await refreshUser();
        showToast('Payment successful! You are now enrolled.', 'success');
        setCourses(prev => [...prev, course]);
        setAvailableCourses(prev => prev.filter(c => c.id !== course.id));
      } catch (e) {
        showToast('Enrollment failed', 'error');
      }
    }
  };

  const toggleMaterial = async (courseId: string, materialId: string) => {
    try {
      const newProgress = await storageService.toggleProgress(user.id, courseId, materialId);
      setProgressMap(newProgress);
    } catch (error) {
      showToast('Failed to update progress', 'error');
    }
  };

  const getProgressPercent = (course: Course) => {
    const completed = progressMap[course.id]?.length || 0;
    const total = (course.materials || []).length;
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  // --- RENDER ---

  if (view === 'schedule') {
    const mySchedules = (courses || []).flatMap(c => c.schedules || []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Your Class Schedule</h2>
        {mySchedules.length === 0 ? (
           <p className="text-gray-500 bg-white p-8 rounded-lg shadow-sm text-center">No upcoming classes scheduled.</p>
        ) : (
          <div className="grid gap-4">
            {mySchedules.map(sch => (
              <Card key={sch.id} className="border-l-4 border-primary-500 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">{sch.topic}</h4>
                    <p className="text-sm text-gray-600 font-medium flex items-center gap-2 mt-1">
                       <Clock size={16} /> {sch.date} at {sch.time}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                       <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded flex items-center gap-1">
                          <UserIcon size={12} /> {sch.instructorName || 'Instructor'}
                       </span>
                    </div>
                    {sch.agenda && <p className="text-gray-500 text-sm mt-3 border-l-2 border-gray-300 pl-2 italic">{sch.agenda}</p>}
                  </div>
                  <a href={sch.meetingUrl} target="_blank" rel="noreferrer">
                    <Button>Join Live Class</Button>
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- COURSE DETAIL PAGE ---
  if (view === 'courses' && selectedCourse) {
    const percent = getProgressPercent(selectedCourse);
    const completedIds = progressMap[selectedCourse.id] || [];
    const instructor = instructors[selectedCourse.instructorId];

    return (
       <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <button onClick={() => setSelectedCourse(null)} className="flex items-center gap-2 text-gray-600 hover:text-primary-600 font-medium">
             <ArrowLeft size={20} /> Back to My Courses
          </button>

          {/* Course Header */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-primary-500">
             <div className="flex flex-col md:flex-row gap-6">
                {selectedCourse.thumbnailUrl && (
                   <img src={selectedCourse.thumbnailUrl} className="w-full md:w-48 h-32 object-cover rounded-lg" />
                )}
                <div className="flex-1">
                   <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedCourse.title}</h1>
                   {instructor && (
                      <div className="flex items-center gap-2 text-gray-600 mb-4">
                         {instructor.profileImage ? <img src={instructor.profileImage} className="w-6 h-6 rounded-full" /> : <UserIcon size={16} />}
                         <span>{instructor.name}</span>
                      </div>
                   )}
                   <div className="max-w-md">
                      <div className="flex justify-between text-sm mb-1">
                         <span>Course Progress</span>
                         <span className="font-bold">{percent}%</span>
                      </div>
                      <ProgressBar value={percent} />
                   </div>
                </div>
             </div>
          </div>

          {/* Detail Tabs */}
          <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
             {['materials', 'quizzes', 'assignments', 'schedules'].map(tab => (
                <button
                   key={tab}
                   onClick={() => setActiveDetailTab(tab as any)}
                   className={`px-6 py-3 font-medium capitalize whitespace-nowrap transition-colors ${activeDetailTab === tab ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50' : 'text-gray-500 hover:text-gray-700'}`}
                >
                   {tab}
                </button>
             ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
             {activeDetailTab === 'materials' && (
                <Card title="Learning Materials">
                   <div className="space-y-2">
                      {(!selectedCourse.materials || selectedCourse.materials.length === 0) && <p className="text-gray-500 italic">No materials uploaded.</p>}
                      {(selectedCourse.materials || []).map(m => {
                         const isCompleted = completedIds.includes(m.id);
                         return (
                            <div key={m.id} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded border border-gray-100 hover:bg-gray-100">
                               <div className="flex items-center gap-3 overflow-hidden">
                                  <Checkbox checked={isCompleted} onChange={() => toggleMaterial(selectedCourse.id, m.id)} />
                                  <div className="flex flex-col overflow-hidden">
                                     <span className={`font-medium truncate ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{m.title}</span>
                                     <span className="text-xs text-gray-500">{m.type}</span>
                                  </div>
                               </div>
                               <Button size="sm" variant="outline" onClick={() => handleDownload(m.url)}>
                                  <Download size={16} className="mr-2 inline" /> Download
                               </Button>
                            </div>
                         );
                      })}
                   </div>
                </Card>
             )}

             {activeDetailTab === 'quizzes' && (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                   <QuizManager user={user} courses={[selectedCourse]} courseIdFilter={selectedCourse.id} showToast={showToast} />
                </div>
             )}

             {activeDetailTab === 'assignments' && (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                   <AssignmentManager user={user} courseId={selectedCourse.id} isInstructor={false} showToast={showToast} />
                </div>
             )}

             {activeDetailTab === 'schedules' && (
                <div className="space-y-4">
                   {(selectedCourse.schedules || []).length === 0 && <p className="text-gray-500 italic">No schedules available.</p>}
                   {(selectedCourse.schedules || []).map(sch => (
                      <Card key={sch.id} className="border-l-4 border-blue-500">
                         <div className="flex justify-between items-center">
                            <div>
                               <h4 className="font-bold">{sch.topic}</h4>
                               <p className="text-sm text-gray-600">{sch.date} @ {sch.time}</p>
                               {sch.agenda && <p className="text-xs text-gray-500 mt-1 italic">{sch.agenda}</p>}
                            </div>
                            <a href={sch.meetingUrl} target="_blank" rel="noreferrer"><Button size="sm">Join</Button></a>
                         </div>
                      </Card>
                   ))}
                </div>
             )}
          </div>
       </div>
    );
  }

  // --- COURSE LIST VIEW ---
  if (view === 'courses') {
    if (loading) return <Skeleton className="h-96 w-full" />;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">My Enrolled Courses</h2>
        {(courses || []).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-gray-500">You haven't enrolled in any courses yet.</p>
                <Button onClick={() => {}} className="mt-4" variant="outline">Browse Catalog</Button>
            </div>
        ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => {
              const percent = getProgressPercent(course);
              const instructor = instructors[course.instructorId];

              return (
                <Card key={course.id} className="flex flex-col h-full transform hover:shadow-lg transition-all">
                   <div className="h-40 bg-gray-200 rounded-t-lg -mx-6 -mt-6 mb-4 overflow-hidden relative">
                      {course.thumbnailUrl ? (
                         <img src={course.thumbnailUrl} className="w-full h-full object-cover" />
                      ) : (
                         <div className="flex items-center justify-center h-full text-gray-400"><BookOpen size={40} /></div>
                      )}
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                         {percent}% Complete
                      </div>
                   </div>
                   
                   <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1">{course.title}</h3>
                   {instructor && (
                      <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                         <UserIcon size={12} /> {instructor.name}
                      </p>
                   )}
                   
                   <div className="mt-auto pt-4">
                      <Button 
                        onClick={() => setSelectedCourse(course)} 
                        className="w-full flex items-center justify-center gap-2"
                        variant={percent > 0 ? 'secondary' : 'primary'}
                      >
                        {percent === 0 ? (
                           <><Play size={16} /> Start Learning</>
                        ) : (
                           <><ArrowRight size={16} /> Resume Learning</>
                        )}
                      </Button>
                   </div>
                </Card>
              );
            })}
            </div>
        )}
      </div>
    );
  }

  // --- DASHBOARD (DEFAULT) ---
  return (
    <div className="space-y-6">
      {loading ? <Skeleton className="h-32 w-full rounded-lg" /> : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-primary-100 to-primary-50 border border-primary-200 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-primary-900">Welcome back, {user.name}!</h2>
            <div className="flex flex-wrap gap-4 mt-4">
               <div className="bg-white px-4 py-2 rounded shadow-sm">
                  <span className="block text-xs text-gray-500">Enrolled Courses</span>
                  <span className="text-xl font-bold text-primary-600">{courses.length}</span>
               </div>
               <div className="bg-white px-4 py-2 rounded shadow-sm">
                  <span className="block text-xs text-gray-500">Completed Lessons</span>
                  <span className="text-xl font-bold text-green-600">
                     {Object.values(progressMap).reduce((acc: number, list: string[]) => acc + (list?.length || 0), 0)}
                  </span>
               </div>
            </div>
          </div>
          
          <Card title="My Performance" className="flex flex-col justify-center items-center text-center">
             {performance.length > 0 ? (
                <div className="w-full">
                  <div className="flex items-center justify-center gap-2 mb-2 text-yellow-500">
                     <Trophy size={24} />
                     <span className="font-bold text-2xl">{Math.round(performance.reduce((acc, curr) => acc + (curr.score/curr.total), 0) / performance.length * 100)}%</span>
                  </div>
                  <p className="text-sm text-gray-500">Average Quiz Score</p>
                </div>
             ) : (
               <>
                 <Award className="text-gray-300 w-12 h-12 mb-2" />
                 <p className="text-gray-500">No quiz data yet.</p>
               </>
             )}
          </Card>
        </div>
      )}

      <h3 className="text-xl font-bold text-gray-800 mt-8">Browse Catalog</h3>
      {loading ? <Skeleton className="h-64 w-full" /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(availableCourses || []).map(course => {
             const instructor = instructors[course.instructorId];
             return (
                <Card key={course.id} className="flex flex-col h-full transform transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="h-48 rounded-t-lg -mx-6 -mt-6 mb-4 bg-gray-100 overflow-hidden relative">
                    {course.thumbnailUrl ? (
                       <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                       <div className="flex items-center justify-center h-full text-gray-300"><BookOpen size={48} /></div>
                    )}
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-gray-700">
                       ${course.price}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-1">{course.title}</h3>
                  {instructor && <p className="text-xs text-gray-500 mb-2">By {instructor.name}</p>}
                  <p className="text-gray-600 text-sm mb-4 flex-1 line-clamp-3">{course.description}</p>
                  <Button onClick={() => handleEnroll(course)} className="w-full mt-auto">Enroll Now</Button>
                </Card>
             );
          })}
          {availableCourses.length === 0 && <p className="text-gray-500">You have enrolled in all available courses!</p>}
        </div>
      )}
    </div>
  );
};
