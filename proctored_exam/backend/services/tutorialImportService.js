// services/tutorialImportService.js
const Tutorial = require('../models/tutorial');
const Lesson = require('../models/lesson');
const Certification = require('../models/certification');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/tutorials';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `tutorial-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// File filter to only accept JSON files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/json') {
    cb(null, true);
  } else {
    cb(new Error('Only JSON files are allowed'), false);
  }
};

// Export multer instance for routes
exports.upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});



/**
 * Import multiple tutorials from a directory
 * @param {string} directoryPath - Path to directory containing tutorial JSON files
 * @param {string} userId - ID of the user importing the tutorials
 * @returns {Promise<Object>} - Import results
 */
exports.importTutorialsFromDirectory = async (directoryPath, userId) => {
  try {
    // Check if directory exists
    if (!fs.existsSync(directoryPath)) {
      throw new Error(`Directory ${directoryPath} does not exist`);
    }
    
    // Get all JSON files in directory
    const files = fs.readdirSync(directoryPath)
      .filter(file => file.endsWith('.json'));
    
    if (files.length === 0) {
      throw new Error(`No JSON files found in ${directoryPath}`);
    }
    
    // Process each file
    const results = {
      tutorialsProcessed: 0,
      tutorialsCreated: 0,
      tutorialsUpdated: 0,
      tutorialsFailed: 0,
      lessonsCreated: 0,
      lessonsUpdated: 0,
      lessonsFailed: 0
    };
    
    for (const file of files) {
      try {
        const filePath = path.join(directoryPath, file);
        const result = await exports.importTutorial(filePath, userId);
        
        results.tutorialsProcessed++;
        
        if (result.operation === 'created') {
          results.tutorialsCreated++;
        } else {
          results.tutorialsUpdated++;
        }
        
        results.lessonsCreated += result.results.lessonsCreated;
        results.lessonsUpdated += result.results.lessonsUpdated;
        results.lessonsFailed += result.results.lessonsFailed;
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
        results.tutorialsFailed++;
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error importing tutorials from directory:', error);
    throw error;
  }
};








// Update the validateTutorialPackage function in tutorialImportService.js

/**
 * Validate tutorial package format
 * @param {Object} tutorialPackage - Tutorial package to validate
 * @throws {Error} - If validation fails
 */
function validateTutorialPackage(tutorialPackage) {
    // Check required fields
    if (!tutorialPackage.metadata) {
      throw new Error('Tutorial package missing metadata');
    }
    
    if (!tutorialPackage.metadata.title) {
      throw new Error('Tutorial package missing title');
    }
    
    if (!tutorialPackage.metadata.description) {
      throw new Error('Tutorial package missing description');
    }
    
    if (!tutorialPackage.metadata.certificationId) {
      throw new Error('Tutorial package missing certificationId');
    }
    
    if (!tutorialPackage.lessons || !Array.isArray(tutorialPackage.lessons)) {
      throw new Error('Tutorial package missing lessons array');
    }
    
    if (tutorialPackage.lessons.length === 0) {
      throw new Error('Tutorial package must contain at least one lesson');
    }
    
    // Validate each lesson
    tutorialPackage.lessons.forEach((lesson, index) => {
      if (!lesson.title) {
        throw new Error(`Lesson ${index + 1} missing title`);
      }
      
      if (!lesson.content) {
        throw new Error(`Lesson ${index + 1} missing content`);
      }
      
      // Validate practical exercises if present
      if (lesson.practicalExercises && Array.isArray(lesson.practicalExercises)) {
        lesson.practicalExercises.forEach((exercise, exIndex) => {
          if (!exercise.title) {
            throw new Error(`Exercise ${exIndex + 1} in lesson ${index + 1} missing title`);
          }
          
          if (!exercise.description) {
            throw new Error(`Exercise ${exIndex + 1} in lesson ${index + 1} missing description`);
          }
          
          if (!exercise.instructions) {
            throw new Error(`Exercise ${exIndex + 1} in lesson ${index + 1} missing instructions`);
          }
        });
      }
    });
  }
  

  exports.importTutorial = async (filePath, userId) => {
    try {
      // Read the file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const tutorialPackage = JSON.parse(fileContent);
      
      // Validate the package format
      validateTutorialPackage(tutorialPackage);
      
      // Check if certification exists
      const certificationId = tutorialPackage.metadata.certificationId;
      const certification = await Certification.findById(certificationId);
      
      if (!certification) {
        throw new Error(`Certification with ID ${certificationId} not found`);
      }
      
      // Check if a tutorial with the same title already exists for this certification
      const existingTutorial = await Tutorial.findOne({
        title: tutorialPackage.metadata.title,
        certificationId
      });
      
      let tutorial;
      let operation = 'created';
      
      // If tutorial exists, update it
      if (existingTutorial) {
        tutorial = existingTutorial;
        tutorial.description = tutorialPackage.metadata.description;
        tutorial.order = tutorialPackage.metadata.order || 0;
        tutorial.updatedAt = new Date();
        operation = 'updated';
      } else {
        // Create new tutorial
        tutorial = new Tutorial({
          title: tutorialPackage.metadata.title,
          description: tutorialPackage.metadata.description,
          certificationId,
          order: tutorialPackage.metadata.order || 0,
          lessons: [],
          active: true,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      await tutorial.save();
      
      // Process lessons
      const results = {
        lessonsCreated: 0,
        lessonsUpdated: 0,
        lessonsSkipped: 0,
        lessonsFailed: 0,
        exercisesCreated: 0,
        exercisesUpdated: 0
      };
      
      // Clear lessons array to rebuild it
      tutorial.lessons = [];
      
      for (const lessonData of tutorialPackage.lessons) {
        try {
          // Check if lesson exists
          let lesson = await Lesson.findOne({
            title: lessonData.title,
            tutorialId: tutorial._id
          });
          
          if (lesson) {
            // Update existing lesson
            lesson.content = lessonData.content;
            lesson.order = lessonData.order || 0;
            lesson.estimatedTime = lessonData.estimatedTime || 10;
            
            // Update domain mappings if present
            if (lessonData.domainMappings) {
              lesson.domainMappings = lessonData.domainMappings;
            }
            
            results.lessonsUpdated++;
          } else {
            // Create new lesson
            lesson = new Lesson({
              title: lessonData.title,
              content: lessonData.content,
              tutorialId: tutorial._id,
              order: lessonData.order || 0,
              estimatedTime: lessonData.estimatedTime || 10,
              domainMappings: lessonData.domainMappings || [],
              active: true,
              createdBy: userId,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            results.lessonsCreated++;
          }
          
          // Process practical exercises if present
          if (lessonData.practicalExercises && Array.isArray(lessonData.practicalExercises)) {
            // If lesson is new or doesn't have exercises, just set them
            if (!lesson.practicalExercises || lesson.practicalExercises.length === 0) {
              lesson.practicalExercises = lessonData.practicalExercises;
              results.exercisesCreated += lessonData.practicalExercises.length;
            } 
            // Otherwise, merge with existing exercises by title
            else {
              const updatedExercises = [...lesson.practicalExercises];
              
              lessonData.practicalExercises.forEach(exercise => {
                const existingIndex = updatedExercises.findIndex(ex => ex.title === exercise.title);
                
                if (existingIndex >= 0) {
                  // Update existing exercise
                  updatedExercises[existingIndex] = exercise;
                  results.exercisesUpdated++;
                } else {
                  // Add new exercise
                  updatedExercises.push(exercise);
                  results.exercisesCreated++;
                }
              });
              
              lesson.practicalExercises = updatedExercises;
            }
          }
          
          await lesson.save();
          
          // Add lesson to tutorial's lessons array
          tutorial.lessons.push(lesson._id);
        } catch (error) {
          console.error(`Error processing lesson "${lessonData.title}":`, error);
          results.lessonsFailed++;
        }
      }
      
      // Save updated lessons array
      await tutorial.save();
      
      // Clean up the uploaded file
      fs.unlinkSync(filePath);
      
      return {
        tutorial: {
          _id: tutorial._id,
          title: tutorial.title,
          description: tutorial.description
        },
        operation,
        results
      };
    } catch (error) {
      // Clean up the uploaded file if it exists
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      console.error('Error importing tutorial:', error);
      throw error;
    }
  };
  
 
  exports.exportTutorial = async (tutorialId) => {
    try {
      // Get tutorial with populated certification
      const tutorial = await Tutorial.findById(tutorialId)
        .populate('certificationId', 'name code')
        .lean();
      
      if (!tutorial) {
        throw new Error(`Tutorial with ID ${tutorialId} not found`);
      }
      
      // Get lessons for this tutorial
      const lessons = await Lesson.find({
        tutorialId
      }).sort({ order: 1 }).lean();
      
      // Build export package
      const exportPackage = {
        metadata: {
          title: tutorial.title,
          description: tutorial.description,
          certificationId: tutorial.certificationId._id,
          certificationName: tutorial.certificationId.name,
          certificationCode: tutorial.certificationId.code,
          order: tutorial.order,
          version: '1.0.0',
          exportDate: new Date().toISOString()
        },
        lessons: lessons.map(lesson => ({
          title: lesson.title,
          order: lesson.order,
          estimatedTime: lesson.estimatedTime,
          content: lesson.content,
          domainMappings: lesson.domainMappings || [],
          practicalExercises: lesson.practicalExercises || []
        }))
      };
      
      // Create export directory if it doesn't exist
      const exportDir = 'exports/tutorials';
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      
      // Generate safe filename
      const safeTitle = tutorial.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${safeTitle}_${Date.now()}.json`;
      const filePath = path.join(exportDir, filename);
      
      // Write file
      fs.writeFileSync(filePath, JSON.stringify(exportPackage, null, 2));
      
      return filePath;
    } catch (error) {
      console.error('Error exporting tutorial:', error);
      throw error;
    }
  };