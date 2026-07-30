/**
 * v6: 基于原版 Escrcpy 首页 HTML（VPHero + VPFeatures 推广页面）
 * 替换为博客部署教程的推广页面
 * 详细教程放在 guide/ 目录下
 */
const fs = require('fs');
const path = require('path');

const base = 'C:/Users/qiyu/AppData/Roaming/TRAE SOLO CN/ModularData/ai-agent/work-mode-projects/6a641c34aeff9643835af5d6/viarotel-docs';
const src = path.join(base, '_original-index.html');   // 原版抓取的 HTML
const dst = path.join(base, 'zhHans', 'index.html');    // 目标首页

function readFile(p) { return fs.readFileSync(p, 'utf8'); }
function writeFile(p, c) { fs.writeFileSync(p, c, 'utf8'); }

let c = readFile(src);

const siteName = '博客部署教程';

// 1. 全局品牌替换
c = c.replace(/Escrcpy/g, siteName);
c = c.replace(/搜索文档/g, '搜索文章');
c = c.replace(/使用图形化的 scrcpy 显示和控制你的安卓设备/g, '从零开始搭建你的个人博客');
c = c.replace(/Powered by electron\./g, '使用 VitePress 快速构建美观、高性能的博客网站');
c = c.replace(/Copyright © 2023-2026 Powered by viarotel/g, 'Copyright © 2024 ' + siteName);
c = c.replace(/name="description" content="[^"]*"/, 'name="description" content="' + siteName + ' - 从零开始搭建你的个人博客网站"');

// 2. 替换 Hero 按钮链接（原版用 /zhHans/ 绝对路径，本地用相对路径）
c = c.replace(/href="\/zhHans\/guide\/started"/g, 'href="guide/started.html"');
c = c.replace(/href="\/zhHans\/help\/escrcpy"/g, 'href="help.html"');
c = c.replace(/href="https:\/\/github\.com\/viarotel-org\/escrcpy"/g, 'href="https://github.com"');

// 3. 替换 Hero 图片（原版用 logo@1024x1024.png，我们没有这个图片，改用 logo.ico）
c = c.replace(/src="\/images\/logo@1024x1024\.png"/g, 'src="../images/logo.ico"');

// 4. 替换导航栏链接
c = c.replace(/href="\/zhHans\/guide"/g, 'href="guide.html"');
c = c.replace(/href="\/zhHans\/reference"/g, 'href="reference.html"');
c = c.replace(/href="\/zhHans\/help"/g, 'href="help.html"');
c = c.replace(/href="\/zhHans\/changelog"/g, 'href="changelog.html"');
c = c.replace(/href="\/zhHans\/donate"/g, 'href="donate.html"');
c = c.replace(/href="\/zhHans\/contact"/g, 'href="contact.html"');
c = c.replace(/href="\/zhHans\/"/g, 'href="index.html"');

// 5. 替换多语言切换链接（原版指向 /，保留即可）
// c = c.replace(/href="\/"/g, 'href="index.html"');  // 不替换，避免破坏其他 / 开头链接

// 6. 替换图片路径（/images/ → ../images/）
c = c.replace(/src="\/images\//g, 'src="../images/');
c = c.replace(/href="\/images\//g, 'href="../images/');

// 7. 替换 CSS 路径（/assets/ → ../assets/）
c = c.replace(/href="\/assets\//g, 'href="../assets/');
c = c.replace(/href="\/vp-icons\.css"/g, 'href="../vp-icons.css"');
c = c.replace(/src="\/assets\//g, 'src="../assets/');

// 8. 替换 logo 路径
c = c.replace(/src="\/images\/logo\.ico"/g, 'src="../images/logo.ico"');

// 9. 替换 9 个特色卡片内容
const features = [
  { icon: '🚀', title: '快速搭建', details: '从零到上线只需几分钟，VitePress 让博客搭建变得简单高效' },
  { icon: '📝', title: 'Markdown 写作', details: '使用 Markdown 语法编写文章，专注于内容创作本身' },
  { icon: '🎨', title: '主题定制', details: '自定义颜色、布局和组件，打造独一无二的博客风格' },
  { icon: '🔍', title: '内置搜索', details: '本地全文搜索功能，让读者快速找到感兴趣的内容' },
  { icon: '📱', title: '响应式设计', details: '自动适配桌面、平板和手机，任何设备都能完美阅读' },
  { icon: '⚡', title: '高性能', details: '基于 Vite 构建，页面加载极快，体验流畅顺滑' },
  { icon: '🌍', title: '多平台部署', details: '支持 GitHub Pages、Cloudflare Pages、Vercel 等多种部署方式' },
  { icon: '🔗', title: '自定义域名', details: '轻松配置自定义域名，打造专业博客品牌形象' },
  { icon: '📊', title: '访问统计', details: '集成不蒜子统计，了解博客访问量和访客数量' },
];

// 原版 HTML 里每个卡片的 icon/title/details 都有相同的 class
// 用 split 方式逐个替换，保证顺序对应
const iconRe = /(<div class="icon" data-v-2d71e621>)[^<]*(<\/div>)/g;
const titleRe = /(<h2 class="title" data-v-2d71e621>)[^<]*(<\/h2>)/g;
const detailsRe = /(<p class="details" data-v-2d71e621>)[^<]*(<\/p>)/g;

let iconMatches = c.match(iconRe) || [];
let titleMatches = c.match(titleRe) || [];
let detailsMatches = c.match(detailsRe) || [];

console.log('找到 ' + iconMatches.length + ' 个 icon, ' + titleMatches.length + ' 个 title, ' + detailsMatches.length + ' 个 details');

features.forEach(function(f, i) {
  if (i < iconMatches.length) {
    c = c.replace(iconMatches[i], '<div class="icon" data-v-2d71e621>' + f.icon + '</div>');
  }
  if (i < titleMatches.length) {
    c = c.replace(titleMatches[i], '<h2 class="title" data-v-2d71e621>' + f.title + '</h2>');
  }
  if (i < detailsMatches.length) {
    c = c.replace(detailsMatches[i], '<p class="details" data-v-2d71e621>' + f.details + '</p>');
  }
});

// 10. 确保 CSS 路径正确（原版 head 中已经是 /assets/，已替换为 ../assets/）
// 检查 head 中的 logo 路径
c = c.replace(/<link rel="icon" href="\/images\/logo\.ico">/g, '<link rel="icon" href="../images/logo.ico">');

writeFile(dst, c);
console.log('✓ 首页已重新生成为推广页面（VPHero + VPFeatures）');
console.log('✓ 详细教程在 guide/ 目录下');
console.log('✓ 输出文件: ' + dst);
