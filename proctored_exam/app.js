
// app.js - Main Application Entry Point
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const passport = require('passport');
const flash = require('connect-flash');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const socketio = require('socket.io');
const { createServer } = require('http');

// Load environment variables
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const examRoutes = require('./routes/exams');
const questionRoutes = require('./routes/questions');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');

// Import middleware
const { isAuthenticated } = require('./middleware/auth');
const { trackAnalytics } = require('./middleware/analytics');

// Initialize Express app
const app = express();
const server = createServer(app);
const io = socketio(server);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Configure middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
      "img-src": ["'self'", "data:", "blob:"],
      "media-src": ["'self'", "blob:"],
      "connect-src": ["'self'", "wss:", "ws:"]
    }
  }
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI,
    collection: 'sessions'
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport);

// Flash messages
app.use(flash());

// Global variables
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// Analytics tracking
app.use(trackAnalytics);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/auth', authRoutes);
app.use('/exams', examRoutes);
app.use('/admin/questions', questionRoutes);
app.use('/admin', adminRoutes);
app.use('/analytics', analyticsRoutes);

// Home route
app.get('/', (req, res) => {
//   if (req.isAuthenticated()) {
//     return res.redirect('/exams/select');
//   }
  res.render('index', {
    title: 'Certification Practice Platform'
  });
});

// Socket.io for real-time proctoring
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Authentication middleware for socket
//   socket.use(([event, ...args], next) => {
//     if (socket.request.session && socket.request.session.passport && socket.request.session.passport.user) {
//       next();
//     } else {
//       next(new Error('Unauthorized'));
//     }
//   });
  
  // Handle proctoring events
  socket.on('proctor:violation', (data) => {
    // Log violation in database
    require('./services/proctorService').logViolation(socket.request.session.passport.user, data);
  });
  
  socket.on('proctor:heartbeat', (data) => {
    // Update exam status
    require('./services/examService').updateExamStatus(data.attemptId, data.status);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).render('errors/404', {
    title: '404 - Page Not Found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('errors/500', {
    title: '500 - Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});


module.exports = { app, server, io };