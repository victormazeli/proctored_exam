
// app.js - Main Application Entry Point
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const passport = require('passport');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
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
// const analyticsRoutes = require('./routes/analytics');
const proctorRoutes = require('./routes/proctor');

// Import middleware
const { isAuthenticated } = require('./middleware/auth');
const { trackAnalytics } = require('./middleware/analytics');

// Import socket handlers
const setupSocketHandlers = require('./socket-handlers');

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

app.use(cors());

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
const sessionMiddleware = session({
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
});

app.use(sessionMiddleware);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport);

// Flash messages
// app.use(flash());

// // Global variables
// app.use((req, res, next) => {
//   res.locals.user = req.user || null;
//   res.locals.success_msg = req.flash('success_msg');
//   res.locals.error_msg = req.flash('error_msg');
//   res.locals.error = req.flash('error');
//   next();
// });

// Analytics tracking
// app.use(trackAnalytics);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/admin/questions', questionRoutes);
app.use('/api/admin', adminRoutes);
// app.use('/analytics', analyticsRoutes);
app.use('/proctor', proctorRoutes);

// Home route
app.get('/', (req, res) => {
  return res.redirect('/exams/select');
//   if (req.isAuthenticated()) {
//     return res.redirect('/exams/select');
//   }
  // res.render('index', {
  //   title: 'Certification Practice Platform',
  //   hideNavbar: false,
  //   hideFooter: false,
  //   path: req.path,
  //   body:'' 
  // });
});

// Initialize Socket.io handlers with configuration
setupSocketHandlers(io, sessionMiddleware, {
  autoDisconnectMinutes: 15,
  cleanupIntervalMinutes: 5,
  maxRecentEvents: 100
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