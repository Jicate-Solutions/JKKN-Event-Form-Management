const fs = require('fs');
const path = require('path');

// Define the file path
const filePath = path.join(__dirname, '../app/(routes)/page.tsx');

// Read the file
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  // Replace console.log statements
  const updatedContent = data.replace(/console\.log\([\s\S]*?\);/g, '');

  // Write the file back
  fs.writeFile(filePath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log('Successfully removed console.log statements from', filePath);
  });
});
