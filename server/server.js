
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// Middleware
// Allow Localhost (Dev) AND any Vercel deployment (Prod)
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
  
  if (!process.env.MONGO_URI) {
    console.warn("⚠️ WARNING: MONGO_URI not found in env. Using localhost fallback.");
  }

  try {
    // Mongoose 6+ defaults are robust; removed deprecated options
    await mongoose.connect(uri);
    console.log('✅ MongoDB Connected Successfully');
    seedAdmin();
  } catch (err) {
    console.error('❌ MongoDB Critical Connection Error:', err.message);
    console.log('💡 TIP: If on Render, ensure MongoDB Atlas Network Access allows 0.0.0.0/0');
  }
};

// Monitor Connection Events
mongoose.connection.on('disconnected', () => console.log('⚠️ MongoDB Disconnected'));
mongoose.connection.on('reconnected', () => console.log('🔄 MongoDB Reconnected'));
mongoose.connection.on('error', (err) => console.error('💥 MongoDB Error:', err));

// --- SCHEMAS ---

// Explicit Sub-Schema for Materials to prevent CastErrors
const MaterialSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String, required: true },
  url: { type: String, default: '#' },
  uploadedAt: { type: String, required: true } // Store as ISO String
}, { _id: false }); // Disable auto _id for subdocs to prevent ID conflicts

// Explicit Sub-Schema for Schedules
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
  role: { type: String, enum: ['STUDENT', 'INSTRUCTOR', 'ADMIN'], default: 'STUDENT' },
  enrolledCourses: [{ type: String }], 
  progress: { type: Map, of: [String] } 
});

const CourseSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  instructorId: String,
  materials: [MaterialSchema], // Use explicit schema
  schedules: [ScheduleSchema]  // Use explicit schema
});

const User = mongoose.model('User', UserSchema);
const Course = mongoose.model('Course', CourseSchema);

// Seed Default Admin
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
  } catch (e) {
    console.error('Admin Seed Error:', e);
  }
};

connectDB();

// --- OTP STORAGE (Memory) ---
const otpStore = {}; 

// --- NODEMAILER ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS 
  }
});

// --- ROUTES ---

app.get('/', (req, res) => {
  res.send('✅ Zero Classes API is running successfully!');
});

// 1. Auth & OTP
app.post('/api/auth/send-otp', async (req, res) => {
  const { target, type } = req.body; 
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  
  otpStore[target] = { 
    code, 
    expires: new Date(Date.now() + 5 * 60 * 1000) 
  };

  console.log(`[OTP SYSTEM] SMS simulation to ${target}: ${code}`);

  try {
    if (type === 'email' && process.env.EMAIL_USER) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: target,
        subject: 'Zero Classes Verification Code',
        text: `Your verification code is: ${code}`
      });
    }
    res.json({ success: true, message: 'OTP sent' });
  } catch (error) {
    console.error('OTP Send Error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
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
    const { name, email, password, mobile, role, adminSecret } = req.body;
    
    if (role === 'ADMIN' && adminSecret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Invalid Admin Secret Key' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const user = await User.create({ name, email, password, mobile, role, enrolledCourses: [] });
    res.json(user);
  } catch (e) {
    console.error("Register Error:", e);
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
    console.error("Login Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// 2. Users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
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

// 3. Enrollment (Atomic)
app.post('/api/enroll', async (req, res) => {
  const { userId, courseId } = req.body;
  try {
    await User.findByIdAndUpdate(userId, { 
      $addToSet: { enrolledCourses: courseId } 
    });
    res.json({ success: true });
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

// 5. Sub-documents Atomic Routes (Materials & Schedules)

// Add Material ($push)
app.post('/api/courses/:id/materials', async (req, res) => {
  console.log(`[API] Uploading material to course ${req.params.id}`);
  try {
    // Validate Object ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid Course ID format' });
    }

    // Direct $push of the payload
    // Mongoose will now validate against MaterialSchema
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $push: { materials: req.body } },
      { new: true, runValidators: true }
    );

    if (!course) {
      console.warn(`[API] Course ${req.params.id} not found during upload`);
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(course);
  } catch (e) {
    console.error("Add Material Error:", e);
    // Send detailed error
    res.status(500).json({ error: e.message });
  }
});

// Delete Material ($pull)
app.delete('/api/courses/:id/materials/:matId', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $pull: { materials: { id: req.params.matId } } },
      { new: true }
    );
    res.json(course);
  } catch (e) {
    console.error("Delete Material Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Add Schedule ($push)
app.post('/api/courses/:id/schedules', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $push: { schedules: req.body } },
      { new: true, runValidators: true }
    );
    res.json(course);
  } catch (e) {
    console.error("Add Schedule Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Update Schedule (Atomic set)
app.put('/api/courses/:id/schedules/:schedId', async (req, res) => {
  try {
    const { id, ...schedData } = req.body;
    
    // 1. Remove old
    await Course.findByIdAndUpdate(req.params.id, { 
      $pull: { schedules: { id: req.params.schedId } } 
    });
    
    // 2. Add new
    const course = await Course.findByIdAndUpdate(req.params.id, { 
      $push: { schedules: { id: req.params.schedId, ...schedData } } 
    }, { new: true });
    
    res.json(course);
  } catch (e) {
    console.error("Update Schedule Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Delete Schedule ($pull)
app.delete('/api/courses/:id/schedules/:schedId', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $pull: { schedules: { id: req.params.schedId } } },
      { new: true }
    );
    res.json(course);
  } catch (e) {
    console.error("Delete Schedule Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Catch-all for debugging 404s
app.use((req, res) => {
  console.log(`[404] Unmatched Route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
