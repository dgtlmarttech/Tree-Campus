import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import connectDB from './config/db.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import dashboardRoutes from './routes/dashboard.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import liveClassRoutes from './routes/liveClassRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import volunteerRoutes from './routes/volunteerRoutes.js';
import accountDeletion from './routes/accountDeletion.js';
import registerSchool from './routes/schoolRegistration.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import appConfigRoutes from './routes/appConfigRoutes.js';
import contestRoutes from './routes/contestRoutes.js';
import adminContestRoutes from './routes/adminContestRoutes.js';
import learningJourneyRoutes from './routes/learningJourneyRoutes.js';
import zoomWebhooks from './routes/zoomWebhooks.js';
import teacherApplicationRoutes from './routes/teacherApplicationRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminNotificationRoutes from './routes/adminNotificationRoutes.js';
import dayNotificationRoutes from './routes/dayNotificationRoutes.js';

import session from 'express-session';
import passport from 'passport';
import configurePassport from './config/passportConfig.js';
import MongoStore from 'connect-mongo';
import { initCronJobs } from './services/cronService.js';

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Initialize scheduled background jobs (e.g., Weekly Enrollment Nudge)
initCronJobs();

// Dynamic & robust CORS configuration (must be applied BEFORE routes)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://treecampus.netlify.app',
  'https://courses.treecampus.in',
  'https://treecampus.in',
  'https://www.treecampus.in',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    const isAllowed = 
      allowedOrigins.includes(origin) ||
      /^https?:\/\/([a-z0-9-]+\.)*treecampus\.in$/i.test(origin) ||
      /^https?:\/\/([a-z0-9-]+\.)*netlify\.app$/i.test(origin);

    if (isAllowed) {
      return callback(null, true);
    } else {
      return callback(new Error('Blocked by CORS policy: Origin not allowed'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Visemes', 'Content-Disposition'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(compression());
app.use(morgan('dev')); // Logging

// Zoom Webhooks (needs raw body for signature verification)
app.use('/api/webhooks/zoom', express.raw({ type: 'application/json' }), zoomWebhooks);

app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'tree_campus_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Initialize Passport
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// Health check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Tree Campus API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Standalone Smart App Redirect Bridge (Android Intent + Play Store Fallback)
app.get('/open-app', (req, res) => {
  const playStoreUrl = process.env.PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.academy.tree_campus';
  const coursesUrl = process.env.COURSES_URL || 'https://courses.treecampus.in';
  const schemeOpenUrl = 'treecampus://open';
  const schemeCallbackUrl = 'treecampus://login-callback';
  const intentUrl = `intent://open#Intent;scheme=treecampus;package=com.academy.tree_campus;S.browser_fallback_url=${encodeURIComponent(playStoreUrl)};end`;

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Opening Treecampus App...</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; }
    body {
      background: linear-gradient(135deg, #1B4332 0%, #2D6A4F 50%, #081C15 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      color: #1e293b;
    }
    .card {
      background: #ffffff;
      max-width: 420px;
      width: 100%;
      border-radius: 24px;
      padding: 32px 24px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.25);
    }
    .logo-wrap {
      width: 84px;
      height: 84px;
      margin: 0 auto 18px;
      background: #ffffff;
      border: 1px solid #d1fae5;
      border-radius: 20px;
      padding: 8px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.08);
    }
    .logo-wrap img { width: 100%; height: 100%; object-fit: contain; }
    .badge {
      display: inline-block;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 4px 12px;
      border-radius: 20px;
      margin-bottom: 12px;
    }
    h1 { font-size: 22px; font-weight: 800; color: #1B4332; margin-bottom: 8px; }
    p { font-size: 14px; color: #475569; line-height: 1.55; margin-bottom: 24px; }
    .btn-primary {
      display: block;
      width: 100%;
      background: linear-gradient(135deg, #FF6B35 0%, #E85D04 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 14px 20px;
      border-radius: 16px;
      font-weight: 700;
      font-size: 15px;
      box-shadow: 0 4px 16px rgba(255, 107, 53, 0.35);
      margin-bottom: 10px;
      cursor: pointer;
      border: none;
    }
    .btn-secondary {
      display: block;
      width: 100%;
      background: #f1f5f9;
      color: #1e293b;
      text-decoration: none;
      padding: 12px 18px;
      border-radius: 16px;
      font-weight: 600;
      font-size: 13.5px;
      border: 1px solid #e2e8f0;
      margin-bottom: 10px;
    }
    .btn-link {
      display: inline-block;
      color: #047857;
      text-decoration: none;
      font-size: 12.5px;
      font-weight: 600;
      margin-top: 6px;
    }
    .tagline { margin-top: 20px; font-size: 11px; color: #94a3b8; }
    .modes {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
    }
    .btn-mode {
      flex: 1;
      padding: 8px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-wrap">
      <img src="https://res.cloudinary.com/dbbll23jz/image/upload/v1765170258/tree_logo_ek4uw3.png" alt="Treecampus">
    </div>
    <div class="badge">Opening Treecampus App</div>
    <h1>Launching Your Class</h1>
    <p>If the app didn't open automatically on your phone, tap the button below:</p>

    <a href="${schemeOpenUrl}" class="btn-primary" id="openBtn">📲 Open Treecampus App</a>

    <div class="modes">
      <a href="${schemeOpenUrl}" class="btn-mode">Mode 1 (App Open)</a>
      <a href="${schemeCallbackUrl}" class="btn-mode">Mode 2 (Deep Link)</a>
    </div>

    <a href="${intentUrl}" class="btn-secondary">📱 Launch via Android Intent</a>
    <a href="${playStoreUrl}" class="btn-secondary" target="_blank">📥 Download on Google Play</a>
    <a href="${coursesUrl}" class="btn-link">🌐 Continue on Website</a>

    <div class="tagline">Treecampus • Democratizing Quality Education at No Cost</div>
  </div>

  <script>
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      setTimeout(() => {
        window.location.href = "${schemeOpenUrl}";
      }, 300);
    }
  </script>
</body>
</html>`);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/live-classes', liveClassRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/volunteer', volunteerRoutes);
app.use('/api/teachers', teacherApplicationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/account-deletion-request', accountDeletion);
app.use('/api/registerschool', registerSchool);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/config', appConfigRoutes);
app.use('/api/contest', contestRoutes);
app.use('/api/admin/contest', adminContestRoutes);
app.use('/api/learning-journey', learningJourneyRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use('/api/admin/day-notifications', dayNotificationRoutes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘       Tree Campus Backend Server                     â•‘
â•‘                                                      â•‘
â•‘  âœ… Server running on port ${PORT}                       â•‘
â•‘  ðŸŒ Environment: ${process.env.NODE_ENV || 'development'}                      â•‘
â•‘  ðŸ”— API Base URL: http://localhost:${PORT}/api           â•‘
â•‘  â˜ï¸  Using Cloudinary for media storage              â•‘
â•‘                                                      â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('âŒ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('âŒ Uncaught Exception:', err);
  process.exit(1);
});

export default app;
