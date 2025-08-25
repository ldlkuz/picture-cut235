const fs = require('fs');
const path = require('path');

// 创建简单的 PNG 图标（使用 Canvas API 或简单的 SVG 转换）
function createIcon(size, filename) {
  // 创建一个简单的 SVG 图标，使用 PICCUT 的品牌色彩
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
  <g transform="translate(${size * 0.2}, ${size * 0.2})">
    <!-- 切割图标 -->
    <rect x="${size * 0.1}" y="${size * 0.1}" width="${size * 0.2}" height="${size * 0.2}" fill="white" rx="2"/>
    <rect x="${size * 0.35}" y="${size * 0.1}" width="${size * 0.2}" height="${size * 0.2}" fill="white" rx="2"/>
    <rect x="${size * 0.1}" y="${size * 0.35}" width="${size * 0.2}" height="${size * 0.2}" fill="white" rx="2"/>
    <rect x="${size * 0.35}" y="${size * 0.35}" width="${size * 0.2}" height="${size * 0.2}" fill="white" rx="2"/>
  </g>
</svg>`;

  return svg;
}

// 创建快捷方式图标
function createShortcutIcon(size, type) {
  let iconContent = '';
  
  if (type === 'crop') {
    // 九宫格图标
    iconContent = `
    <rect x="${size * 0.15}" y="${size * 0.15}" width="${size * 0.2}" height="${size * 0.2}" fill="white" rx="2"/>
    <rect x="${size * 0.4}" y="${size * 0.15}" width="${size * 0.2}" height="${size * 0.2}" fill="white" rx="2"/>
    <rect x="${size * 0.65}" y="${size * 0.15}" width="${size * 0.2}" height="${size * 0.2}" fill="white" rx="2"/>
    <rect x="${size * 0.15}" y="${size * 0.4}" width="${size * 0.2}" height="${size * 0.2}" fill="white" rx="2"/>
    <rect x="${size * 0.4}" y="${size * 0.4}" width="${size * 0.2}" height="${size * 0.2}" fill="white" rx="2"/>
    <rect x="${size * 0.65}" y="${size * 0.4}" width="${size * 0.2}" height="${size * 0.2}" fill="white" rx="2"/>
    <rect x="${size * 0.15}" y="${size * 0.65}" width="${size * 0.2}" height="${size * 0.2}" fill="white" rx="2"/>
    <rect x="${size * 0.4}" y="${size * 0.65}" width="${size * 0.2}" height="${size * 0.2}" fill="white" rx="2"/>
    <rect x="${size * 0.65}" y="${size * 0.65}" width="${size * 0.2}" height="${size * 0.2}" fill="white" rx="2"/>`;
  } else {
    // 四宫格图标
    iconContent = `
    <rect x="${size * 0.2}" y="${size * 0.2}" width="${size * 0.25}" height="${size * 0.25}" fill="white" rx="3"/>
    <rect x="${size * 0.55}" y="${size * 0.2}" width="${size * 0.25}" height="${size * 0.25}" fill="white" rx="3"/>
    <rect x="${size * 0.2}" y="${size * 0.55}" width="${size * 0.25}" height="${size * 0.25}" fill="white" rx="3"/>
    <rect x="${size * 0.55}" y="${size * 0.55}" width="${size * 0.25}" height="${size * 0.25}" fill="white" rx="3"/>`;
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
  <g>${iconContent}</g>
</svg>`;

  return svg;
}

// 图标尺寸列表
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');

// 确保目录存在
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('开始生成图标文件...');

// 生成主图标
iconSizes.forEach(size => {
  const filename = `icon-${size}x${size}.png`;
  const svgContent = createIcon(size, filename);
  const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
  
  // 先保存为 SVG 文件
  fs.writeFileSync(svgPath, svgContent);
  console.log(`生成 SVG: ${filename.replace('.png', '.svg')}`);
});

// 生成快捷方式图标
const shortcutIcons = [
  { name: 'shortcut-crop.png', type: 'crop' },
  { name: 'shortcut-grid.png', type: 'grid' }
];

shortcutIcons.forEach(({ name, type }) => {
  const svgContent = createShortcutIcon(96, type);
  const svgPath = path.join(iconsDir, name.replace('.png', '.svg'));
  
  // 先保存为 SVG 文件
  fs.writeFileSync(svgPath, svgContent);
  console.log(`生成 SVG: ${name.replace('.png', '.svg')}`);
});

console.log('\n图标 SVG 文件生成完成！');
console.log('注意：由于技术限制，目前生成的是 SVG 文件。');
console.log('您可以使用在线工具将这些 SVG 文件转换为 PNG 格式，或者安装 sharp 库来自动转换。');
console.log('\n建议安装 sharp 库进行自动转换：');
console.log('npm install sharp');
console.log('然后运行：node convert-svg-to-png.js');