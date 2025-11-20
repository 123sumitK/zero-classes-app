
import React, { useState, useEffect } from 'react';
import { User, UserRole, Course } from '../../types';
import { storageService } from '../../services/storage';
import { Card, Skeleton, Button } from '../ui/Shared';
import { FileText, Download } from 'lucide-react';

export const ResourceView: React.FC<{ user: User }> = ({ user }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchResources = async () => {
      setLoading(true);
      try {
        const all = await storageService.getCourses();
        const safeAll = Array.isArray(all) ? all : [];
        
        if (!isMounted) return;
        
        if (user.role === UserRole.ADMIN) {
          setCourses(safeAll);
        } else if (user.role === UserRole.INSTRUCTOR) {
          setCourses(safeAll.filter(c => c.instructorId === user.id));
        } else {
          setCourses(safeAll.filter(c => user.enrolledCourseIds?.includes(c.id)));
        }
      } catch (error) {
        console.error("Failed to load resources", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchResources();
    return () => { isMounted = false; };
  }, [user]);

  const handleDownload = (url: string) => {
    if (!url || url === '#') {
        alert("File URL not available");
        return;
    }
    window.open(url, '_blank');
  };

  if (loading) return <div className="p-4"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r shadow-sm">
        <h2 className="text-xl font-bold text-blue-900">Shared Course Resources</h2>
        <p className="text-blue-700 text-sm">Access, download, and review materials for your courses.</p>
      </div>

      {(courses || []).length === 0 ? (
        <p className="text-center text-gray-500 py-10">No courses or materials found.</p>
      ) : (
        <div className="grid gap-6">
          {(courses || []).map(c => (
            <Card key={c.id} title={c.title}>
              <div className="space-y-3">
                {(!c.materials || c.materials.length === 0) ? (
                   <p className="text-sm text-gray-400 italic">No materials uploaded by instructor yet.</p>
                ) : (
                  c.materials.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded border border-gray-200 text-primary-500">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{m.title}</p>
                          <p className="text-xs text-gray-500">{new Date(m.uploadedAt).toLocaleDateString()} • {m.type}</p>
                        </div>
                      </div>
                      <Button variant="outline" className="text-xs py-1 px-3 h-8" onClick={() => handleDownload(m.url)}>
                        <Download size={14} className="mr-1 inline" /> Download
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
