const fs = require('fs');
const path = require('path');

const leafletPath = path.join(__dirname, '../node_modules/leaflet/dist/images');
const publicPath = path.join(__dirname, '../public');

// Create public directory if it doesn't exist
if (!fs.existsSync(publicPath)) {
  fs.mkdirSync(publicPath);
}

// Copy marker icons
['marker-icon.png', 'marker-icon-2x.png', 'marker-shadow.png'].forEach(file => {
  fs.copyFileSync(
    path.join(leafletPath, file),
    path.join(publicPath, file)
  );
}); 