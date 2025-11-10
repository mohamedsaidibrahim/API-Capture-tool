// # build.js - Build helper script
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building API Capture Tool...');

try {
  // Clean dist directory
  if (fs.existsSync('dist')) {
    execSync('npx rimraf dist', { stdio: 'inherit' });
  }

  // Compile TypeScript
  execSync('npx tsc', { stdio: 'inherit' });

  // Check if main file exists
  const mainFile = path.join(__dirname, 'dist', 'main', 'main.js');
  if (!fs.existsSync(mainFile)) {
    throw new Error(`Main file not found at: ${mainFile}`);
  }

  console.log('✅ Build completed successfully!');
  console.log('📁 Output directory: dist/');
  console.log('🚀 Run with: npm start');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}