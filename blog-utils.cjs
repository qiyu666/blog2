const fs = require('fs');
const path = require('path');
const { posts, categories, renderMarkdown } = require('./blog-data.cjs');

const base = 'C:/Users/qiyu/AppData/Roaming/TRAE SOLO CN/ModularData/ai-agent/work-mode-projects/6a641c34aeff9643835af5d6/viarotel-docs';
const zhHans = path.join(base, 'zhHans');

const siteName = 'Marginalia';
const siteTagline = '边缘思考 · 慢阅读 · 深度写作';

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, content) {
  fs.writeFileSync(p, content, 'utf8');
}

function getDepth(filePath) {
  const rel = path.relative(zhHans, filePath);
  const parts = rel.split(path.sep);
  return parts.length - 1;
}

function prefix(depth) {
  return '../'.repeat(depth);
}

function getSidebarHtml(depth, activePost) {
  const p = prefix(depth);
  let html = '';
  
  html += '<div class="no-transition group" data-v-246a6fca><section class="VPSidebarItem level-0 collapsible is-link" data-v-246a6fca data-v-9d2f0eb2><div class="item" tabindex="0" data-v-9d2f0eb2><div class="indicator" data-v-9d2f0eb2></div><a class="VPLink link link" href="' + p + 'index.html" data-v-9d2f0eb2><h2 class="text" data-v-9d2f0eb2>首页</h2></a><div class="caret" role="button" aria-label="toggle section" tabindex="0" data-v-9d2f0eb2><span class="vpi-chevron-right caret-icon" data-v-9d2f0eb2></span></div></div></section></div>';
  
  html += '<div class="no-transition group" data-v-246a6fca><section class="VPSidebarItem level-0 collapsible is-link has-active" data-v-246a6fca data-v-9d2f0eb2><div class="item" tabindex="0" data-v-9d2f0eb2><div class="indicator" data-v-9d2f0eb2></div><a class="VPLink link link" href="' + p + 'guide.html" data-v-9d2f0eb2><h2 class="text" data-v-9d2f0eb2>文章</h2></a><div class="caret" role="button" aria-label="toggle section" tabindex="0" data-v-9d2f0eb2><span class="vpi-chevron-right caret-icon" data-v-9d2f0eb2></span></div></div><div class="items" data-v-9d2f0eb2>';
  
  posts.forEach(function(post) {
    const active = activePost && activePost.id === post.id ? ' has-active' : '';
    html += '<div class="VPSidebarItem level-1 is-link' + active + '" data-v-9d2f0eb2 data-v-9d2f0eb2><div class="item" data-v-9d2f0eb2><div class="indicator" data-v-9d2f0eb2></div><a class="VPLink link link" href="' + p + 'guide/' + post.slug + '.html" data-v-9d2f0eb2><p class="text" data-v-9d2f0eb2>' + post.title.substring(0, 20) + (post.title.length > 20 ? '...' : '') + '</p></a></div></div>';
  });
  
  html += '</div></section></div>';
  
  html += '<div class="no-transition group" data-v-246a6fca><section class="VPSidebarItem level-0 collapsible is-link" data-v-246a6fca data-v-9d2f0eb2><div class="item" tabindex="0" data-v-9d2f0eb2><div class="indicator" data-v-9d2f0eb2></div><a class="VPLink link link" href="' + p + 'reference.html" data-v-9d2f0eb2><h2 class="text" data-v-9d2f0eb2>分类</h2></a><div class="caret" role="button" aria-label="toggle section" tabindex="0" data-v-9d2f0eb2><span class="vpi-chevron-right caret-icon" data-v-9d2f0eb2></span></div></div><div class="items" data-v-9d2f0eb2>';
  
  categories.forEach(function(cat) {
    html += '<div class="VPSidebarItem level-1 is-link" data-v-9d2f0eb2 data-v-9d2f0eb2><div class="item" data-v-9d2f0eb2><div class="indicator" data-v-9d2f0eb2></div><a class="VPLink link link" href="' + p + 'reference/' + cat.slug + '.html" data-v-9d2f0eb2><p class="text" data-v-9d2f0eb2>' + cat.name + '（' + cat.count + '）</p></a></div></div>';
  });
  
  html += '</div></section></div>';
  
  html += '<div class="no-transition group" data-v-246a6fca><section class="VPSidebarItem level-0 collapsible is-link" data-v-246a6fca data-v-9d2f0eb2><div class="item" tabindex="0" data-v-9d2f0eb2><div class="indicator" data-v-9d2f0eb2></div><a class="VPLink link link" href="' + p + 'help.html" data-v-9d2f0eb2><h2 class="text" data-v-9d2f0eb2>关于</h2></a><div class="caret" role="button" aria-label="toggle section" tabindex="0" data-v-9d2f0eb2><span class="vpi-chevron-right caret-icon" data-v-9d2f0eb2></span></div></div><div class="items" data-v-9d2f0eb2>';
  html += '<div class="VPSidebarItem level-1 is-link" data-v-9d2f0eb2 data-v-9d2f0eb2><div class="item" data-v-9d2f0eb2><div class="indicator" data-v-9d2f0eb2></div><a class="VPLink link link" href="' + p + 'changelog.html" data-v-9d2f0eb2><p class="text" data-v-9d2f0eb2>归档</p></a></div></div>';
  html += '<div class="VPSidebarItem level-1 is-link" data-v-9d2f0eb2 data-v-9d2f0eb2><div class="item" data-v-9d2f0eb2><div class="indicator" data-v-9d2f0eb2></div><a class="VPLink link link" href="' + p + 'donate.html" data-v-9d2f0eb2><p class="text" data-v-9d2f0eb2>友链</p></a></div></div>';
  html += '<div class="VPSidebarItem level-1 is-link" data-v-9d2f0eb2 data-v-9d2f0eb2><div class="item" data-v-9d2f0eb2><div class="indicator" data-v-9d2f0eb2></div><a class="VPLink link link" href="' + p + 'contact.html" data-v-9d2f0eb2><p class="text" data-v-9d2f0eb2>留言</p></a></div></div>';
  html += '</div></section></div>';
  
  return html;
}

