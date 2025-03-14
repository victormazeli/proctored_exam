const express = require('express');
const mongoose = require('mongoose');
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
const proctorRoutes = require('./routes/proctor');

// Import middleware
const { authenticateJWT } = require('./middleware/auth');

// Import socket handlers
const setupSocketHandlers = require('./socket-handlers');

// Initialize Express app
const app = express();
const server = createServer(app);
const io = socketio(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: false
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// CORS setup
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: false
}));

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

// Initialize Passport for JWT only (no sessions)
app.use(passport.initialize());
require('./config/passport')(passport);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/exams', authenticateJWT, examRoutes);
app.use('/api/admin/questions', authenticateJWT, questionRoutes);
app.use('/api/admin', authenticateJWT, adminRoutes);
app.use('/proctor', authenticateJWT, proctorRoutes);

// Home route
app.get('/api/ping', (req, res) => {
  return res.status(200).send("ok")
});

// Initialize Socket.io handlers with JWT auth
setupSocketHandlers(io, null, {
  autoDisconnectMinutes: 15,
  cleanupIntervalMinutes: 5,
  maxRecentEvents: 100
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Resource Not Found'
  })
});


// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error'
  })
});

module.exports = { app, server, io };