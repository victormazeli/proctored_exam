const tutorialImportService = require('../services/tutorialImportService');
const Tutorial = require('../models/tutorial');
const path = require('path');
const fs = require('fs');

/**
 * Import a tutorial from a JSON file
 */
exports.importTutorial = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Process the uploaded file
    const result = await tutorialImportService.importTutorial(
      req.file.path,
      req.user._id
    );
    
    return res.status(200).json({
      success: true,
      message: `Tutorial ${result.operation} successfully`,
      data: {
        tutorial: result.tutorial,
        results: result.results
      }
    });
  } catch (err) {
    console.error('Error importing tutorial:', err);
    
    // Clean up the uploaded file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to import tutorial'
    });
  }
};

/**
 * Export a tutorial to a JSON file
 */
exports.exportTutorial = async (req, res) => {
  try {
    const { tutorialId } = req.params;
    
    // Check if tutorial exists
    const tutorial = await Tutorial.findById(tutorialId);
    if (!tutorial) {
      return res.status(404).json({
        success: false,
        message: 'Tutorial not found'
      });
    }
    
    // Export tutorial
    const filePath = await tutorialImportService.exportTutorial(tutorialId);
    
    // Get filename
    const filename = path.basename(filePath);
    
    // Set headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    // Send file
    return res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
      
      // Delete the file after sending
      fs.unlinkSync(filePath);
    });
  } catch (err) {
    console.error('Error exporting tutorial:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to export tutorial'
    });
  }
};

/**
 * Get import/export page
 */
exports.getImportExportPage = async (req, res) => {
  try {
    // Get all tutorials for export dropdown
    const tutorials = await Tutorial.find()
      .populate('certificationId', 'name code')
      .sort({ title: 1 })
      .lean();
    
    return res.status(200).json({
      success: true,
      data: {
        tutorials: tutorials.map(t => ({
          _id: t._id,
          title: t.title,
          certificationName: t.certificationId?.name || 'Unknown'
        }))
      }
    });
  } catch (err) {
    console.error('Error loading import/export page:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load import/export page'
    });
  }
};

/**
 * Batch import tutorials
 */
exports.batchImportTutorials = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }
    
    // Create a temporary directory for the uploads
    const tempDir = path.join('uploads', 'tutorials', 'batch', Date.now().toString());
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Process all uploaded files
    const results = {
      tutorialsProcessed: 0,
      tutorialsCreated: 0,
      tutorialsUpdated: 0,
      tutorialsFailed: 0,
      lessonsCreated: 0,
      lessonsUpdated: 0,
      lessonsFailed: 0,
      failedFiles: []
    };
    
    // Move files to temp directory
    for (const file of req.files) {
      const newPath = path.join(tempDir, file.originalname);
      fs.renameSync(file.path, newPath);
    }
    
    // Process all files in the temp directory
    try {
      const batchResults = await tutorialImportService.importTutorialsFromDirectory(
        tempDir,
        req.user._id
      );
      
      // Combine results
      Object.assign(results, batchResults);
    } catch (error) {
      console.error('Error in batch processing:', error);
      results.failedFiles.push({
        name: 'batch_processing',
        error: error.message
      });
    }
    
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Batch import completed',
      data: results
    });
  } catch (err) {
    console.error('Error in batch import:', err);
    
    // Clean up any uploaded files
    if (req.files) {
      for (const file of req.files) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to process batch import'
    });
  }
};