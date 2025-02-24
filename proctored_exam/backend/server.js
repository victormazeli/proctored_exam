/**
 * server.js - Server entry point
 * This file imports the application from app.js and starts the server.
 * It also handles process signals for graceful shutdown.
 */

// Load environment variables early
require('dotenv').config();

// Import the application, server, and socket.io instance
const { app, server, io } = require('./app');

// Configuration
const PORT = process.env.PORT || 3000;

// Start the server
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

/**
 * Perform graceful shutdown of the server
 */
function gracefulShutdown() {
  console.log('Received shutdown signal, closing connections...');
  
  // Close all socket.io connections
  io.close(() => {
    console.log('Socket.io connections closed');
    
    // Close the HTTP server
    server.close(() => {
      console.log('HTTP server closed');
      
      // Disconnect from MongoDB (if needed)
      const mongoose = require('mongoose');
      mongoose.connection.close(false, () => {
        console.log('MongoDB connection closed');
        process.exit(0);
      });
    });
  });
  
  // Force shutdown after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}