import React, { useState, useEffect } from 'react';
import { User, UserRole, Course } from '../../types';
import { storageService } from '../../services/storage';
import { Card, Skeleton, Button, PageHeader } from '../ui/Shared';
import { FileText, Download, FolderOpen } from 'lucide-react';

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
    <div>
      <PageHeader 
        title="Shared Resource Library" 
        description="Access downloadable materials, lecture notes, and reference documents from your courses."
        theme="blue"
        icon={<FolderOpen className="text-white" size={24} />}
        imageSrc="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80"
      />

      {(courses || []).length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
            <FolderOpen className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No resources available.</p>
        </div>
      ) : (
        <div className="grid gap-8">
          {(courses || []).map(c => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                 <h3 className="font-bold text-lg text-gray-800">{c.title}</h3>
                 <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">{c.materials?.length || 0} Files</span>
              </div>
              
              <div className="p-6">
                <div className="grid gap-3">
                {(!c.materials || c.materials.length === 0) ? (
                   <p className="text-sm text-gray-400 italic">No materials uploaded by instructor yet.</p>
                ) : (
                  c.materials.map(m => (
                    <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all gap-4 group">
                      <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-sm mb-1">{m.title}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                             <span className="uppercase bg-gray-100 px-1.5 py-0.5 rounded font-bold">{m.type}</span>
                             <span>• {new Date(m.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full sm:w-auto whitespace-nowrap text-xs" onClick={() => handleDownload(m.url)}>
                        <Download size={14} className="mr-2 inline" /> Download
                      </Button>
                    </div>
                  ))
                )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};