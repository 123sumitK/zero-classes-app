
import { User, Course, UserRole, ClassSchedule, CourseMaterial, Quiz, QuizResult, Assignment, Submission, PlatformSettings } from '../types';

const getApiUrl = () => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
      // @ts-ignore
      return import.meta.env.VITE_API_URL;
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
  countryCode: u.countryCode || '+91',
  theme: u.theme || 'bright',
  instructorProfile: u.instructorProfile || {},
  activityLog: Array.isArray(u.activityLog) ? u.activityLog : []
});

const formatCourse = (c: any): Course => ({ 
  ...c, 
  id: c._id || c.id,
  materials: Array.isArray(c.materials) ? c.materials : [],
  schedules: Array.isArray(c.schedules) ? c.schedules : []
});

export const storageService = {
  // --- SETTINGS ---
  getPlatformSettings: async (): Promise<PlatformSettings> => {
    try {
        const res = await fetch(`${API_URL}/settings`);
        return await res.json();
    } catch(e) { return { copyrightText: '', version: '', socialLinks: {} } as PlatformSettings; }
  },
  updatePlatformSettings: async (settings: Partial<PlatformSettings>) => {
    await fetch(`${API_URL}/settings`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(settings) });
  },

  // --- AUTH ---
  sendOTP: async (target: string, type: 'email' | 'mobile') => {
    const res = await fetch(`${API_URL}/auth/send-otp`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ target, type }) });
    if (!res.ok) throw new Error((await res.json()).error);
    return true;
  },
  verifyOTP: async (target: string, code: string) => {
    const res = await fetch(`${API_URL}/auth/verify-otp`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ target, code }) });
    return res.ok ? (await res.json()).success : false;
  },
  login: async (email: string, password?: string) => {
    const res = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email, password }) });
    if (!res.ok) throw new Error((await res.json()).error);
    return formatUser(await res.json());
  },
  register: async (user: Partial<User>) => {
    const res = await fetch(`${API_URL}/auth/register`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(user) });
    if (!res.ok) throw new Error((await res.json()).error);
    return formatUser(await res.json());
  },

  // --- USERS ---
  getUser: async (id: string) => formatUser(await (await fetch(`${API_URL}/users/${id}`)).json()),
  getUsers: async () => {
    const res = await fetch(`${API_URL}/users`);
    const data = await res.json();
    return Array.isArray(data) ? data.map(formatUser) : [];
  },
  updateUser: async (id: string, updates: Partial<User>) => {
    const res = await fetch(`${API_URL}/users/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(updates) });
    return formatUser(await res.json());
  },
  updateUserRole: async (userId: string, role: UserRole) => {
    await fetch(`${API_URL}/users/${userId}/role`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ role }) });
  },

  // --- COURSES ---
  getCourses: async () => {
    const res = await fetch(`${API_URL}/courses`);
    const data = await res.json();
    return Array.isArray(data) ? data.map(formatCourse) : [];
  },
  addCourse: async (course: Omit<Course, 'id'>, userName?: string) => {
    const payload = { ...course, createdBy: userName };
    const res = await fetch(`${API_URL}/courses`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Failed to create course');
    return formatCourse(await res.json());
  },
  updateCourse: async (id: string, updates: Partial<Course>, userName?: string) => {
    const { id: _id, ...cleanUpdates } = updates as any;
    const payload = { ...cleanUpdates, lastEditedBy: userName };
    await fetch(`${API_URL}/courses/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
  },
  deleteCourse: async (id: string) => { await fetch(`${API_URL}/courses/${id}`, { method: 'DELETE' }); },
  enrollStudent: async (userId: string, courseId: string) => formatUser(await (await fetch(`${API_URL}/enroll`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ userId, courseId }) })).json()),

  // --- UPLOAD ---
  uploadToCloudinary: async (file: File, cloudName: string, preset: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', preset);
    
    const isImage = file.type.startsWith('image/');
    const resourceType = isImage ? 'image' : 'raw';
    
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) {
        console.error('Cloudinary Error Details:', data);
        throw new Error(data.error?.message || 'Upload failed');
    }
    return data.secure_url;
  },

  // --- MATERIALS & SCHEDULES ---
  addMaterial: async (cid: string, mat: CourseMaterial) => {
    const safeMat = { ...mat, uploadedAt: new Date().toISOString() };
    const res = await fetch(`${API_URL}/courses/${cid}/materials`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(safeMat) });
    if (!res.ok) throw new Error((await res.text()) || 'Failed to upload');
  },
  deleteMaterial: async (cid: string, mid: string) => {
    await fetch(`${API_URL}/courses/${cid}/materials/${mid}`, { method: 'DELETE' });
  },
  addSchedule: async (cid: string, sch: ClassSchedule) => {
    await fetch(`${API_URL}/courses/${cid}/schedules`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(sch) });
  },
  updateSchedule: async (cid: string, sch: ClassSchedule) => {
    await fetch(`${API_URL}/courses/${cid}/schedules/${sch.id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(sch) });
  },
  deleteSchedule: async (cid: string, sid: string) => {
    await fetch(`${API_URL}/courses/${cid}/schedules/${sid}`, { method: 'DELETE' });
  },
  joinSchedule: async (cid: string, sid: string, studentId: string) => {
      await fetch(`${API_URL}/courses/${cid}/schedules/${sid}/join`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ studentId }) });
  },
  toggleProgress: async (uid: string, cid: string, mid: string) => {
    const res = await fetch(`${API_URL}/users/${uid}/progress`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ courseId: cid, materialId: mid }) });
    return await res.json();
  },

  // --- QUIZ SYSTEM ---
  getQuizzes: async (): Promise<Quiz[]> => {
    try {
        const res = await fetch(`${API_URL}/quizzes`);
        const data = await res.json();
        return Array.isArray(data) ? data.map((q: any) => ({...q, id: q._id || q.id})) : [];
    } catch(e) { return []; }
  },
  addQuiz: async (quiz: Partial<Quiz>, userName?: string) => {
    const payload = { ...quiz, createdBy: userName };
    await fetch(`${API_URL}/quizzes`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
  },
  deleteQuiz: async (id: string) => {
    await fetch(`${API_URL}/quizzes/${id}`, { method: 'DELETE' });
  },
  submitQuizResult: async (result: Partial<QuizResult>) => {
    await fetch(`${API_URL}/results`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(result) });
  },
  getStudentResults: async (studentId: string): Promise<QuizResult[]> => {
    try {
        const res = await fetch(`${API_URL}/results/${studentId}`);
        return await res.json();
    } catch(e) { return []; }
  },

  // --- ASSIGNMENTS ---
  getAssignments: async (courseId: string): Promise<Assignment[]> => {
    try {
      const res = await fetch(`${API_URL}/assignments/${courseId}`);
      const data = await res.json();
      return Array.isArray(data) ? data.map((a: any) => ({...a, id: a._id || a.id})) : [];
    } catch(e) { return []; }
  },
  addAssignment: async (assign: Partial<Assignment>, userName?: string) => {
    const payload = { ...assign, createdBy: userName };
    await fetch(`${API_URL}/assignments`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
  },
  deleteAssignment: async (id: string) => {
    await fetch(`${API_URL}/assignments/${id}`, { method: 'DELETE' });
  },
  getSubmissions: async (assignmentId: string): Promise<Submission[]> => {
     try {
      const res = await fetch(`${API_URL}/submissions/${assignmentId}`);
      const data = await res.json();
      return Array.isArray(data) ? data.map((s: any) => ({...s, id: s._id || s.id})) : [];
    } catch(e) { return []; }
  },
  submitAssignment: async (sub: Partial<Submission>) => {
    await fetch(`${API_URL}/submissions`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(sub) });
  },
  gradeSubmission: async (id: string, grade: number, feedback: string) => {
    await fetch(`${API_URL}/submissions/${id}/grade`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ grade, feedback }) });
  },
  reactToSubmission: async (id: string, reaction: string) => {
    await fetch(`${API_URL}/submissions/${id}/react`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ reaction }) });
  }
};
