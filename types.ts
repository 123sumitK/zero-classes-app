
export enum UserRole {
  STUDENT = 'STUDENT',
  INSTRUCTOR = 'INSTRUCTOR',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  enrolledCourseIds: string[]; // For students
  mobile?: string;
  password?: string; // Only for mock storage/auth handling
  progress?: Record<string, string[]>; // courseId -> array of completed material IDs
}

export interface CourseMaterial {
  id: string;
  title: string;
  type: 'PDF' | 'DOCX' | 'PPT' | 'OTHER';
  url: string; // Mock URL
  uploadedAt: string;
}

export interface ClassSchedule {
  id: string;
  courseId: string;
  topic: string;
  date: string;
  time: string;
  meetingUrl: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  price: number;
  materials: CourseMaterial[];
  schedules: ClassSchedule[];
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}