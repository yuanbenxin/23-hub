#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 正在生成 images.json...');

// 确保 images 目录存在
if (!fs.existsSync('images')) {
  console.log('❌ 错误：images 目录不存在');
  fs.mkdirSync('images');
  fs.writeFileSync('images/placeholder.jpg', '');
  console.log('✅ 已创建空的 images 目录');
}

// 支持的图片格式
const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
let imagePaths = [];

// 查找所有图片
fs.readdirSync('images').forEach(file => {
  const ext = path.extname(file).toLowerCase();
  if (imageExtensions.includes(ext)) {
    imagePaths.push(`images/${file}`);
  }
});

console.log(`✅ 找到 ${imagePaths.length} 张图片`);

// 生成 images.json
const jsonContent = JSON.stringify(imagePaths, null, 2);
fs.writeFileSync('images.json', jsonContent);

console.log('✨ images.json 已成功生成！');
console.log('内容示例:', jsonContent.substring(0, 100) + '...');
