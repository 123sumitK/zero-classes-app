
/// <reference types="vite/client" />

import { User, Course, UserRole, ClassSchedule, CourseMaterial } from '../types';

// API CONFIGURATION
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
  // Use explicit 127.0.0.1 to avoid node localhost resolution issues
  return 'http://127.0.0.1:3000/api';
};

const API_URL = getApiUrl();

// Helper: Format User from DB to Frontend
const formatUser = (u: any): User => ({
  ...u,
  id: u._id || u.id,
  // Ensure enrolledCourses (DB) is mapped to enrolledCourseIds (Frontend) and is always an array
  enrolledCourseIds: Array.isArray(u.enrolledCourses) ? u.enrolledCourses.map((id: any) => String(id)) : [],
  progress: u.progress || {}
});

// Helper: Format Course from DB to Frontend
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

  // --- DATA ACCESS (Defensive) ---

  getUsers: async (): Promise<User[]> => {
    try {
      const res = await fetch(`${API_URL}/users`);
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map(formatUser);
    } catch (e) { 
      console.error("Get Users Failed", e);
      return []; 
    }
  },

  getCourses: async (): Promise<Course[]> => {
    try {
      const res = await fetch(`${API_URL}/courses`);
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map(formatCourse);
    } catch (e) { 
      console.error("Get Courses Failed", e);
      return []; 
    }
  },

  // --- MODIFIERS ---

  updateUserRole: async (userId: string, newRole: UserRole) => {
    await fetch(`${API_URL}/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });
  },

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
    const res = await fetch(`${API_URL}/courses/${courseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update course');
  },

  deleteCourse: async (courseId: string) => {
    await fetch(`${API_URL}/courses/${courseId}`, { method: 'DELETE' });
  },

  // --- ATOMIC SUB-DOCUMENT HANDLERS ---
  
  addMaterial: async (courseId: string, material: CourseMaterial) => {
    // Ensure uploadedAt is a string
    const payload = {
      ...material,
      uploadedAt: typeof material.uploadedAt === 'string' ? material.uploadedAt : new Date().toISOString()
    };
    
    const res = await fetch(`${API_URL}/courses/${courseId}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      console.error("Server Upload Error:", data);
      throw new Error(data.error || `Server error ${res.status}: Failed to upload material`);
    }
  },

  deleteMaterial: async (courseId: string, materialId: string) => {
    const res = await fetch(`${API_URL}/courses/${courseId}/materials/${materialId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error("Failed to delete material");
  },

  addSchedule: async (courseId: string, schedule: ClassSchedule) => {
    const res = await fetch(`${API_URL}/courses/${courseId}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedule)
    });
    if (!res.ok) throw new Error("Failed to add schedule");
  },

  updateSchedule: async (courseId: string, schedule: ClassSchedule) => {
    const res = await fetch(`${API_URL}/courses/${courseId}/schedules/${schedule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedule)
    });
    if (!res.ok) throw new Error("Failed to update schedule");
  },

  deleteSchedule: async (courseId: string, scheduleId: string) => {
    const res = await fetch(`${API_URL}/courses/${courseId}/schedules/${scheduleId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error("Failed to delete schedule");
  },

  enrollStudent: async (userId: string, courseId: string) => {
    const res = await fetch(`${API_URL}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, courseId })
    });
    if (!res.ok) throw new Error("Enrollment failed");
  },
  
  toggleProgress: (userId: string, courseId: string, materialId: string): any => {
     // Placeholder for future progress tracking API
     return {};
  }
};
