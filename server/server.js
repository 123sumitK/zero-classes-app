
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
    if (uri.startsWith('mongodb+srv://')) {
        const parts = uri.split('@');
        if (parts.length > 1) {
            const creds = parts[0].split('//')[1];
            const [user, pass] = creds.split(':');
            console.log(`[DB Debug] Connecting as User: "${user}"`);
        }
    }
  } catch (e) { console.log('[DB Debug] Could not parse URI for debugging'); }

  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB Connected Successfully');
    seedAdmin();
  } catch (err) {
    console.error('❌ MongoDB Critical Connection Error:', err.message);
  }
};

mongoose.connection.on('disconnected', () => console.log('⚠️ MongoDB Disconnected'));
mongoose.connection.on('error', (err) => console.error('💥 MongoDB Error:', err));

// --- SCHEMAS ---
const MaterialSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String, required: true },
  url: { type: String, default: '#' },
  uploadedAt: { type: String, required: true } 
}, { _id: false }); 

const ScheduleSchema = new mongoose.Schema({
  id: { type: String, required: true },
  courseId: { type: String, required: true },
  topic: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  meetingUrl: { type: String, default: '' }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  mobile: String,
  countryCode: { type: String, default: '+91' },
  role: { type: String, enum: ['STUDENT', 'INSTRUCTOR', 'ADMIN'], default: 'STUDENT' },
  enrolledCourses: [{ type: String }], 
  progress: { type: Map, of: [String] } 
});

const CourseSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  instructorId: String,
  materials: [MaterialSchema], 
  schedules: [ScheduleSchema] 
});

const User = mongoose.model('User', UserSchema);
const Course = mongoose.model('Course', CourseSchema);

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

connectDB();

// --- OTP STORAGE (Memory) ---
const otpStore = {}; 

// --- ROUTES ---

app.get('/', (req, res) => {
  res.send('✅ Zero Classes API is running successfully!');
});

// 1. Auth & OTP
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

    const user = await User.create({ name, email, password, mobile, countryCode, role, enrolledCourses: [] });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Users
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

// Progress Endpoint
app.post('/api/users/:id/progress', async (req, res) => {
  const { courseId, materialId } = req.body;
  try {
    // Logic to toggle progress in a Map
    // MongoDB Map updates can be tricky, reading/writing is safer for MVP
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Ensure progress map exists
    if (!user.progress) user.progress = new Map();
    
    // Get current list for this course
    let currentList = user.progress.get(courseId) || [];
    
    if (currentList.includes(materialId)) {
      // Remove
      currentList = currentList.filter(id => id !== materialId);
    } else {
      // Add
      currentList.push(materialId);
    }
    
    user.progress.set(courseId, currentList);
    await user.save();
    
    // Return simple object format
    res.json(Object.fromEntries(user.progress));
  } catch (e) {
    console.error("Progress Error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/users/:id/role', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { role: req.body.role });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. Enrollment (Atomic) - Returns Updated User
app.post('/api/enroll', async (req, res) => {
  const { userId, courseId } = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(userId, { 
      $addToSet: { enrolledCourses: courseId } 
    }, { new: true }); // Return new doc
    res.json(updatedUser);
  } catch (e) {
    console.error("Enroll Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// 4. Courses
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/courses', async (req, res) => {
  try {
    const course = await Course.create(req.body);
    res.json(course);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/courses/:id', async (req, res) => {
  try {
    const { _id, id, ...updates } = req.body;
    const course = await Course.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(course);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/courses/:id', async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. Materials & Schedules
app.post('/api/courses/:id/materials', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $push: { materials: req.body } },
      { new: true, runValidators: true }
    );
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/courses/:id/materials/:matId', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $pull: { materials: { id: req.params.matId } } },
      { new: true }
    );
    res.json(course);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/courses/:id/schedules', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $push: { schedules: req.body } },
      { new: true, runValidators: true }
    );
    res.json(course);
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
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $pull: { schedules: { id: req.params.schedId } } },
      { new: true }
    );
    res.json(course);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
