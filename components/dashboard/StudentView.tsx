
import React, { useState, useEffect } from 'react';
import { User, Course, QuizResult } from '../../types';
import { storageService } from '../../services/storage';
import { Button, Card, Skeleton, ProgressBar, Checkbox, PageHeader, Badge } from '../ui/Shared';
import { BookOpen, Download, Award, Trophy, Clock, User as UserIcon, Play, ArrowRight, ArrowLeft, GraduationCap, FileText, CheckCircle, Sparkles } from 'lucide-react';
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

  const handleJoinClass = async (courseId: string, scheduleId: string, meetingUrl: string) => {
      try {
          await storageService.joinSchedule(courseId, scheduleId, user.id);
      } catch(e) { console.error('Tracking failed', e); }
      window.open(meetingUrl, '_blank');
  };

  // --- RENDER ---

  if (view === 'schedule') {
    const mySchedules = (courses || []).flatMap(c => c.schedules || []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return (
      <div>
        <PageHeader 
          title="Your Live Schedule" 
          description="Manage your upcoming classes, view agendas, and join meetings directly from here."
          theme="purple"
          icon={<Clock className="text-white" size={24} />}
          imageSrc="https://images.unsplash.com/photo-1506784365847-bbad939e9335?auto=format&fit=crop&q=80"
        />
        {mySchedules.length === 0 ? (
           <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock size={32} className="text-purple-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">No Classes Scheduled</h3>
              <p className="text-gray-500 mt-1">Check back later for upcoming live sessions.</p>
           </div>
        ) : (
          <div className="grid gap-4">
            {mySchedules.map(sch => (
              <Card key={sch.id} className="border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">{sch.topic}</h4>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <Badge color="blue"><Clock size={12} className="inline mr-1" /> {sch.date} at {sch.time}</Badge>
                      <Badge color="gray"><UserIcon size={12} className="inline mr-1" /> {sch.instructorName || 'Instructor'}</Badge>
                    </div>
                    {sch.agenda && <p className="text-gray-500 text-sm mt-3 bg-gray-50 p-2 rounded border border-gray-100">{sch.agenda}</p>}
                  </div>
                  <Button variant="accent" className="w-full md:w-auto" onClick={() => handleJoinClass(sch.courseId, sch.id, sch.meetingUrl)}>Join Live Class</Button>
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
          <button onClick={() => setSelectedCourse(null)} className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-medium transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 mb-4">
             <ArrowLeft size={18} /> Back to My Courses
          </button>

          {/* Course Header Banner */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
             <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                {selectedCourse.thumbnailUrl ? (
                   <img src={selectedCourse.thumbnailUrl} className="w-full md:w-48 h-32 object-cover rounded-lg shadow-lg border-2 border-white/20" />
                ) : (
                   <div className="w-full md:w-48 h-32 bg-white/20 rounded-lg flex items-center justify-center border-2 border-white/20"><BookOpen size={40} /></div>
                )}
                <div className="flex-1 w-full">
                   <h1 className="text-3xl font-extrabold mb-2">{selectedCourse.title}</h1>
                   <p className="text-indigo-100 mb-4 line-clamp-2 max-w-2xl">{selectedCourse.description}</p>
                   
                   <div className="flex flex-wrap items-center gap-6">
                       {instructor && (
                          <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                             {instructor.profileImage ? <img src={instructor.profileImage} className="w-6 h-6 rounded-full" /> : <UserIcon size={16} />}
                             <span className="text-sm font-medium">{instructor.name}</span>
                          </div>
                       )}
                       <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                          <Clock size={16} />
                          <span className="text-sm font-medium">{selectedCourse.materials?.length || 0} Lessons</span>
                       </div>
                   </div>

                   <div className="mt-6 max-w-md">
                      <div className="flex justify-between text-sm mb-1 text-indigo-100">
                         <span>Course Progress</span>
                         <span className="font-bold">{percent}%</span>
                      </div>
                      <ProgressBar value={percent} />
                   </div>
                </div>
             </div>
          </div>

          {/* Detail Tabs */}
          <div className="flex gap-2 border-b border-gray-200 overflow-x-auto pb-1">
             {['materials', 'quizzes', 'assignments', 'schedules'].map(tab => (
                <button
                   key={tab}
                   onClick={() => setActiveDetailTab(tab as any)}
                   className={`px-6 py-3 font-medium capitalize whitespace-nowrap transition-all rounded-t-lg border-t border-l border-r ${activeDetailTab === tab ? 'text-indigo-600 bg-white border-gray-200 border-b-transparent shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-transparent'}`}
                >
                   {tab}
                </button>
             ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px] bg-white rounded-b-lg rounded-tr-lg border border-t-0 border-gray-200 p-6 shadow-sm">
             {activeDetailTab === 'materials' && (
                <div className="space-y-3">
                      {(!selectedCourse.materials || selectedCourse.materials.length === 0) && (
                        <div className="text-center py-10 text-gray-500">
                            <FileText size={40} className="mx-auto mb-2 opacity-20" />
                            <p>No learning materials available yet.</p>
                        </div>
                      )}
                      {(selectedCourse.materials || []).map(m => {
                         const isCompleted = completedIds.includes(m.id);
                         return (
                            <div key={m.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all ${isCompleted ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100 hover:border-indigo-100 hover:shadow-md'}`}>
                               <div className="flex items-start gap-4">
                                  <div className="pt-1">
                                    <Checkbox checked={isCompleted} onChange={() => toggleMaterial(selectedCourse.id, m.id)} />
                                  </div>
                                  <div>
                                     <h4 className={`font-bold text-base ${isCompleted ? 'text-gray-500 line-through decoration-gray-400' : 'text-gray-800'}`}>{m.title}</h4>
                                     <span className="text-xs uppercase font-bold tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">{m.type}</span>
                                  </div>
                               </div>
                               <Button size="sm" variant={isCompleted ? "outline" : "accent"} onClick={() => handleDownload(m.url)} className="w-full sm:w-auto whitespace-nowrap">
                                  <Download size={16} className="mr-2 inline" /> Download
                               </Button>
                            </div>
                         );
                      })}
                </div>
             )}

             {activeDetailTab === 'quizzes' && (
                 <QuizManager user={user} courses={[selectedCourse]} courseIdFilter={selectedCourse.id} showToast={showToast} />
             )}

             {activeDetailTab === 'assignments' && (
                 <AssignmentManager user={user} courseId={selectedCourse.id} isInstructor={false} showToast={showToast} />
             )}

             {activeDetailTab === 'schedules' && (
                <div className="space-y-4">
                   {(selectedCourse.schedules || []).length === 0 && <p className="text-gray-500 italic text-center py-8">No live classes scheduled.</p>}
                   {(selectedCourse.schedules || []).map(sch => (
                      <div key={sch.id} className="flex flex-col md:flex-row justify-between items-center p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 gap-4">
                            <div>
                               <h4 className="font-bold text-lg text-indigo-900">{sch.topic}</h4>
                               <div className="flex gap-3 mt-2 text-sm text-blue-700">
                                  <span className="flex items-center gap-1"><Clock size={14} /> {sch.date}</span>
                                  <span className="flex items-center gap-1"><Clock size={14} /> {sch.time}</span>
                               </div>
                               {sch.agenda && <p className="text-xs text-blue-600 mt-2 italic">{sch.agenda}</p>}
                            </div>
                            <Button variant="accent" className="w-full md:w-auto" onClick={() => handleJoinClass(selectedCourse.id, sch.id, sch.meetingUrl)}>Join Class</Button>
                      </div>
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
      <div>
        <PageHeader 
          title="My Learning Journey" 
          description="Pick up where you left off or start a new adventure. Your enrolled courses are listed here."
          theme="amber"
          icon={<GraduationCap className="text-white" size={24} />}
          imageSrc="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80"
        />
        
        {(courses || []).length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-10 w-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">No enrollments yet</h3>
                <p className="mt-2 text-gray-500 max-w-md mx-auto">You haven't enrolled in any courses. Explore our catalog to find your next skill.</p>
                <Button onClick={() => {}} className="mt-6 px-8" variant="accent">Browse Catalog</Button>
            </div>
        ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map(course => {
              const percent = getProgressPercent(course);
              const instructor = instructors[course.instructorId];

              return (
                <div key={course.id} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 flex flex-col h-full overflow-hidden border border-gray-100 group">
                   <div className="h-48 bg-gray-200 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                      {course.thumbnailUrl ? (
                         <img src={course.thumbnailUrl} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                         <div className="flex items-center justify-center h-full text-gray-400 bg-gray-100"><BookOpen size={40} /></div>
                      )}
                      <div className="absolute bottom-3 left-4 z-20 flex items-center gap-2 text-white text-xs font-medium">
                         <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden">
                            {instructor?.profileImage ? <img src={instructor.profileImage} className="w-full h-full object-cover" /> : <div className="bg-gray-500 w-full h-full"></div>}
                         </div>
                         <span>{instructor?.name || 'Instructor'}</span>
                      </div>
                   </div>
                   
                   <div className="p-5 flex-1 flex flex-col">
                       <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">{course.title}</h3>
                          {percent === 100 && <CheckCircle className="text-green-500 w-5 h-5" />}
                       </div>
                       
                       <div className="mb-4">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                             <span>Progress</span>
                             <span>{percent}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                             <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000" style={{width: `${percent}%`}}></div>
                          </div>
                       </div>
                       
                       <div className="mt-auto">
                          <Button 
                            onClick={() => setSelectedCourse(course)} 
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl"
                            variant={percent > 0 ? 'accent' : 'primary'} // Use Accent (Purple) for Resume
                          >
                            {percent === 0 ? (
                               <><Play size={18} /> Start Learning</>
                            ) : (
                               <><ArrowRight size={18} /> Resume Learning</>
                            )}
                          </Button>
                       </div>
                   </div>
                </div>
              );
            })}
            </div>
        )}
      </div>
    );
  }

  // --- DASHBOARD (DEFAULT) ---
  return (
    <div>
      <PageHeader 
          title={`Welcome back, ${user.name}!`}
          description="Track your progress, upcoming deadlines, and new learning opportunities all in one place."
          theme="blue"
          icon={<UserIcon className="text-white" size={24} />}
          imageSrc="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80"
      />

      {loading ? <Skeleton className="h-32 w-full rounded-lg" /> : (
        <div className="grid md:grid-cols-3 gap-6 mb-12">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
               <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                   <BookOpen size={24} />
               </div>
               <div>
                   <p className="text-gray-500 text-sm font-medium">Enrolled Courses</p>
                   <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
               </div>
           </div>
           
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
               <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                   <CheckCircle size={24} />
               </div>
               <div>
                   <p className="text-gray-500 text-sm font-medium">Completed Lessons</p>
                   <p className="text-2xl font-bold text-gray-900">{Object.values(progressMap).reduce((acc: number, list: string[]) => acc + (list?.length || 0), 0)}</p>
               </div>
           </div>

           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
               <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600">
                   <Trophy size={24} />
               </div>
               <div>
                   <p className="text-gray-500 text-sm font-medium">Avg. Quiz Score</p>
                   <p className="text-2xl font-bold text-gray-900">
                      {performance.length > 0 ? Math.round(performance.reduce((acc, curr) => acc + (curr.score/curr.total), 0) / performance.length * 100) : 0}%
                   </p>
               </div>
           </div>
        </div>
      )}

      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
         <Sparkles className="text-amber-500" /> Explore New Courses
      </h3>
      
      {loading ? <Skeleton className="h-64 w-full" /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(availableCourses || []).map(course => {
             const instructor = instructors[course.instructorId];
             return (
                <div key={course.id} className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 flex flex-col h-full overflow-hidden">
                  <div className="h-52 bg-gray-100 relative overflow-hidden">
                    {course.thumbnailUrl ? (
                       <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                       <div className="flex items-center justify-center h-full text-gray-300"><BookOpen size={48} /></div>
                    )}
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-sm font-extrabold text-gray-800 shadow-sm">
                       ${course.price}
                    </div>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                      <Badge color="blue" className="w-fit mb-2">{course.materials?.length || 0} Modules</Badge>
                      <h3 className="font-bold text-xl text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{course.title}</h3>
                      <p className="text-gray-500 text-sm mb-4 flex-1 line-clamp-3 leading-relaxed">{course.description}</p>
                      
                      <div className="flex items-center gap-2 mb-6 border-t pt-4 border-gray-50">
                         <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                            {instructor?.profileImage ? <img src={instructor.profileImage} className="w-full h-full object-cover" /> : null}
                         </div>
                         <div>
                            <p className="text-xs text-gray-500">Instructor</p>
                            <p className="text-sm font-medium text-gray-800">{instructor?.name || 'Unknown'}</p>
                         </div>
                      </div>

                      <Button onClick={() => handleEnroll(course)} className="w-full rounded-xl py-3 shadow-indigo-100 shadow-lg" variant="accent">Enroll Now</Button>
                  </div>
                </div>
             );
          })}
          {availableCourses.length === 0 && (
             <div className="col-span-full text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-500 font-medium">🎉 You have enrolled in all available courses!</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
};
