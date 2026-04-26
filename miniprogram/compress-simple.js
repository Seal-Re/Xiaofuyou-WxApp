const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

// 使用sips命令压缩图片（macOS自带）
function compressImages() {
  
  // 创建目录
  if (!fs.existsSync('images/compressed')) {
    fs.mkdirSync('images/compressed', { recursive: true });
  }
  
  if (!fs.existsSync('images/category/compressed')) {
    fs.mkdirSync('images/category/compressed', { recursive: true });
  }
  
  // 获取所有JPG图片
  const jpgFiles = fs.readdirSync('images')
    .filter(file => file.endsWith('.jpg'))
    .map(file => path.join('images', file));
    
  // 压缩并复制图片到压缩目录
  jpgFiles.forEach(file => {
    const filename = path.basename(file);
    const outputPath = path.join('images/compressed', filename);
    
    try {
      // 使用sips命令压缩图片（仅适用于macOS）
      childProcess.execSync(`sips -Z 500 "${file}" --out "${outputPath}"`);
      
      // 获取原始图片和压缩后图片的大小
      const originalSize = fs.statSync(file).size;
      const compressedSize = fs.statSync(outputPath).size;
      
    } catch (error) {
      console.error(`压缩 ${filename} 失败:`, error.message);
    }
  });
  
  // 压缩分类图标
  const pngFiles = fs.readdirSync('images/category')
    .filter(file => file.endsWith('.png'))
    .map(file => path.join('images/category', file));
    
  pngFiles.forEach(file => {
    const filename = path.basename(file);
    const outputPath = path.join('images/category/compressed', filename);
    
    try {
      // 使用sips命令压缩图片（仅适用于macOS）
      childProcess.execSync(`sips -Z 100 "${file}" --out "${outputPath}"`);
      
      const originalSize = fs.statSync(file).size;
      const compressedSize = fs.statSync(outputPath).size;
      
    } catch (error) {
      console.error(`压缩图标 ${filename} 失败:`, error.message);
    }
  });
  
}

// 执行压缩
compressImages(); 