
import { User, Course, UserRole, ClassSchedule, CourseMaterial } from '../types';

// Initial Seed Data
const SEED_USERS: User[] = [
  { id: 'u1', name: 'Admin User', email: 'admin@zero.com', role: UserRole.ADMIN, enrolledCourseIds: [], password: 'password123', mobile: '1234567890', progress: {} },
  { id: 'u2', name: 'Jane Instructor', email: 'teach@zero.com', role: UserRole.INSTRUCTOR, enrolledCourseIds: [], password: 'password123', mobile: '9876543210', progress: {} },
  { id: 'u3', name: 'John Student', email: 'student@zero.com', role: UserRole.STUDENT, enrolledCourseIds: ['c1'], password: 'password123', mobile: '5555555555', progress: { 'c1': ['m1'] } },
];

const SEED_COURSES: Course[] = [
  {
    id: 'c1',
    title: 'Introduction to React Patterns',
    description: 'Master the art of component composition and hooks.',
    instructorId: 'u2',
    price: 49.99,
    materials: [
      { id: 'm1', title: 'Week 1 Slides', type: 'PPT', url: '#', uploadedAt: new Date().toISOString() },
      { id: 'm2', title: 'Hooks Cheat Sheet', type: 'PDF', url: '#', uploadedAt: new Date().toISOString() }
    ],
    schedules: [
      { id: 's1', courseId: 'c1', topic: 'Hooks Deep Dive', date: '2024-11-20', time: '14:00', meetingUrl: 'https://meet.google.com/abc-defg-hij' }
    ]
  },
  {
    id: 'c2',
    title: 'Advanced Gemini Integration',
    description: 'Build AI-powered apps with Google GenAI SDK.',
    instructorId: 'u2',
    price: 79.99,
    materials: [],
    schedules: []
  }
];

const STORAGE_KEYS = {
  USERS: 'zc_users',
  COURSES: 'zc_courses',
  OTP: 'zc_temp_otps' // Temporary storage for mock OTPs
};

// Helper to initialize storage
const initStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.COURSES)) {
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(SEED_COURSES));
  }
};

initStorage();

export const storageService = {
  // --- AUTH & USER ---
  
  getUsers: (): User[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
  
  login: (email: string, password?: string): User | undefined => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    // PRODUCTION NOTE: In real backend, use bcrypt.compare(password, user.hash)
    return users.find((u: any) => u.email === email && u.password === password);
  },

  register: (user: Partial<User>): User => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    if (users.find((u: any) => u.email === user.email)) throw new Error('User already exists');
    
    const newUser = {
      ...user,
      id: Math.random().toString(36).substr(2, 9),
      enrolledCourseIds: [],
      progress: {}
    };
    
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return newUser as User;
  },

  updateUserRole: (userId: string, newRole: UserRole) => {
    const users = storageService.getUsers();
    const updated = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
  },

  toggleProgress: (userId: string, courseId: string, materialId: string): Record<string, string[]> => {
    const users = storageService.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) throw new Error('User not found');

    const user = users[userIndex];
    const currentProgress = user.progress || {};
    const courseProgress = currentProgress[courseId] || [];
    
    let newCourseProgress;
    if (courseProgress.includes(materialId)) {
      newCourseProgress = courseProgress.filter(id => id !== materialId);
    } else {
      newCourseProgress = [...courseProgress, materialId];
    }

    const newProgress = {
      ...currentProgress,
      [courseId]: newCourseProgress
    };

    users[userIndex] = { ...user, progress: newProgress };
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    
    return newProgress;
  },

  // --- MOCK OTP SYSTEM ---
  // PRODUCTION NOTE: Replace these with API calls to your backend (e.g., /api/send-otp)

  sendOTP: async (mobile: string): Promise<boolean> => {
    console.log(`[SMS GATEWAY] Sending OTP to ${mobile}...`);
    // Mock Generation: Always 1234 for demo, or random
    const code = '1234'; 
    const otps = JSON.parse(localStorage.getItem(STORAGE_KEYS.OTP) || '{}');
    otps[mobile] = code;
    localStorage.setItem(STORAGE_KEYS.OTP, JSON.stringify(otps));
    console.log(`[SMS GATEWAY] OTP for ${mobile} is: ${code}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    return true;
  },

  verifyOTP: async (mobile: string, code: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const otps = JSON.parse(localStorage.getItem(STORAGE_KEYS.OTP) || '{}');
    const validCode = otps[mobile];
    if (validCode && validCode === code) {
      delete otps[mobile];
      localStorage.setItem(STORAGE_KEYS.OTP, JSON.stringify(otps));
      return true;
    }
    return false;
  },

  // --- COURSES ---

  getCourses: (): Course[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES) || '[]'),

  addCourse: (course: Course) => {
    const courses = storageService.getCourses();
    courses.push(course);
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
  },

  updateCourse: (courseId: string, updates: Partial<Course>) => {
    const courses = storageService.getCourses();
    const updated = courses.map(c => c.id === courseId ? { ...c, ...updates } : c);
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(updated));
  },

  deleteCourse: (courseId: string) => {
    const courses = storageService.getCourses();
    const updated = courses.filter(c => c.id !== courseId);
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(updated));
  },

  enrollStudent: (userId: string, courseId: string) => {
    const users = storageService.getUsers();
    const updatedUsers = users.map(u => {
      if (u.id === userId && !u.enrolledCourseIds.includes(courseId)) {
        return { ...u, enrolledCourseIds: [...u.enrolledCourseIds, courseId] };
      }
      return u;
    });
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
  },

  // --- MATERIALS & SCHEDULES ---

  addMaterial: (courseId: string, material: CourseMaterial) => {
    const courses = storageService.getCourses();
    const updated = courses.map(c => c.id === courseId ? { ...c, materials: [...c.materials, material] } : c);
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(updated));
  },

  deleteMaterial: (courseId: string, materialId: string) => {
    const courses = storageService.getCourses();
    const updated = courses.map(c => {
      if (c.id === courseId) {
        return { ...c, materials: c.materials.filter(m => m.id !== materialId) };
      }
      return c;
    });
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(updated));
  },

  addSchedule: (courseId: string, schedule: ClassSchedule) => {
    const courses = storageService.getCourses();
    const updated = courses.map(c => c.id === courseId ? { ...c, schedules: [...c.schedules, schedule] } : c);
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(updated));
  },

  updateSchedule: (courseId: string, schedule: ClassSchedule) => {
    const courses = storageService.getCourses();
    const updated = courses.map(c => {
      if (c.id === courseId) {
         const sIdx = c.schedules.findIndex(s => s.id === schedule.id);
         if (sIdx > -1) {
             const newSchedules = [...c.schedules];
             newSchedules[sIdx] = schedule;
             return { ...c, schedules: newSchedules };
         }
      }
      return c;
    });
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(updated));
  },

  deleteSchedule: (courseId: string, scheduleId: string) => {
    const courses = storageService.getCourses();
    const updated = courses.map(c => {
      if (c.id === courseId) {
        return { ...c, schedules: c.schedules.filter(s => s.id !== scheduleId) };
      }
      return c;
    });
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(updated));
  }
};