function getTopNavHtml(depth) {
  const p = prefix(depth);
  return [
    '<a class="VPLink link VPNavBarMenuLink" href="' + p + 'index.html" tabindex="0" data-v-68e2eda7 data-v-5fd9369f><span data-v-5fd9369f>首页</span></a>',
    '<a class="VPLink link VPNavBarMenuLink" href="' + p + 'guide.html" tabindex="0" data-v-68e2eda7 data-v-5fd9369f><span data-v-5fd9369f>文章</span></a>',
    '<a class="VPLink link VPNavBarMenuLink" href="' + p + 'reference.html" tabindex="0" data-v-68e2eda7 data-v-5fd9369f><span data-v-5fd9369f>分类</span></a>',
    '<a class="VPLink link VPNavBarMenuLink" href="' + p + 'help.html" tabindex="0" data-v-68e2eda7 data-v-5fd9369f><span data-v-5fd9369f>关于</span></a>',
    '<a class="VPLink link VPNavBarMenuLink" href="' + p + 'changelog.html" tabindex="0" data-v-68e2eda7 data-v-5fd9369f><span data-v-5fd9369f>归档</span></a>',
  ].join('');
}

function replaceTopNav(content, depth) {
  const navHtml = getTopNavHtml(depth);
  const navRe = /<nav aria-labelledby="main-nav-aria-label" class="VPNavBarMenu menu"[^>]*>[\s\S]*?<\/nav>/;
  return content.replace(navRe, function() {
    return '<nav aria-labelledby="main-nav-aria-label" class="VPNavBarMenu menu" data-v-9182a8b7 data-v-68e2eda7><span id="main-nav-aria-label" class="visually-hidden" data-v-68e2eda7> Main Navigation </span>' + navHtml + '</nav>';
  });
}

function replaceSidebar(content, depth, activePost) {
  const sidebarHtml = getSidebarHtml(depth, activePost);
  const sidebarRe = /<aside class="VPSidebar"[^>]*>[\s\S]*?<\/aside>/;
  return content.replace(sidebarRe, function() {
    return '<aside class="VPSidebar" data-v-5e58cf28 data-v-3e932162><div class="curtain" data-v-3e932162></div><nav class="nav" id="VPSidebarNav" aria-labelledby="sidebar-aria-label" tabindex="-1" data-v-3e932162><span class="visually-hidden" id="sidebar-aria-label" data-v-3e932162> Sidebar Navigation </span>' + sidebarHtml + '</nav></aside>';
  });
}

function replaceTitle(content, title) {
  content = content.replace(/<title>[^<]*<\/title>/, '<title>' + title + ' | ' + siteName + '</title>');
  content = content.replace(/name="description" content="[^"]*"/, 'name="description" content="' + siteTagline + '"');
  return content;
}

function replaceLogoAndTitle(content, depth) {
  const p = prefix(depth);
  content = content.replace(/<span data-v-8988568e>Escrcpy<\/span>/g, '<span data-v-8988568e>' + siteName + '</span>');
  content = content.replace(/alt="Escrcpy"/g, 'alt="' + siteName + '"');
  content = content.replace(/href="index.html" data-v-8988568e>/g, 'href="' + p + 'index.html" data-v-8988568e>');
  return content;
}

function replaceFooter(content) {
  content = content.replace(/Powered by viarotel/g, 'Powered by ' + siteName);
  content = content.replace(/Copyright © 2023-2026 Powered by viarotel/g, 'Copyright © 2024 ' + siteName + ' · 边缘思考');
  return content;
}

console.log('=== Starting blog conversion ===\n');

module.exports = {
  posts, categories, renderMarkdown,
  getDepth, prefix,
  getSidebarHtml, getTopNavHtml,
  replaceTopNav, replaceSidebar, replaceTitle, replaceLogoAndTitle, replaceFooter,
  readFile, writeFile,
  siteName, siteTagline,
  zhHans, base
};