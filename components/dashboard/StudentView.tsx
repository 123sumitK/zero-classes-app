
import React, { useState, useEffect } from 'react';
import { User, Course } from '../../types';
import { storageService } from '../../services/storage';
import { Button, Card, Skeleton, ProgressBar, Checkbox } from '../ui/Shared';
import { BookOpen, CheckCircle2, Circle } from 'lucide-react';

interface StudentViewProps {
  user: User;
  view: string;
  showToast: (m: string, t: any) => void;
}

export const StudentView: React.FC<StudentViewProps> = ({ user, view, showToast }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, string[]>>(user.progress || {});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    setLoading(true);
    // Refresh progress from user object in case it updated
    setProgressMap(user.progress || {});
    
    // Simulate network delay
    const timer = setTimeout(() => {
      const all = storageService.getCourses();
      // Need to re-fetch user to get latest progress if multiple components update it
      const latestUser = storageService.getUsers().find(u => u.id === user.id);
      if (latestUser) {
        setProgressMap(latestUser.progress || {});
      }

      setCourses(all.filter(c => user.enrolledCourseIds.includes(c.id)));
      setAvailableCourses(all.filter(c => !user.enrolledCourseIds.includes(c.id)));
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [user, view]);

  const handleEnroll = (course: Course) => {
    // Mock Payment
    const confirm = window.confirm(`Purchase "${course.title}" for $${course.price}?`);
    if (confirm) {
      storageService.enrollStudent(user.id, course.id);
      showToast('Payment successful! You are now enrolled.', 'success');
      // Refresh local state
      setCourses(prev => [...prev, course]);
      setAvailableCourses(prev => prev.filter(c => c.id !== course.id));
    }
  };

  const toggleMaterial = (courseId: string, materialId: string) => {
    try {
      const newProgress = storageService.toggleProgress(user.id, courseId, materialId);
      setProgressMap(newProgress);
    } catch (error) {
      showToast('Failed to update progress', 'error');
    }
  };

  const getProgressPercent = (course: Course) => {
    const completed = progressMap[course.id]?.length || 0;
    const total = course.materials.length;
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  if (view === 'schedule') {
    const mySchedules = courses.flatMap(c => c.schedules).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (loading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="border-l-4 border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-10 w-32" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Your Class Schedule</h2>
        {mySchedules.length === 0 ? (
           <p className="text-gray-500 bg-white p-8 rounded-lg shadow-sm text-center">No upcoming classes scheduled.</p>
        ) : (
          <div className="grid gap-4">
            {mySchedules.map(sch => (
              <Card key={sch.id} className="border-l-4 border-primary-500 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">{sch.topic}</h4>
                    <p className="text-gray-600">{sch.date} at {sch.time}</p>
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

  if (view === 'courses') {
    if (loading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid md:grid-cols-2 gap-6">
             {[1, 2].map(i => (
               <Card key={i} className="h-64 flex flex-col">
                 <Skeleton className="h-6 w-3/4 mb-4" />
                 <Skeleton className="h-4 w-full mb-2" />
                 <Skeleton className="h-4 w-2/3 mb-4" />
                 <Skeleton className="h-24 w-full rounded mb-4" />
                 <Skeleton className="h-10 w-full mt-auto" />
               </Card>
             ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">My Enrolled Courses</h2>
        {courses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-gray-500">You haven't enrolled in any courses yet.</p>
            </div>
        ) : (
            <div className="grid md:grid-cols-2 gap-6">
            {courses.map(course => {
              const percent = getProgressPercent(course);
              const completedIds = progressMap[course.id] || [];

              return (
                <Card key={course.id} title={course.title} className="flex flex-col h-full">
                  <div className="mb-4">
                     <div className="flex justify-between text-xs text-gray-600 mb-1">
                       <span>Progress</span>
                       <span className="font-bold">{percent}%</span>
                     </div>
                     <ProgressBar value={percent} />
                  </div>
                  
                  <p className="text-gray-600 mb-4 flex-1">{course.description}</p>
                  
                  <div className="space-y-2 bg-gray-50 p-3 rounded mb-4 border border-gray-100">
                      <h5 className="font-bold text-sm text-gray-700 border-b border-gray-200 pb-1 mb-2">Course Materials</h5>
                      {course.materials.length === 0 && <p className="text-xs text-gray-500 italic">No files uploaded yet.</p>}
                      {course.materials.map(m => {
                        const isCompleted = completedIds.includes(m.id);
                        return (
                          <div key={m.id} className="flex items-center justify-between gap-3 text-sm hover:bg-gray-100 p-1.5 rounded transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <Checkbox 
                                  checked={isCompleted} 
                                  onChange={() => toggleMaterial(course.id, m.id)}
                                  className="mt-0.5"
                                />
                                <span className={`truncate ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                  {m.title}
                                </span>
                              </div>
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium flex-shrink-0">
                                {m.type}
                              </span>
                          </div>
                        );
                      })}
                  </div>
                  <Button variant="outline" className="w-full mt-auto">Continue Learning</Button>
                </Card>
              );
            })}
            </div>
        )}
      </div>
    );
  }

  // Default Dashboard (Marketplace)
  return (
    <div className="space-y-6">
      {loading ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : (
        <div className="bg-gradient-to-r from-primary-100 to-primary-50 border border-primary-200 p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-primary-900">Welcome back, {user.name}!</h2>
          <p className="text-primary-700 mt-2">You have {courses.length} active courses and {courses.flatMap(c => c.schedules).length} upcoming classes.</p>
        </div>
      )}

      <h3 className="text-xl font-bold text-gray-800 mt-8">Available Courses</h3>
      {loading ? (
         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="h-96">
                <Skeleton className="h-32 w-full rounded-t-lg mb-4 -mx-6 -mt-6 w-[calc(100%+3rem)]" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
                <div className="mt-12 flex justify-between items-center">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </Card>
            ))}
         </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableCourses.map(course => (
            <Card key={course.id} className="flex flex-col h-full transform transition hover:-translate-y-1 hover:shadow-xl">
              <div className="h-32 bg-gray-200 rounded-t-lg -mx-6 -mt-6 mb-4 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <BookOpen className="text-gray-400 w-12 h-12" />
              </div>
              <h3 className="font-bold text-lg mb-2">{course.title}</h3>
              <p className="text-gray-600 text-sm mb-4 flex-1 line-clamp-3">{course.description}</p>
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                <span className="text-2xl font-bold text-green-600">${course.price}</span>
                <Button onClick={() => handleEnroll(course)}>Enroll Now</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};