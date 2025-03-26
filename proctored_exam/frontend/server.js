const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Serve static files from the dist folder
app.use(express.static(path.join(process.cwd(), 'dist/frontend')));

const assetsPath = process.env.ASSETS_PATH || path.join(process.cwd(), 'dist/frontend/assets');
app.use('/assets', express.static(assetsPath));

// Handle Angular routing (redirects all requests to index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist/frontend/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
