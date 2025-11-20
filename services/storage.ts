
import { User, Course, UserRole, ClassSchedule, CourseMaterial } from '../types';

const getApiUrl = () => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
      // @ts-ignore
      return import.meta.env.VITE_API_URL;
    }
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) {
      return process.env.VITE_API_URL;
    }
  } catch (e) {}
  return 'http://127.0.0.1:3000/api';
};

const API_URL = getApiUrl();

const formatUser = (u: any): User => ({
  ...u,
  id: u._id || u.id,
  enrolledCourseIds: Array.isArray(u.enrolledCourses) ? u.enrolledCourses.map((id: any) => String(id)) : [],
  progress: u.progress || {},
  countryCode: u.countryCode || '+91'
});

const formatCourse = (c: any): Course => ({ 
  ...c, 
  id: c._id || c.id,
  materials: Array.isArray(c.materials) ? c.materials : [],
  schedules: Array.isArray(c.schedules) ? c.schedules : []
});

export const storageService = {
  // --- AUTH & OTP ---
  sendOTP: async (target: string, type: 'email' | 'mobile'): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, type })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return true;
    } catch (error) {
      console.error('Send OTP Error:', error);
      throw error;
    }
  },

  verifyOTP: async (target: string, code: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, code })
      });
      const data = await res.json();
      if (!res.ok) return false;
      return data.success;
    } catch (error) { return false; }
  },

  login: async (email: string, password?: string): Promise<User> => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return formatUser(data);
  },

  register: async (user: Partial<User>): Promise<User> => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return formatUser(data);
  },

  // --- DATA ---
  getUser: async (userId: string): Promise<User> => {
    const res = await fetch(`${API_URL}/users/${userId}`);
    const data = await res.json();
    if (!res.ok) throw new Error('Failed to fetch user');
    return formatUser(data);
  },

  getUsers: async (): Promise<User[]> => {
    try {
      const res = await fetch(`${API_URL}/users`);
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map(formatUser);
    } catch (e) { return []; }
  },

  getCourses: async (): Promise<Course[]> => {
    try {
      const res = await fetch(`${API_URL}/courses`);
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map(formatCourse);
    } catch (e) { return []; }
  },

  // --- CLOUDINARY UPLOAD ---
  uploadToCloudinary: async (file: File, cloudName: string, preset: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', preset);
    
    // Determine resource type manually to prevent PDF 401 errors
    // Images => 'image'
    // PDFs, Docs, Zips => 'raw'
    const isImage = file.type.startsWith('image/');
    const resourceType = isImage ? 'image' : 'raw';

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
      method: 'POST',
      body: formData
    });
    
    const data = await res.json();
    if (!res.ok) {
        console.error("Cloudinary Error Details:", data);
        throw new Error(data.error?.message || 'Cloudinary upload failed');
    }
    console.log("Uploaded File URL:", data.secure_url);
    return data.secure_url;
  },

  // --- MODIFIERS ---
  addCourse: async (course: Course): Promise<Course> => {
    const { id, ...courseData } = course;
    const res = await fetch(`${API_URL}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(courseData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create course');
    return formatCourse(data);
  },

  updateCourse: async (courseId: string, updates: Partial<Course>) => {
    await fetch(`${API_URL}/courses/${courseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  },

  deleteCourse: async (courseId: string) => {
    await fetch(`${API_URL}/courses/${courseId}`, { method: 'DELETE' });
  },

  updateUserRole: async (userId: string, newRole: UserRole) => {
    await fetch(`${API_URL}/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });
  },

  // --- MATERIALS & SCHEDULES ---
  addMaterial: async (courseId: string, material: CourseMaterial) => {
    const payload = {
      ...material,
      uploadedAt: typeof material.uploadedAt === 'string' ? material.uploadedAt : new Date().toISOString()
    };
    try {
        const res = await fetch(`${API_URL}/courses/${courseId}/materials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.status === 404) throw new Error("Backend route not found (404). Did you restart the server?");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Upload failed: ${res.statusText}`);
    } catch (e: any) {
        console.error(e);
        throw e;
    }
  },

  deleteMaterial: async (courseId: string, materialId: string) => {
    await fetch(`${API_URL}/courses/${courseId}/materials/${materialId}`, { method: 'DELETE' });
  },

  addSchedule: async (courseId: string, schedule: ClassSchedule) => {
    await fetch(`${API_URL}/courses/${courseId}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedule)
    });
  },

  updateSchedule: async (courseId: string, schedule: ClassSchedule) => {
    await fetch(`${API_URL}/courses/${courseId}/schedules/${schedule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedule)
    });
  },

  deleteSchedule: async (courseId: string, scheduleId: string) => {
    await fetch(`${API_URL}/courses/${courseId}/schedules/${scheduleId}`, { method: 'DELETE' });
  },

  enrollStudent: async (userId: string, courseId: string): Promise<User> => {
    const res = await fetch(`${API_URL}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, courseId })
    });
    if (!res.ok) throw new Error("Enrollment failed");
    // Return the updated user object from the server
    const updatedUser = await res.json();
    return formatUser(updatedUser);
  },
  
  toggleProgress: async (userId: string, courseId: string, materialId: string): Promise<Record<string, string[]>> => {
    const res = await fetch(`${API_URL}/users/${userId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, materialId })
    });
    if (!res.ok) throw new Error("Progress update failed");
    return await res.json();
  }
};
