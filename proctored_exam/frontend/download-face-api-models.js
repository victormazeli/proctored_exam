// download-face-api-models.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const modelsDir = path.join(__dirname, 'src/assets/models');

// Create models directory if it doesn't exist
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

const models = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_expression_model-weights_manifest.json',
  'face_expression_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

models.forEach(model => {
  const modelPath = path.join(modelsDir, model);
  const file = fs.createWriteStream(modelPath);
  
  https.get(`${baseUrl}/${model}`, response => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded: ${model}`);
    });
  }).on('error', err => {
    fs.unlink(modelPath);
    console.error(`Error downloading ${model}: ${err.message}`);
  });
});