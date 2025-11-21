
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://127.0.0.1:5173',
    /^https:\/\/.*\.vercel\.app$/
  ],
  credentials: true
}));
app.use(express.json());

// --- CONFIGURATION ---
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'zero-admin-secret-123'; 

// --- DATABASE CONNECTION ---
const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/zero-classes';
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB Connected Successfully');
    seedAdmin();
    seedSettings();
  } catch (err) {
    console.error('❌ MongoDB Critical Connection Error:', err.message);
  }
};

mongoose.connection.on('disconnected', () => console.log('⚠️ MongoDB Disconnected'));
mongoose.connection.on('error', (err) => console.error('💥 MongoDB Error:', err));

// --- SCHEMAS ---
const SettingsSchema = new mongoose.Schema({
  type: { type: String, default: 'general', unique: true },
  copyrightText: String,
  version: String,
  socialLinks: {
    twitter: String,
    facebook: String,
    linkedin: String,
    instagram: String
  }
});

const MaterialSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String, required: true },
  url: { type: String, default: '#' },
  uploadedAt: { type: String, required: true } 
}, { _id: false }); 

const AttendanceSchema = new mongoose.Schema({
  studentId: String,
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const ScheduleSchema = new mongoose.Schema({
  id: { type: String, required: true },
  courseId: { type: String, required: true },
  topic: { type: String, required: true },
  agenda: String, 
  date: { type: String, required: true },
  time: { type: String, required: true },
  meetingUrl: { type: String, default: '' },
  instructorName: String,
  attendance: [AttendanceSchema]
}, { _id: false });

const QuestionSchema = new mongoose.Schema({
  id: String,
  text: String,
  options: [String],
  correctIndex: Number,
  explanation: String
}, { _id: false });

const QuizSchema = new mongoose.Schema({
  courseId: String,
  title: String,
  timeLimit: Number,
  questions: [QuestionSchema],
  createdBy: String,
  lastEditedBy: String,
  updatedAt: { type: Date, default: Date.now }
});

const QuizResultSchema = new mongoose.Schema({
  quizId: String,
  studentId: String,
  score: Number,
  total: Number,
  date: { type: Date, default: Date.now }
});

const AssignmentSchema = new mongoose.Schema({
  courseId: String,
  title: String,
  description: String,
  dueDate: String,
  createdBy: String,
  lastEditedBy: String,
  updatedAt: { type: Date, default: Date.now }
});

const SubmissionSchema = new mongoose.Schema({
  assignmentId: String,
  studentId: String,
  fileUrl: String,
  submittedAt: { type: Date, default: Date.now },
  grade: Number,
  feedback: String,
  studentReaction: String
});

const InstructorProfileSchema = new mongoose.Schema({
  qualification: String,
  experience: String,
  bio: String
}, { _id: false });

const ActivityLogSchema = new mongoose.Schema({
  action: String,
  date: { type: Date, default: Date.now },
  details: String
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  mobile: String,
  countryCode: { type: String, default: '+91' },
  role: { type: String, enum: ['STUDENT', 'INSTRUCTOR', 'ADMIN'], default: 'STUDENT' },
  enrolledCourses: [{ type: String }], 
  progress: { type: Map, of: [String] },
  profileImage: String,
  theme: { type: String, default: 'bright' },
  instructorProfile: InstructorProfileSchema,
  activityLog: [ActivityLogSchema]
});

const CourseSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  instructorId: String,
  thumbnailUrl: String,
  materials: [MaterialSchema], 
  schedules: [ScheduleSchema],
  createdBy: String,
  lastEditedBy: String,
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Course = mongoose.model('Course', CourseSchema);
const Quiz = mongoose.model('Quiz', QuizSchema);
const QuizResult = mongoose.model('QuizResult', QuizResultSchema);
const Assignment = mongoose.model('Assignment', AssignmentSchema);
const Submission = mongoose.model('Submission', SubmissionSchema);
const Settings = mongoose.model('Settings', SettingsSchema);

const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'ADMIN' });
    if (!adminExists) {
      await User.create({
        name: 'System Admin',
        email: 'admin@zero.com',
        password: 'admin123', 
        mobile: '0000000000',
        role: 'ADMIN'
      });
      console.log('👑 Default Admin created: admin@zero.com / admin123');
    }
  } catch (e) { console.error('Admin Seed Error:', e); }
};

const seedSettings = async () => {
    try {
        const s = await Settings.findOne({ type: 'general' });
        if (!s) await Settings.create({ 
            type: 'general', 
            copyrightText: '© 2025 Zero Classes. All rights reserved.',
            version: '1.0.0',
            socialLinks: {}
        });
    } catch(e) {}
};

connectDB();

// --- OTP STORAGE (Memory) ---
const otpStore = {}; 

// --- ROUTES ---

app.get('/', (req, res) => {
  res.send('✅ Zero Classes API is running successfully!');
});

