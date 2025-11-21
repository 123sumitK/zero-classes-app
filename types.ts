
export enum UserRole {
  STUDENT = 'STUDENT',
  INSTRUCTOR = 'INSTRUCTOR',
  ADMIN = 'ADMIN'
}

export type ThemeOption = 'bright' | 'light-bright' | 'dark';

export interface InstructorProfile {
  qualification: string;
  experience: string;
  bio: string;
}

export interface ActivityLog {
  action: string;
  date: string;
  details?: string;
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
}

export interface CourseMaterial {
  id: string;
  title: string;
  type: 'PDF' | 'DOCX' | 'PPT' | 'OTHER';
  url: string;
  uploadedAt: string;
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
  createdBy?: string;
  lastEditedBy?: string;
  updatedAt?: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
