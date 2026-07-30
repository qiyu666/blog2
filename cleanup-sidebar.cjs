/**
 * 从所有页面中移除旧文档（Gnirehtet/Scrcpy）的侧边栏引用
 */
const fs = require('fs');
const path = require('path');

const zhHans = 'C:/Users/qiyu/AppData/Roaming/TRAE SOLO CN/ModularData/ai-agent/work-mode-projects/6a641c34aeff9643835af5d6/viarotel-docs/zhHans';

function getHtmlFiles(dir) {
  const results = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...getHtmlFiles(fullPath));
    } else if (item.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

// 匹配 Gnirehtet 侧边栏 section: <section ...><div class="item" ...>...<h3 ...>Gnirehtet</h3>...</div><div class="items" ...>...</div></section>
function removeGnirehtetSection(html) {
  // 匹配从 <section class="VPSidebarItem level-1 collapsible is-link" ...><div class="item" tabindex="0" ...>...<h3 ...>Gnirehtet</h3> 开始，
  // 到其闭合 </section> 结束
  const gnirehtetRegex = /<section class="VPSidebarItem level-1 collapsible is-link"[^>]*data-v-9d2f0eb2[^>]*>[\s\S]*?<h3 class="text" data-v-9d2f0eb2>Gnirehtet<\/h3>[\s\S]*?<\/div>\s*<div class="items" data-v-9d2f0eb2>[\s\S]*?<\/div>\s*<\/section>/g;
  return html.replace(gnirehtetRegex, '');
}

// 匹配 Scrcpy 侧边栏 section
function removeScrcpySection(html) {
  const scrcpyRegex = /<section class="VPSidebarItem level-1 collapsible is-link"[^>]*data-v-9d2f0eb2[^>]*>[\s\S]*?<h3 class="text" data-v-9d2f0eb2>Scrcpy<\/h3>[\s\S]*?<\/div>\s*<div class="items" data-v-9d2f0eb2>[\s\S]*?<\/div>\s*<\/section>/g;
  return html.replace(scrcpyRegex, '');
}

// 移除 help/escrcpy.html 和 help/scrcpy.html 的侧边栏条目
function removeHelpOldLinks(html) {
  // 匹配包含 href=".../help/escrcpy.html" 的 VPSidebarItem
  const escrcpyRegex = /<div class="VPSidebarItem level-1 is-link"[^>]*>[\s\S]*?<a class="VPLink link link" href="[^"]*help\/escrcpy\.html"[^>]*>[\s\S]*?<\/a>[\s\S]*?<\/div>\s*<div[^>]*>\s*<\/div>\s*<\/div>/g;
  html = html.replace(escrcpyRegex, '');

  // 匹配包含 href=".../help/scrcpy.html" 的 VPSidebarItem
  const scrcpyHelpRegex = /<div class="VPSidebarItem level-1 is-link"[^>]*>[\s\S]*?<a class="VPLink link link" href="[^"]*help\/scrcpy\.html"[^>]*>[\s\S]*?<\/a>[\s\S]*?<\/div>\s*<div[^>]*>\s*<\/div>\s*<\/div>/g;
  html = html.replace(scrcpyHelpRegex, '');

  return html;
}

// 移除侧边栏中所有 reference/scrcpy/ 和 reference/gnirehtet/ 的 level-2 链接（兜底）
function removeAllOldRefLinks(html) {
  // 匹配所有包含 reference/scrcpy/ 或 reference/gnirehtet/ 的 level-2 VPSidebarItem
  const oldRefRegex = /<div class="VPSidebarItem level-2 is-link"[^>]*>[\s\S]*?<a class="VPLink link link" href="[^"]*(?:reference\/scrcpy\/|reference\/gnirehtet\/)[^"]*"[^>]*>[\s\S]*?<\/a>[\s\S]*?<\/div>\s*<div[^>]*>\s*<\/div>\s*<\/div>/g;
  return html.replace(oldRefRegex, '');
}

const files = getHtmlFiles(zhHans);
console.log('共找到 ' + files.length + ' 个 HTML 文件');

let modifiedCount = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  content = removeGnirehtetSection(content);
  content = removeScrcpySection(content);
  content = removeHelpOldLinks(content);
  content = removeAllOldRefLinks(content);

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
  }
}

console.log('已修改 ' + modifiedCount + ' 个文件');
