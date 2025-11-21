
export enum UserRole {
  STUDENT = 'STUDENT',
  INSTRUCTOR = 'INSTRUCTOR',
  // Admin Roles
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN', // General Admin
  CONTENT_MGR = 'CONTENT_MGR',
  FINANCE = 'FINANCE',
  SUPPORT = 'SUPPORT',
  ANALYTICS = 'ANALYTICS'
}

export type ThemeOption = 'bright' | 'light-bright' | 'dark';

export const ROLE_PERMISSIONS = {
  [UserRole.SUPER_ADMIN]: { users: ['view','edit','delete'], courses: ['create','publish','approve'], finance: ['view','refund','payout'], support: ['view','reply'], settings: ['edit'], logs: ['view'] },
  [UserRole.ADMIN]:       { users: ['view','edit'], courses: ['create','publish','approve'], finance: ['view','refund'], support: ['view','reply'], settings: ['view'], logs: ['view'] },
  [UserRole.CONTENT_MGR]: { users: ['view','edit'], courses: ['create','publish','approve'], finance: [], support: [], settings: [], logs: [] },
  [UserRole.INSTRUCTOR]:  { users: ['view'], courses: ['create'], finance: [], support: [], settings: [], logs: [] }, // Limited view
  [UserRole.FINANCE]:     { users: ['view'], courses: [], finance: ['view','refund','payout'], support: [], settings: [], logs: [] },
  [UserRole.SUPPORT]:     { users: ['view'], courses: [], finance: [], support: ['view','reply'], settings: [], logs: [] },
  [UserRole.ANALYTICS]:   { users: ['view'], courses: [], finance: ['view'], support: [], settings: [], logs: [] },
  [UserRole.STUDENT]:     { users: [], courses: [], finance: [], support: [], settings: [], logs: [] }
};

export interface PlatformSettings {
  copyrightText: string;
  version: string;
  socialLinks: {
    twitter?: string;
    facebook?: string;
    linkedin?: string;
    instagram?: string;
  };
}

export interface InstructorProfile {
  qualification: string;
  experience: string;
  bio: string;
}

export interface ActivityLog {
  action: string;
  date: string;
  details?: string;
  ip?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  enrolledCourseIds: string[]; // For students
  mobile?: string;
  password?: string; 
  progress?: Record<string, string[]>; 
  profileImage?: string;
  theme?: ThemeOption;
  countryCode?: string;
  instructorProfile?: InstructorProfile;
  activityLog?: ActivityLog[];
  mfaEnabled?: boolean;
  lastLogin?: string;
}

export interface CourseMaterial {
  id: string;
  title: string;
  type: 'PDF' | 'DOCX' | 'PPT' | 'OTHER';
  url: string;
  uploadedAt: string;
}

export interface AttendanceRecord {
  studentId: string;
  joinedAt: string;
}

export interface ClassSchedule {
  id: string;
  courseId: string;
  topic: string;
  agenda?: string; 
  date: string;
  time: string;
  meetingUrl: string;
  instructorName?: string; 
  attendance?: AttendanceRecord[]; 
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  timeLimit: number; // in minutes
  questions: Question[];
  createdBy?: string;
  lastEditedBy?: string;
  updatedAt?: string;
}

export interface QuizResult {
  id: string;
  quizId: string;
  studentId: string;
  score: number;
  total: number;
  date: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueDate?: string;
  createdBy?: string;
  lastEditedBy?: string;
  updatedAt?: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  fileUrl: string;
  submittedAt: string;
  grade?: number;
  feedback?: string;
  studentReaction?: string; 
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  price: number;
  thumbnailUrl?: string;
  materials: CourseMaterial[];
  schedules: ClassSchedule[];
  status: 'draft' | 'pending' | 'published'; // Added status
  createdBy?: string;
  lastEditedBy?: string;
  updatedAt?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  message: string;
  status: 'open' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface DashboardStats {
  activeStudents: number;
  newSignups24h: number;
  totalRevenue: number;
  revenueMTD: number;
  pendingApprovals: number;
  liveClassesNow: number;
  openTickets: number;
  revenueTrend: number[]; // Last 7 days
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
