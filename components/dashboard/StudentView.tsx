
import React, { useState, useEffect } from 'react';
import { User, Course } from '../../types';
import { storageService } from '../../services/storage';
import { Button, Card, Skeleton, ProgressBar, Checkbox } from '../ui/Shared';
import { BookOpen, Download } from 'lucide-react';

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
  
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const freshUser = await storageService.getUser(user.id);
        if (isMounted) setProgressMap(freshUser.progress || {});

        const allCourses = await storageService.getCourses();
        const safeAllCourses = Array.isArray(allCourses) ? allCourses : [];

        if (isMounted) {
           setCourses(safeAllCourses.filter(c => freshUser.enrolledCourseIds?.includes(c.id)));
           setAvailableCourses(safeAllCourses.filter(c => !freshUser.enrolledCourseIds?.includes(c.id)));
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

  const handleContinueLearning = (courseId: string) => {
    const element = document.getElementById(`course-${courseId}`);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

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
            <div className="grid md:grid-cols-2 gap-6">
            {courses.map(course => {
              const percent = getProgressPercent(course);
              const completedIds = progressMap[course.id] || [];

              return (
                <Card key={course.id} title={course.title} className="flex flex-col h-full" id={`course-${course.id}`}>
                  <div className="mb-4">
                     <div className="flex justify-between text-xs text-gray-600 mb-1">
                       <span>Progress</span>
                       <span className="font-bold">{percent}%</span>
                     </div>
                     <ProgressBar value={percent} />
                  </div>
                  
                  <p className="text-gray-600 mb-4 flex-1 line-clamp-3">{course.description}</p>
                  
                  <div className="space-y-2 bg-gray-50 p-3 rounded mb-4 border border-gray-100 max-h-60 overflow-y-auto">
                      <h5 className="font-bold text-sm text-gray-700 border-b border-gray-200 pb-1 mb-2">Course Materials</h5>
                      {(!course.materials || course.materials.length === 0) && <p className="text-xs text-gray-500 italic">No files uploaded yet.</p>}
                      {(course.materials || []).map(m => {
                        const isCompleted = completedIds.includes(m.id);
                        return (
                          <div key={m.id} className="flex items-center justify-between gap-2 text-sm hover:bg-gray-100 p-2 rounded transition-colors">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Checkbox 
                                  checked={isCompleted} 
                                  onChange={() => toggleMaterial(course.id, m.id)}
                                  className="mt-0.5"
                                />
                                <span 
                                  className={`truncate cursor-pointer hover:text-primary-600 ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                                  onClick={() => handleDownload(m.url)}
                                >
                                  {m.title}
                                </span>
                              </div>
                              <button 
                                onClick={() => handleDownload(m.url)}
                                className="text-gray-400 hover:text-primary-600"
                                title="Download"
                              >
                                <Download size={16} />
                              </button>
                          </div>
                        );
                      })}
                  </div>
                  <Button variant="outline" className="w-full mt-auto" onClick={() => handleContinueLearning(course.id)}>
                    Continue Learning
                  </Button>
                </Card>
              );
            })}
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : (
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
      )}

      <h3 className="text-xl font-bold text-gray-800 mt-8">Browse Catalog</h3>
      {loading ? <Skeleton className="h-64 w-full" /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(availableCourses || []).map(course => (
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
          {availableCourses.length === 0 && <p className="text-gray-500">You have enrolled in all available courses!</p>}
        </div>
      )}
    </div>
  );
};
