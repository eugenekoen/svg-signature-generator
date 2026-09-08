import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 1. Copy bundle.js from dist to root
if (fs.existsSync(path.join(distDir, 'bundle.js'))) {
  fs.copyFileSync(path.join(distDir, 'bundle.js'), path.join(rootDir, 'bundle.js'));
  console.log('✓ Copied dist/bundle.js -> root/bundle.js');
}

// 2. Copy index.html from root to dist
if (fs.existsSync(path.join(rootDir, 'index.html'))) {
  fs.copyFileSync(path.join(rootDir, 'index.html'), path.join(distDir, 'index.html'));
  console.log('✓ Copied root/index.html -> dist/index.html');
}

// 3. Ensure dist/src/style.css exists
const distSrcDir = path.join(distDir, 'src');
if (!fs.existsSync(distSrcDir)) {
  fs.mkdirSync(distSrcDir, { recursive: true });
}
if (fs.existsSync(path.join(rootDir, 'src', 'style.css'))) {
  fs.copyFileSync(path.join(rootDir, 'src', 'style.css'), path.join(distSrcDir, 'style.css'));
  console.log('✓ Copied src/style.css -> dist/src/style.css');
}

// 4. Create .nojekyll in both dist and root
fs.writeFileSync(path.join(distDir, '.nojekyll'), '');
fs.writeFileSync(path.join(rootDir, '.nojekyll'), '');
console.log('✓ Created .nojekyll files');

// 5. Copy favicon.svg if exists
if (fs.existsSync(path.join(rootDir, 'favicon.svg'))) {
  fs.copyFileSync(path.join(rootDir, 'favicon.svg'), path.join(distDir, 'favicon.svg'));
}
if (fs.existsSync(path.join(rootDir, 'public', 'favicon.svg'))) {
  fs.copyFileSync(path.join(rootDir, 'public', 'favicon.svg'), path.join(distDir, 'favicon.svg'));
}

console.log('Build output preparation complete! dist/ is ready for GitHub Pages.');
