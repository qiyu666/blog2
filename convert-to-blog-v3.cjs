const fs = require('fs');
const path = require('path');
const { posts, categories } = require('./blog-data.cjs');

const base = 'C:/Users/qiyu/AppData/Roaming/TRAE SOLO CN/ModularData/ai-agent/work-mode-projects/6a641c34aeff9643835af5d6/viarotel-docs';
const zhHans = path.join(base, 'zhHans');

const siteName = 'Marginalia';
const siteTagline = '边缘思考 · 慢阅读 · 深度写作';
const siteDesc = '一个关于阅读、写作、技术与生活的博客';

function readFile(p) { return fs.readFileSync(p, 'utf8'); }
function writeFile(p, c) { fs.writeFileSync(p, c, 'utf8'); }
function getDepth(fp) {
  const rel = path.relative(zhHans, fp);
  return rel.split(path.sep).length - 1;
}
function pfx(d) { return '../'.repeat(d); }

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderMarkdown(md) {
  let html = md;
  html = html.replace(/```([\s\S]*?)```/g, function(match, code) {
    const lines = code.trim().split('\n');
    const lang = lines[0] || '';
    const content = lines.slice(1).join('\n');
    return '<div class="language-' + lang + ' vp-adaptive-theme"><button class="copy"></button><span class="lang">' + lang + '</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code>' + escapeHtml(content).split('\n').map(l => '<span class="line"><span>' + l + '</span></span>').join('\n') + '</code></pre></div>';
  });
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/^- (.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n)+/g, function(m) { return '<ul>' + m + '</ul>'; });
  const paras = html.split(/\n\n+/);
  html = paras.map(function(p) {
    if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<pre') || p.startsWith('<div') || p.startsWith('<li') || p.startsWith('```')) return p;
    return '<p>' + p.replace(/\n/g, '<br />') + '</p>';
  }).join('\n\n');
  return html;
}

function buildSidebar(depth, activePost, activeCat) {
  const p = pfx(depth);
  let html = '';
  html += '<div class="no-transition group"><section class="VPSidebarItem level-0 collapsible is-link"><div class="item" tabindex="0"><div class="indicator"></div><a class="VPLink link link" href="' + p + 'index.html"><h2 class="text">首页</h2></a><div class="caret" role="button"><span class="vpi-chevron-right caret-icon"></span></div></div></section></div>';
  
  const artActive = activePost ? ' has-active' : '';
  html += '<div class="no-transition group"><section class="VPSidebarItem level-0 collapsible is-link' + artActive + '"><div class="item" tabindex="0"><div class="indicator"></div><a class="VPLink link link" href="' + p + 'guide.html"><h2 class="text">文章</h2></a><div class="caret" role="button"><span class="vpi-chevron-right caret-icon"></span></div></div><div class="items">';
  posts.forEach(function(post) {
    const a = activePost && activePost.id === post.id ? ' has-active' : '';
    html += '<div class="VPSidebarItem level-1 is-link' + a + '"><div class="item"><div class="indicator"></div><a class="VPLink link link" href="' + p + 'guide/' + post.slug + '.html"><p class="text">' + post.title.substring(0, 20) + (post.title.length > 20 ? '...' : '') + '</p></a></div></div>';
  });
  html += '</div></section></div>';
  
  const catActive = activeCat ? ' has-active' : '';
  html += '<div class="no-transition group"><section class="VPSidebarItem level-0 collapsible is-link' + catActive + '"><div class="item" tabindex="0"><div class="indicator"></div><a class="VPLink link link" href="' + p + 'reference.html"><h2 class="text">分类</h2></a><div class="caret" role="button"><span class="vpi-chevron-right caret-icon"></span></div></div><div class="items">';
  categories.forEach(function(cat) {
    const a = activeCat && activeCat.slug === cat.slug ? ' has-active' : '';
    html += '<div class="VPSidebarItem level-1 is-link' + a + '"><div class="item"><div class="indicator"></div><a class="VPLink link link" href="' + p + 'reference/' + cat.slug + '.html"><p class="text">' + cat.name + '（' + cat.count + '）</p></a></div></div>';
  });
  html += '</div></section></div>';
  
  html += '<div class="no-transition group"><section class="VPSidebarItem level-0 collapsible is-link"><div class="item" tabindex="0"><div class="indicator"></div><a class="VPLink link link" href="' + p + 'help.html"><h2 class="text">关于</h2></a><div class="caret" role="button"><span class="vpi-chevron-right caret-icon"></span></div></div><div class="items">';
  html += '<div class="VPSidebarItem level-1 is-link"><div class="item"><div class="indicator"></div><a class="VPLink link link" href="' + p + 'changelog.html"><p class="text">归档</p></a></div></div>';
  html += '<div class="VPSidebarItem level-1 is-link"><div class="item"><div class="indicator"></div><a class="VPLink link link" href="' + p + 'donate.html"><p class="text">友链</p></a></div></div>';
  html += '<div class="VPSidebarItem level-1 is-link"><div class="item"><div class="indicator"></div><a class="VPLink link link" href="' + p + 'contact.html"><p class="text">留言</p></a></div></div>';
  html += '</div></section></div>';
  return html;
}

function buildTopNav(depth) {
  const p = pfx(depth);
  return [
    ['首页', p + 'index.html'],
    ['文章', p + 'guide.html'],
    ['分类', p + 'reference.html'],
    ['关于', p + 'help.html'],
    ['归档', p + 'changelog.html'],
  ].map(function(item) {
    return '<a class="VPLink link VPNavBarMenuLink" href="' + item[1] + '" tabindex="0"><span>' + item[0] + '</span></a>';
  }).join('');
}

function transformBasics(content, filePath, opts) {
  opts = opts || {};
  const depth = getDepth(filePath);
  const p = pfx(depth);
  
  content = content.replace(/<title>[^<]*<\/title>/, '<title>' + (opts.title || siteName) + ' | ' + siteName + '</title>');
  content = content.replace(/name="description" content="[^"]*"/, 'name="description" content="' + (opts.description || siteDesc) + '"');
  
  content = content.replace(/<span data-v-8988568e>Escrcpy<\/span>/g, '<span data-v-8988568e>' + siteName + '</span>');
  content = content.replace(/alt="Escrcpy"/g, 'alt="' + siteName + '"');
  
  const titleLinkRe = /href="index\.html" data-v-8988568e>/g;
  if (titleLinkRe.test(content)) {
    content = content.replace(titleLinkRe, 'href="' + p + 'index.html" data-v-8988568e>');
  }
  
  const navRe = /<nav aria-labelledby="main-nav-aria-label" class="VPNavBarMenu menu"[^>]*>[\s\S]*?<\/nav>/;
  if (navRe.test(content)) {
    content = content.replace(navRe, '<nav aria-labelledby="main-nav-aria-label" class="VPNavBarMenu menu"><span id="main-nav-aria-label" class="visually-hidden"> Main Navigation </span>' + buildTopNav(depth) + '</nav>');
  }
  
  const sidebarRe = /<aside class="VPSidebar"[^>]*>[\s\S]*?<\/aside>/;
  if (sidebarRe.test(content)) {
    content = content.replace(sidebarRe, '<aside class="VPSidebar"><div class="curtain"></div><nav class="nav" id="VPSidebarNav" aria-labelledby="sidebar-aria-label" tabindex="-1"><span class="visually-hidden" id="sidebar-aria-label"> Sidebar Navigation </span>' + buildSidebar(depth, opts.activePost, opts.activeCat) + '</nav></aside>');
  }
  
  content = content.replace(/Powered by viarotel/g, siteName);
  content = content.replace(/Copyright © \d+-\d+/g, 'Copyright © 2024');
  content = content.replace(/搜索文档/g, '搜索文章');
  
  content = content.replace(/"title":"Escrcpy"/g, '"title":"' + siteName + '"');
  content = content.replace(/"alt":"Escrcpy"/g, '"alt":"' + siteName + '"');
  content = content.replace(/Escrcpy/g, siteName);
  
  return content;
}

function replaceMainContent(content, newMainContent) {
  const firstFeature = content.indexOf('<div class="VPFeatures VPHomeFeatures');
  const footerIdx = content.indexOf('<footer class="VPFooter');
  
  if (firstFeature >= 0 && footerIdx > firstFeature) {
    const before = content.substring(0, firstFeature);
    const after = content.substring(footerIdx);
    return before + newMainContent + after;
  }
  
  return content;
}

function findDivEnd(html, startIdx) {
  let depth = 0;
  let i = startIdx;
  while (i < html.length) {
    if (html.substring(i, i + 4) === '<div') depth++;
    if (html.substring(i, i + 6) === '</div>') {
      depth--;
      if (depth === 0) return i + 6;
    }
    i++;
  }
  return -1;
}

function buildHome() {
  const tpl = readFile(path.join(zhHans, 'index.html'));
  let c = transformBasics(tpl, path.join(zhHans, 'index.html'), { title: siteName });
  
  const vpHeroStart = c.indexOf('<div class="VPHero');
  let vpHeroEnd = -1;
  
  if (vpHeroStart >= 0) {
    vpHeroEnd = findDivEnd(c, vpHeroStart);
    if (vpHeroEnd > vpHeroStart) {
      const newHero = '<div class="VPHero VPHomeHero" data-v-8daf32b6 data-v-8048a6a6>' +
        '<div class="container" data-v-8048a6a6>' +
          '<div class="main" data-v-8048a6a6>' +
            '<h1 class="heading" data-v-8048a6a6><span class="name clip" data-v-8048a6a6>' + siteName + '</span><span class="text" data-v-8048a6a6>' + siteTagline + '</span></h1>' +
            '<p class="tagline" data-v-8048a6a6>' + siteDesc + '</p>' +
            '<div class="actions" data-v-8048a6a6>' +
              '<div class="action" data-v-8048a6a6><a class="VPButton medium brand" data-v-af1defe7 href="guide.html">开始阅读 📚</a></div>' +
              '<div class="action" data-v-8048a6a6><a class="VPButton medium alt" data-v-af1defe7 href="reference.html">浏览分类</a></div>' +
              '<div class="action" data-v-8048a6a6><a class="VPButton medium alt" data-v-af1defe7 href="help.html">关于我</a></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
      c = c.substring(0, vpHeroStart) + newHero + c.substring(vpHeroEnd);
    }
  }
  
  const catIcons = ['📝', '💻', '📷', '🎨'];
  const catsHtml = categories.map(function(cat, i) {
    return '<div class="item VPFeature" data-v-2d71e621><a class="VPLink link" href="reference/' + cat.slug + '.html" style="text-decoration:none;color:inherit;"><div class="icon" data-v-2d71e621>' + catIcons[i] + '</div><h2 data-v-2d71e621>' + cat.name + '</h2><p data-v-2d71e621>' + cat.desc + '</p></a></div>';
  }).join('');
  
  const postsHtml = posts.slice(0, 3).map(function(post) {
    return '<div class="item VPFeature" data-v-2d71e621><a class="VPLink link" href="guide/' + post.slug + '.html" style="text-decoration:none;color:inherit;"><div class="icon" data-v-2d71e621>📄</div><h2 data-v-2d71e621>' + post.title + '</h2><p data-v-2d71e621>' + post.excerpt + '</p><div style="margin-top:12px;font-size:0.85rem;opacity:0.7;" data-v-2d71e621>' + post.category + ' · ' + post.date + '</div></a></div>';
  }).join('');
  
  const newFeatures = '<div class="VPFeatures VPHomeFeatures" data-v-7b3b6e6c><div class="container" data-v-7b3b6e6c><h2 class="VPHomeFeatures-title" data-v-7b3b6e6c>文章分类</h2><div class="items" data-v-7b3b6e6c>' + catsHtml + '</div></div></div>' +
    '<div class="VPFeatures VPHomeFeatures" data-v-7b3b6e6c><div class="container" data-v-7b3b6e6c><h2 class="VPHomeFeatures-title" data-v-7b3b6e6c>最新文章</h2><div class="items" data-v-7b3b6e6c>' + postsHtml + '</div><div style="text-align:center;margin-top:32px;" data-v-7b3b6e6c><a class="VPButton medium alt" data-v-af1defe7 href="guide.html">查看全部文章 →</a></div></div></div>';
  
  while (true) {
    const featIdx = c.indexOf('<div class="VPFeatures VPHomeFeatures');
    if (featIdx < 0) break;
    const featEnd = findDivEnd(c, featIdx);
    if (featEnd < 0) break;
    c = c.substring(0, featIdx) + c.substring(featEnd);
  }
  
  const vpfFooter = '<footer class="VPFooter" data-v-5e58cf28 data-v-460faef1><div class="container" data-v-460faef1><p class="message" data-v-460faef1>\n        <span>Views <span id="busuanzi_site_pv">0</span>, </span>\n        <span>Visitors <span id="busuanzi_site_uv">0</span></span>\n        <br />\n        <span>TodayViews <span id="busuanzi_today_pv">0</span>, </span>\n        <span>TodayVisitors <span id="busuanzi_today_uv">0</span></span>\n        <br />\n      </p><p class="copyright" data-v-460faef1>Copyright © 2024 ' + siteName + '</p></div></footer>';
  
  while (true) {
    const footIdx = c.indexOf('<footer class="VPFooter');
    if (footIdx < 0) break;
    const footEnd = c.indexOf('</footer>', footIdx);
    if (footEnd < 0) break;
    c = c.substring(0, footIdx) + c.substring(footEnd + 8);
  }
  
  const scriptIdx = c.indexOf('<script>window.__VP_HASH_MAP__');
  if (scriptIdx > 0) {
    c = c.substring(0, scriptIdx) + newFeatures + vpfFooter + '\n' + c.substring(scriptIdx);
  }
  
  return c;
}

function replaceDocContent(content, newDocContent) {
  const vpDocRe = /<div[^>]*class="vp-doc [^"]*"[^>]*>/;
  const vpDocFooterRe = /<footer class="VPDocFooter[^"]*"[^>]*>[\s\S]*?<\/footer>/;
  
  if (vpDocRe.test(content) && vpDocFooterRe.test(content)) {
    const vpDocMatch = content.match(vpDocRe);
    const vpDocIdx = vpDocMatch.index;
    const footerMatch = content.match(vpDocFooterRe);
    const footerEndIdx = footerMatch.index + footerMatch[0].length;
    
    if (footerEndIdx > vpDocIdx) {
      const before = content.substring(0, vpDocIdx);
      const after = content.substring(footerEndIdx);
      return before + '<div class="vp-doc container"><div style="position:relative;">' + newDocContent + '</div></div></div>' + after;
    }
  }
  
  return content;
}

function buildArticleList() {
  const tpl = readFile(path.join(zhHans, 'guide.html'));
  let c = transformBasics(tpl, path.join(zhHans, 'guide.html'), { title: '全部文章' });
  
  const list = posts.map(function(post) {
    return '<div style="border-bottom:1px solid var(--vp-c-divider);padding:24px 0;"><h2 style="margin:0 0 8px 0;font-size:1.3rem;"><a href="guide/' + post.slug + '.html" style="color:var(--vp-c-text-1);text-decoration:none;">' + post.title + '</a></h2><p style="color:var(--vp-c-text-2);margin:0 0 12px 0;">' + post.excerpt + '</p><div style="font-size:0.85rem;color:var(--vp-c-text-3);"><span>' + post.category + '</span> · <span>' + post.author + '</span> · <span>' + post.date + '</span></div></div>';
  }).join('');
  
  const content = '<h1>全部文章</h1><p style="color:var(--vp-c-text-2);">共 ' + posts.length + ' 篇文章</p><div>' + list + '</div>';
  
  c = replaceDocContent(c, content);
  
  return c;
}

function buildCategoryList() {
  const tpl = readFile(path.join(zhHans, 'reference.html'));
  let c = transformBasics(tpl, path.join(zhHans, 'reference.html'), { title: '文章分类' });
  
  const catList = categories.map(function(cat) {
    const catPosts = posts.filter(function(p) { return p.category === cat.name; });
    const pl = catPosts.map(function(post) {
      return '<li style="margin:8px 0;"><a href="guide/' + post.slug + '.html" style="color:var(--vp-c-text-1);">' + post.title + '</a> <span style="color:var(--vp-c-text-3);font-size:0.85rem;">· ' + post.date + '</span></li>';
    }).join('');
    return '<div style="margin-bottom:32px;"><h2 style="margin-bottom:12px;">' + cat.name + ' <span style="font-size:0.9rem;color:var(--vp-c-text-3);">（' + cat.count + ' 篇）</span></h2><p style="color:var(--vp-c-text-2);margin-bottom:12px;">' + cat.desc + '</p><ul style="list-style:none;padding-left:0;">' + pl + '</ul></div>';
  }).join('');
  
  const content = '<h1>文章分类</h1><p style="color:var(--vp-c-text-2);">共 ' + categories.length + ' 个分类</p>' + catList;
  
  c = replaceDocContent(c, content);
  
  return c;
}

function buildCategoryDetail(cat) {
  const tpl = readFile(path.join(zhHans, 'reference', 'index.html'));
  const fp = path.join(zhHans, 'reference', cat.slug + '.html');
  let c = transformBasics(tpl, fp, { title: cat.name, description: cat.desc, activeCat: cat });
  
  const catPosts = posts.filter(function(p) { return p.category === cat.name; });
  const pl = catPosts.map(function(post) {
    return '<div style="border-bottom:1px solid var(--vp-c-divider);padding:20px 0;"><h3 style="margin:0 0 8px 0;"><a href="../guide/' + post.slug + '.html" style="color:var(--vp-c-text-1);text-decoration:none;">' + post.title + '</a></h3><p style="color:var(--vp-c-text-2);margin:0 0 8px 0;font-size:0.9rem;">' + post.excerpt + '</p><div style="font-size:0.85rem;color:var(--vp-c-text-3);">' + post.author + ' · ' + post.date + '</div></div>';
  }).join('');
  
  const content = '<h1>' + cat.name + '</h1><p style="color:var(--vp-c-text-2);">' + cat.desc + '</p><p style="color:var(--vp-c-text-3);">共 ' + catPosts.length + ' 篇文章</p>' + pl;
  
  c = replaceDocContent(c, content);
  
  return c;
}

function buildArticle(post) {
  const tpl = readFile(path.join(zhHans, 'guide', 'started.html'));
  const fp = path.join(zhHans, 'guide', post.slug + '.html');
  let c = transformBasics(tpl, fp, { title: post.title, description: post.excerpt, activePost: post });
  
  const articleHtml = renderMarkdown(post.content);
  const tagsHtml = post.tags.map(function(t) { return '<span style="padding:2px 8px;background:var(--vp-c-bg-soft);border-radius:4px;color:var(--vp-c-text-2);">#' + t + '</span>'; }).join('');
  
  const content = '<div style="margin-bottom:32px;padding-bottom:16px;border-bottom:1px solid var(--vp-c-divider);"><div style="font-size:0.9rem;color:var(--vp-c-text-3);margin-bottom:8px;"><span>' + post.category + '</span> · <span>' + post.author + '</span> · <span>' + post.date + '</span></div><div style="font-size:0.85rem;display:flex;gap:8px;flex-wrap:wrap;">' + tagsHtml + '</div></div>' + articleHtml;
  
  c = replaceDocContent(c, content);
  
  return c;
}

function buildAbout() {
  const tpl = readFile(path.join(zhHans, 'help.html'));
  let c = transformBasics(tpl, path.join(zhHans, 'help.html'), { title: '关于' });
  
  const html = `
<h1>关于 Marginalia</h1>
<p>Marginalia，意为"页边注"——那些在阅读时随手写在书页空白处的想法、疑问和感悟。</p>
<p>这个博客是我记录思考、分享发现的地方。在这里，你会找到关于阅读、写作、技术、摄影和生活的文字。</p>
<h2>关于我</h2>
<p>我是一个热爱文字和技术的人。相信慢阅读的力量，相信好的写作需要时间沉淀。</p>
<p>在这个信息过载的时代，我想做一个慢下来的人——慢慢读，慢慢写，慢慢生活。</p>
<h2>为什么叫 Marginalia</h2>
<p>Marginalia 是一个拉丁语词汇，指的是书籍页边空白处的手写笔记。</p>
<p>古人读书时，喜欢在书页的空白处写下自己的思考、评论和疑问。这些边注往往比正文更有趣、更真实。</p>
<p>这个博客就是我的"页边注"——记录我在生活这本大书的空白处写下的想法。</p>
<h2>联系方式</h2>
<p>如果你想和我交流，欢迎通过<a href="contact.html">留言</a>的方式找到我。</p>
  `;
  
  c = replaceDocContent(c, html);
  
  return c;
}

function buildArchive() {
  const tpl = readFile(path.join(zhHans, 'changelog.html'));
  let c = transformBasics(tpl, path.join(zhHans, 'changelog.html'), { title: '文章归档' });
  
  const sorted = [...posts].sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  const html = '<h1>文章归档</h1><p style="color:var(--vp-c-text-2);">共 ' + posts.length + ' 篇文章</p>' + sorted.map(function(post) {
    return '<div style="display:flex;gap:16px;padding:12px 0;border-bottom:1px solid var(--vp-c-divider);"><span style="color:var(--vp-c-text-3);min-width:100px;">' + post.date + '</span><a href="guide/' + post.slug + '.html" style="color:var(--vp-c-text-1);text-decoration:none;">' + post.title + '</a><span style="color:var(--vp-c-text-3);margin-left:auto;">' + post.category + '</span></div>';
  }).join('');
  
  c = replaceDocContent(c, html);
  
  return c;
}

function buildLinks() {
  const tpl = readFile(path.join(zhHans, 'donate.html'));
  let c = transformBasics(tpl, path.join(zhHans, 'donate.html'), { title: '友情链接' });
  
  const html = `
<h1>友情链接</h1>
<p>这里是一些我常读的优秀博客和网站，推荐给你。</p>
<h2>技术类</h2>
<ul>
<li><a href="#" style="color:var(--vp-c-brand);">示例博客 1</a> — 技术分享与编程心得</li>
<li><a href="#" style="color:var(--vp-c-brand);">示例博客 2</a> — 前端开发与设计</li>
</ul>
<h2>生活类</h2>
<ul>
<li><a href="#" style="color:var(--vp-c-brand);">示例博客 3</a> — 慢生活与阅读</li>
<li><a href="#" style="color:var(--vp-c-brand);">示例博客 4</a> — 摄影与旅行</li>
</ul>
<h2>申请友链</h2>
<p>如果你也有博客，想交换友链，欢迎通过<a href="contact.html">留言</a>联系我。</p>
  `;
  
  c = replaceDocContent(c, html);
  
  return c;
}

function buildContact() {
  const tpl = readFile(path.join(zhHans, 'contact.html'));
  let c = transformBasics(tpl, path.join(zhHans, 'contact.html'), { title: '留言板' });
  
  const html = `
<h1>留言板</h1>
<p>有什么想说的？欢迎在这里留言。</p>
<div style="background:var(--vp-c-bg-soft);padding:24px;border-radius:8px;margin:24px 0;">
<h3 style="margin-top:0;">📝 联系方式</h3>
<ul>
<li>邮箱：hello@example.com</li>
<li>GitHub：<a href="#" style="color:var(--vp-c-brand);">@username</a></li>
</ul>
</div>
<h2>最近留言</h2>
<p style="color:var(--vp-c-text-3);font-style:italic;">还没有留言，来抢沙发吧~</p>
  `;
  
  c = replaceDocContent(c, html);
  
  return c;
}

console.log('=== Starting blog conversion v3 ===\n');

writeFile(path.join(zhHans, 'index.html'), buildHome());
console.log('✓ 首页');

writeFile(path.join(zhHans, 'guide.html'), buildArticleList());
console.log('✓ 文章列表');

writeFile(path.join(zhHans, 'reference.html'), buildCategoryList());
console.log('✓ 分类列表');

categories.forEach(function(cat) {
  writeFile(path.join(zhHans, 'reference', cat.slug + '.html'), buildCategoryDetail(cat));
  console.log('✓ 分类：' + cat.name);
});

posts.forEach(function(post) {
  writeFile(path.join(zhHans, 'guide', post.slug + '.html'), buildArticle(post));
  console.log('✓ 文章：' + post.title.substring(0, 18));
});

writeFile(path.join(zhHans, 'help.html'), buildAbout());
console.log('✓ 关于');

writeFile(path.join(zhHans, 'changelog.html'), buildArchive());
console.log('✓ 归档');

writeFile(path.join(zhHans, 'donate.html'), buildLinks());
console.log('✓ 友链');

writeFile(path.join(zhHans, 'contact.html'), buildContact());
console.log('✓ 留言');

console.log('\n=== 全部完成 ===');