// Settings
app.get('/api/settings', async (req, res) => {
    try {
        const s = await Settings.findOne({ type: 'general' });
        res.json(s || {});
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/settings', async (req, res) => {
    try {
        const s = await Settings.findOneAndUpdate({ type: 'general' }, req.body, { new: true, upsert: true });
        res.json(s);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// Auth
app.post('/api/auth/send-otp', async (req, res) => {
  const { target, type } = req.body; 
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  otpStore[target] = { code, expires: new Date(Date.now() + 5 * 60 * 1000) };
  console.log(`[OTP SYSTEM] SMS simulation to ${target}: ${code}`);
  res.json({ success: true, message: 'OTP sent' });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { target, code } = req.body;
  const record = otpStore[target];
  if (!record) return res.status(400).json({ error: 'No OTP requested' });
  if (new Date() > record.expires) return res.status(400).json({ error: 'OTP expired' });
  if (record.code !== code) return res.status(400).json({ error: 'Invalid OTP' });
  delete otpStore[target];
  res.json({ success: true });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, mobile, countryCode, role, adminSecret } = req.body;
    if (role === 'ADMIN' && adminSecret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Invalid Admin Secret Key' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    
    const user = await User.create({ 
      name, email, password, mobile, countryCode, role, enrolledCourses: [], theme: 'bright',
      activityLog: [{ action: 'REGISTER', date: new Date() }]
    });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOneAndUpdate(
      { email, password },
      { $push: { activityLog: { action: 'LOGIN', date: new Date() } } },
      { new: true }
    );
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { _id, password, activityLog, ...updates } = req.body; 
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users/:id/progress', async (req, res) => {
  const { courseId, materialId } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.progress) user.progress = new Map();
    let currentList = user.progress.get(courseId) || [];
    if (currentList.includes(materialId)) {
      currentList = currentList.filter(id => id !== materialId);
    } else {
      currentList.push(materialId);
    }
    user.progress.set(courseId, currentList);
    user.activityLog.push({ action: 'STUDY_PROGRESS', date: new Date(), details: `Toggled material ${materialId}` });
    await user.save();
    res.json(Object.fromEntries(user.progress));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/users/:id/role', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { role: req.body.role });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Enrollment
app.post('/api/enroll', async (req, res) => {
  const { userId, courseId } = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(userId, { 
      $addToSet: { enrolledCourses: courseId },
      $push: { activityLog: { action: 'ENROLL', date: new Date(), details: `Enrolled in ${courseId}` } }
    }, { new: true });
    res.json(updatedUser);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Courses
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/courses', async (req, res) => {
  try {
    const { id, ...courseData } = req.body;
    const course = await Course.create({
        ...courseData,
        createdAt: new Date(),
        updatedAt: new Date()
    });
    await User.findByIdAndUpdate(courseData.instructorId, { 
       $push: { activityLog: { action: 'CREATE_COURSE', date: new Date(), details: course.title } } 
    });
    res.json(course);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/courses/:id', async (req, res) => {
  try {
    const { _id, id, createdBy, createdAt, ...updates } = req.body;
    const course = await Course.findByIdAndUpdate(req.params.id, {
        ...updates,
        updatedAt: new Date()
    }, { new: true });
    res.json(course);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/courses/:id', async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Materials & Schedules (Atomic)
app.post('/api/courses/:id/materials', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, { $push: { materials: req.body } }, { new: true });
    res.json(course);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/courses/:id/materials/:matId', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, { $pull: { materials: { id: req.params.matId } } }, { new: true });
    res.json(course);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/courses/:id/schedules', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, { $push: { schedules: req.body } }, { new: true });
    res.json(course);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ATTENDANCE Tracking
app.post('/api/courses/:id/schedules/:schedId/join', async (req, res) => {
  try {
    const { studentId } = req.body;
    // Remove existing attendance for this student to prevent duplicates (optional)
    await Course.findOneAndUpdate(
      { "schedules.id": req.params.schedId },
      { $pull: { "schedules.$.attendance": { studentId } } }
    );
    // Add new attendance record
    const course = await Course.findOneAndUpdate(
      { "schedules.id": req.params.schedId },
      { $push: { "schedules.$.attendance": { studentId, joinedAt: new Date() } } },
      { new: true }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/courses/:id/schedules/:schedId', async (req, res) => {
  try {
    const { id, ...schedData } = req.body;
    await Course.findByIdAndUpdate(req.params.id, { $pull: { schedules: { id: req.params.schedId } } });
    const course = await Course.findByIdAndUpdate(req.params.id, { 
      $push: { schedules: { id: req.params.schedId, ...schedData } } 
    }, { new: true });
    res.json(course);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/courses/:id/schedules/:schedId', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, { $pull: { schedules: { id: req.params.schedId } } }, { new: true });
    res.json(course);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// QUIZZES
app.get('/api/quizzes', async (req, res) => {
    try {
        const quizzes = await Quiz.find();
        res.json(quizzes);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/quizzes', async (req, res) => {
    try {
        const quiz = await Quiz.create({
            ...req.body,
            updatedAt: new Date()
        });
        res.json(quiz);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/quizzes/:id', async (req, res) => {
    try {
        await Quiz.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// RESULTS
app.get('/api/results/:studentId', async (req, res) => {
    try {
        const results = await QuizResult.find({ studentId: req.params.studentId });
        res.json(results);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/results', async (req, res) => {
    try {
        const result = await QuizResult.create(req.body);
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ASSIGNMENTS
app.get('/api/assignments/:courseId', async (req, res) => {
  try {
    const assignments = await Assignment.find({ courseId: req.params.courseId });
    res.json(assignments);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/assignments', async (req, res) => {
  try {
    const assignment = await Assignment.create({
        ...req.body,
        updatedAt: new Date()
    });
    res.json(assignment);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/assignments/:id', async (req, res) => {
  try {
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/submissions/:assignmentId', async (req, res) => {
  try {
    const submissions = await Submission.find({ assignmentId: req.params.assignmentId });
    res.json(submissions);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/submissions', async (req, res) => {
  try {
    const sub = await Submission.create(req.body);
    res.json(sub);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/submissions/:id/grade', async (req, res) => {
  try {
    const { grade, feedback } = req.body;
    const sub = await Submission.findByIdAndUpdate(req.params.id, { grade, feedback }, { new: true });
    res.json(sub);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/submissions/:id/react', async (req, res) => {
  try {
    const { reaction } = req.body;
    const sub = await Submission.findByIdAndUpdate(req.params.id, { studentReaction: reaction }, { new: true });
    res.json(sub);
  } catch (e) { res.status(500).json({ error: e.message }); }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
