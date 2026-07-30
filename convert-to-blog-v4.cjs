/**
 * v4: 保持原版 Escrcpy 网站结构不变，只替换正文内容和网站名称
 * 保留所有 data-v 属性、侧边栏、导航栏、页脚等原版结构
 */
const fs = require('fs');
const path = require('path');

const base = 'C:/Users/qiyu/AppData/Roaming/TRAE SOLO CN/ModularData/ai-agent/work-mode-projects/6a641c34aeff9643835af5d6/viarotel-docs';
const zhHans = path.join(base, 'zhHans');

const siteName = '博客部署教程';

function readFile(p) { return fs.readFileSync(p, 'utf8'); }
function writeFile(p, c) { fs.writeFileSync(p, c, 'utf8'); }

/**
 * 全局替换品牌名称和通用文本
 */
function replaceBrand(content) {
  let c = content;
  c = c.replace(/Escrcpy/g, siteName);
  c = c.replace(/搜索文档/g, '搜索文章');
  c = c.replace(/Copyright © 2023-2026 Powered by viarotel/g, 'Copyright © 2024 ' + siteName);
  c = c.replace(/使用图形化的 scrcpy 显示和控制你的安卓设备/g, '从零开始搭建你的个人博客网站');
  c = c.replace(/name="description" content="[^"]*"/, 'name="description" content="' + siteName + ' - 从零开始搭建你的个人博客网站"');
  return c;
}

/**
 * 替换正文内容：找到 <main> 到 </main> 之间的内容并替换
 * 保留 vp-doc 的外层 div 结构
 */
function replaceMainContent(html, newContent) {
  const mainStart = html.indexOf('<main class="main"');
  if (mainStart < 0) return html;
  const mainEnd = html.indexOf('</main>', mainStart);
  if (mainEnd < 0) return html;

  // 保留 <main> 标签和 vp-doc 外层 div，只替换内部 <div>...</div> 的内容
  const mainOpenTag = html.substring(mainStart, html.indexOf('>', mainStart) + 1);
  const afterMain = html.substring(mainStart + mainOpenTag.length, mainEnd);

  // 找到 vp-doc div 的位置
  const vpDocIdx = afterMain.indexOf('<div style="position:relative;" class="vp-doc');
  if (vpDocIdx < 0) {
    // 没有 vp-doc 结构，直接替换整个 main 内容
    return html.substring(0, mainStart) + mainOpenTag + newContent + html.substring(mainEnd);
  }

  const vpDocOpenEnd = afterMain.indexOf('>', vpDocIdx) + 1;
  // 找到 vp-doc div 后面的第一个 <div>（正文内容的容器）
  const innerDivStart = afterMain.indexOf('<div>', vpDocOpenEnd);
  if (innerDivStart < 0) {
    // 直接在 vp-doc div 内放内容
    const before = afterMain.substring(0, vpDocOpenEnd);
    const after = afterMain.substring(vpDocOpenEnd);
    return html.substring(0, mainStart) + mainOpenTag + before + newContent + after + html.substring(mainEnd);
  }

  // 找到正文容器的闭合 </div>（最后一个 </div> 在 vp-doc 的闭合之前）
  const innerDivEnd = afterMain.lastIndexOf('</div>');
  if (innerDivEnd < innerDivStart) return html;

  const before = afterMain.substring(0, innerDivStart);
  const after = afterMain.substring(innerDivEnd);

  return html.substring(0, mainStart) + mainOpenTag + before + '<div>' + newContent + '</div>' + after + html.substring(mainEnd);
}

/**
 * 修改页面标题
 */
function replaceTitle(html, newTitle) {
  return html.replace(/<title>[^<]*<\/title>/, '<title>' + newTitle + ' | ' + siteName + '</title>');
}

/**
 * 修改侧边栏文本（通过正则替换侧边栏中的文字）
 */
function replaceSidebarText(html) {
  let c = html;
  c = c.replace(/<h2 class="text" data-v-9d2f0eb2>指引<\/h2>/g, '<h2 class="text" data-v-9d2f0eb2>搭建指南</h2>');
  c = c.replace(/<p class="text" data-v-9d2f0eb2>快速上手<\/p>/g, '<p class="text" data-v-9d2f0eb2>环境准备</p>');
  c = c.replace(/<p class="text" data-v-9d2f0eb2>里程碑<\/p>/g, '<p class="text" data-v-9d2f0eb2>创建项目</p>');
  c = c.replace(/<p class="text" data-v-9d2f0eb2>操作指南<\/p>/g, '<p class="text" data-v-9d2f0eb2>写作指南</p>');
  c = c.replace(/<p class="text" data-v-9d2f0eb2>偏好设置<\/p>/g, '<p class="text" data-v-9d2f0eb2>主题配置</p>');
  c = c.replace(/<p class="text" data-v-9d2f0eb2>窗口编排<\/p>/g, '<p class="text" data-v-9d2f0eb2>部署上线</p>');
  c = c.replace(/<h2 class="text" data-v-9d2f0eb2>参考手册<\/h2>/g, '<h2 class="text" data-v-9d2f0eb2>参考资料</h2>');
  c = c.replace(/<h2 class="text" data-v-9d2f0eb2>帮助<\/h2>/g, '<h2 class="text" data-v-9d2f0eb2>常见问题</h2>');
  c = c.replace(/<p class="text" data-v-9d2f0eb2>捐赠项目<\/p>/g, '<p class="text" data-v-9d2f0eb2>赞助我们</p>');
  c = c.replace(/<p class="text" data-v-9d2f0eb2>联系我们<\/p>/g, '<p class="text" data-v-9d2f0eb2>联系我</p>');
  c = c.replace(/<p class="text" data-v-9d2f0eb2>更新日志<\/p>/g, '<p class="text" data-v-9d2f0eb2>更新日志</p>');
  return c;
}

/**
 * 修改导航栏文本
 */
function replaceNavText(html) {
  let c = html;
  c = c.replace(/<span data-v-5fd9369f>指南<\/span>/g, '<span data-v-5fd9369f>指南</span>');
  c = c.replace(/<span data-v-5fd9369f>参考<\/span>/g, '<span data-v-5fd9369f>参考</span>');
  c = c.replace(/<span data-v-5fd9369f>帮助<\/span>/g, '<span data-v-5fd9369f>帮助</span>');
  return c;
}

/**
 * 处理单个文件：替换品牌名、标题、正文内容
 */
function processFile(filePath, opts) {
  opts = opts || {};
  let c = readFile(filePath);

  // 全局品牌替换
  c = replaceBrand(c);
  c = replaceSidebarText(c);
  c = replaceNavText(c);

  // 修改标题
  if (opts.title) {
    c = replaceTitle(c, opts.title);
  }

  // 替换正文内容
  if (opts.content) {
    c = replaceMainContent(c, opts.content);
  }

  // 修改上一页/下一页
  if (opts.prevNext) {
    if (opts.prevNext.prev) {
      c = c.replace(/<span class="title" data-v-c29125ee>[^<]*<\/span>\s*<!--\[-->\s*<\/a>/, function(match) {
        return match.replace(/<span class="title" data-v-c29125ee>[^<]*<\/span>/, '<span class="title" data-v-c29125ee>' + opts.prevNext.prev + '</span>');
      });
    }
    if (opts.prevNext.next) {
      c = c.replace(/<span class="desc" data-v-c29125ee>下一页<\/span><span class="title" data-v-c29125ee>[^<]*<\/span>/, '<span class="desc" data-v-c29125ee>下一页</span><span class="title" data-v-c29125ee>' + opts.prevNext.next + '</span>');
    }
  }

  return c;
}

/**
 * 从 guide/ 下的原版文件恢复根目录文件
 * 修改路径前缀（从 ../ 改为 ./）
 */
function restoreRootFile(sourcePath, targetPath, opts) {
  let c = readFile(sourcePath);

  // 修改路径前缀：guide/ 下的文件用 ../index.html，根目录用 ./index.html 或 index.html
  // 导航栏链接
  c = c.replace(/href="\.\.\/guide\.html"/g, 'href="guide.html"');
  c = c.replace(/href="\.\.\/reference\.html"/g, 'href="reference.html"');
  c = c.replace(/href="\.\.\/help\.html"/g, 'href="help.html"');
  c = c.replace(/href="\.\.\/changelog\.html"/g, 'href="changelog.html"');
  c = c.replace(/href="\.\.\/donate\.html"/g, 'href="donate.html"');
  c = c.replace(/href="\.\.\/contact\.html"/g, 'href="contact.html"');

  // 侧边栏链接
  c = c.replace(/href="\.\.\/guide\/index\.html"/g, 'href="guide/index.html"');
  c = c.replace(/href="\.\.\/guide\/started\.html"/g, 'href="guide/started.html"');
  c = c.replace(/href="\.\.\/guide\/milestones\.html"/g, 'href="guide/milestones.html"');
  c = c.replace(/href="\.\.\/guide\/operation\.html"/g, 'href="guide/operation.html"');
  c = c.replace(/href="\.\.\/guide\/preferences\.html"/g, 'href="guide/preferences.html"');
  c = c.replace(/href="\.\.\/guide\/window-arrangement\.html"/g, 'href="guide/window-arrangement.html"');
  c = c.replace(/href="\.\.\/reference\/index\.html"/g, 'href="reference/index.html"');
  c = c.replace(/href="\.\.\/reference\/gnirehtet\/index\.html"/g, 'href="reference/gnirehtet/index.html"');
  c = c.replace(/href="\.\.\/reference\/gnirehtet\/api\.html"/g, 'href="reference/gnirehtet/api.html"');
  c = c.replace(/href="\.\.\/reference\/scrcpy\/index\.html"/g, 'href="reference/scrcpy/index.html"');
  c = c.replace(/href="\.\.\/reference\/scrcpy\//g, 'href="reference/scrcpy/');
  c = c.replace(/href="\.\.\/help\/index\.html"/g, 'href="help/index.html"');
  c = c.replace(/href="\.\.\/help\/escrcpy\.html"/g, 'href="help/escrcpy.html"');
  c = c.replace(/href="\.\.\/help\/scrcpy\.html"/g, 'href="help/scrcpy.html"');

  // 标题链接和 logo 路径
  c = c.replace(/href="\.\.\/index\.html"/g, 'href="index.html"');
  c = c.replace(/src="\.\.\/\.\.\/images\//g, 'src="../images/');
  c = c.replace(/href="\.\.\/\.\.\/assets\//g, 'href="../assets/');
  c = c.replace(/src="\.\.\/\.\.\/assets\//g, 'src="../assets/');

  // CSS 路径
  c = c.replace(/href="\.\.\/\.\.\/assets\//g, 'href="../assets/');
  c = c.replace(/href="\.\.\/\.\.\/vp-icons\.css"/g, 'href="../vp-icons.css"');

  // 修改 vp-doc 的 class（路径相关）
  c = c.replace(/class="vp-doc _zhHans_guide[^"]*"/g, 'class="vp-doc _zhHans_"');

  // 全局品牌替换
  c = replaceBrand(c);
  c = replaceSidebarText(c);
  c = replaceNavText(c);

  // 修改标题
  if (opts.title) {
    c = replaceTitle(c, opts.title);
  }

  // 替换正文内容
  if (opts.content) {
    c = replaceMainContent(c, opts.content);
  }

  return c;
}

// ===== 博客部署教程内容 =====

const contentGuideIndex = `
<h1 id="博客部署教程" tabindex="-1">${siteName} <a class="header-anchor" href="#博客部署教程" aria-label="Permalink to &quot;博客部署教程&quot;">​</a></h1>
<h2 id="什么是博客部署教程" tabindex="-1">什么是${siteName}？ <a class="header-anchor" href="#什么是博客部署教程" aria-label="Permalink">​</a></h2>
<p>这是一份从零开始搭建个人博客网站的完整教程。我们将使用 VitePress —— 一个基于 Vue 的静态网站生成器，帮助你快速构建美观、高性能的博客网站。</p>
<h2 id="核心内容" tabindex="-1">核心内容 <a class="header-anchor" href="#核心内容" aria-label="Permalink">​</a></h2>
<h3 id="环境准备" tabindex="-1">环境准备 <a class="header-anchor" href="#环境准备" aria-label="Permalink">​</a></h3>
<ul>
<li>Node.js 安装与配置</li>
<li>npm/pnpm 包管理器使用</li>
<li>Git 版本控制工具</li>
</ul>
<h3 id="项目搭建" tabindex="-1">项目搭建 <a class="header-anchor" href="#项目搭建" aria-label="Permalink">​</a></h3>
<ul>
<li>VitePress 项目初始化</li>
<li>目录结构规划</li>
<li>基础配置文件编写</li>
</ul>
<h3 id="内容写作" tabindex="-1">内容写作 <a class="header-anchor" href="#内容写作" aria-label="Permalink">​</a></h3>
<ul>
<li>Markdown 语法基础</li>
<li>文章创建与组织</li>
<li> frontmatter 配置</li>
</ul>
<h3 id="部署上线" tabindex="-1">部署上线 <a class="header-anchor" href="#部署上线" aria-label="Permalink">​</a></h3>
<ul>
<li>GitHub Pages 部署</li>
<li>Cloudflare Pages 部署</li>
<li>Vercel 部署</li>
<li>自定义域名配置</li>
</ul>
<h2 id="适合人群" tabindex="-1">适合人群 <a class="header-anchor" href="#适合人群" aria-label="Permalink">​</a></h2>
<p>本教程适合以下人群：</p>
<ol>
<li>想要搭建个人博客的开发者</li>
<li>对静态网站生成器感兴趣的前端爱好者</li>
<li>希望拥有独立博客空间的技术写作者</li>
<li>想要学习 VitePress 的开发者</li>
</ol>
<h2 id="技术栈" tabindex="-1">技术栈 <a class="header-anchor" href="#技术栈" aria-label="Permalink">​</a></h2>
<ul>
<li>VitePress - 静态网站生成器</li>
<li>Vue 3 - 前端框架</li>
<li>Markdown - 内容编写格式</li>
<li>Node.js - 运行环境</li>
</ul>
<h2 id="如何开始" tabindex="-1">如何开始 <a class="header-anchor" href="#如何开始" aria-label="Permalink">​</a></h2>
<p>准备好了吗？让我们从环境准备开始：</p>
<p><a href="guide/started.html">环境准备 👉</a></p>
<h2 id="结语" tabindex="-1">结语 <a class="header-anchor" href="#结语" aria-label="Permalink">​</a></h2>
<p>通过本教程，你将学会如何从零搭建一个功能完整、美观大方的个人博客网站。无论你是技术博主还是生活记录者，都能找到适合自己的搭建方案。</p>
`;

const contentStarted = `
<h1 id="环境准备" tabindex="-1">环境准备 <a class="header-anchor" href="#环境准备" aria-label="Permalink">​</a></h1>
<h2 id="安装-node-js" tabindex="-1">安装 Node.js <a class="header-anchor" href="#安装-node-js" aria-label="Permalink">​</a></h2>
<p>VitePress 需要 Node.js 18 或更高版本。请前往 <a href="https://nodejs.org" target="_blank">Node.js 官网</a> 下载并安装 LTS（长期支持）版本。</p>
<p>安装完成后，在终端中验证：</p>
<div class="language-bash vp-adaptive-theme"><button class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>node -v</span></span>
<span class="line"><span>npm -v</span></span></code></pre></div>
<h2 id="安装-pnpm" tabindex="-1">安装 pnpm（推荐） <a class="header-anchor" href="#安装-pnpm" aria-label="Permalink">​</a></h2>
<p>pnpm 是一个快速、节省磁盘空间的包管理器，推荐使用：</p>
<div class="language-bash vp-adaptive-theme"><button class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>npm install -g pnpm</span></span></code></pre></div>
<h2 id="安装-git" tabindex="-1">安装 Git <a class="header-anchor" href="#安装-git" aria-label="Permalink">​</a></h2>
<p>Git 是版本控制工具，用于管理你的博客代码和部署到 GitHub。</p>
<ul>
<li>Windows：下载 <a href="https://git-scm.com" target="_blank">Git for Windows</a></li>
<li>macOS：使用 Homebrew 安装 <code>brew install git</code></li>
<li>Linux：使用包管理器安装，如 <code>sudo apt install git</code></li>
</ul>
<h2 id="注册-github" tabindex="-1">注册 GitHub 账号 <a class="header-anchor" href="#注册-github" aria-label="Permalink">​</a></h2>
<p>如果你还没有 GitHub 账号，请前往 <a href="https://github.com" target="_blank">GitHub 官网</a> 注册一个免费账号。我们将使用 GitHub 来托管博客代码并通过 GitHub Pages 部署博客。</p>
<h2 id="验证环境" tabindex="-1">验证环境 <a class="header-anchor" href="#验证环境" aria-label="Permalink">​</a></h2>
<p>确保以下工具都已安装并可用：</p>
<div class="language-bash vp-adaptive-theme"><button class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>node -v    # v18.0.0 或更高</span></span>
<span class="line"><span>pnpm -v    # 8.x 或更高</span></span>
<span class="line"><span>git --version    # 任意版本</span></span></code></pre></div>
<p>如果以上命令都能正常输出版本号，说明环境准备就绪！</p>
<h2 id="下一步" tabindex="-1">下一步 <a class="header-anchor" href="#下一步" aria-label="Permalink">​</a></h2>
<p>环境准备好了，让我们开始 <a href="milestones.html">创建项目</a>。</p>
`;

const contentMilestones = `
<h1 id="创建项目" tabindex="-1">创建项目 <a class="header-anchor" href="#创建项目" aria-label="Permalink">​</a></h1>
<h2 id="初始化项目" tabindex="-1">初始化项目 <a class="header-anchor" href="#初始化项目" aria-label="Permalink">​</a></h2>
<p>创建一个新的项目目录并初始化：</p>
<div class="language-bash vp-adaptive-theme"><button class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>mkdir my-blog</span></span>
<span class="line"><span>cd my-blog</span></span>
<span class="line"><span>pnpm init</span></span></code></pre></div>
<h2 id="安装-vitepress" tabindex="-1">安装 VitePress <a class="header-anchor" href="#安装-vitepress" aria-label="Permalink">​</a></h2>
<div class="language-bash vp-adaptive-theme"><button class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>pnpm add -D vitepress</span></span></code></pre></div>
<h2 id="目录结构" tabindex="-1">目录结构 <a class="header-anchor" href="#目录结构" aria-label="Permalink">​</a></h2>
<p>创建以下目录结构：</p>
<div class="language-text vp-adaptive-theme"><button class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>.</span></span>
<span class="line"><span>├── docs/</span></span>
<span class="line"><span>│   ├── .vitepress/</span></span>
<span class="line"><span>│   │   └── config.mts</span></span>
<span class="line"><span>│   ├── index.md          # 首页</span></span>
<span class="line"><span>│   ├── guide/</span></span>
<span class="line"><span>│   │   ├── index.md      # 指南首页</span></span>
<span class="line"><span>│   │   └── started.md    # 文章页面</span></span>
<span class="line"><span>│   └── public/           # 静态资源</span></span>
<span class="line"><span>└── package.json</span></span></code></pre></div>
<h2 id="配置文件" tabindex="-1">配置文件 <a class="header-anchor" href="#配置文件" aria-label="Permalink">​</a></h2>
<p>在 <code>docs/.vitepress/config.mts</code> 中写入基础配置：</p>
<div class="language-typescript vp-adaptive-theme"><button class="copy"></button><span class="lang">ts</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>import { defineConfig } from 'vitepress'</span></span>
<span class="line"><span></span></span>
<span class="line"><span>export default defineConfig({</span></span>
<span class="line"><span>  title: '我的博客',</span></span>
<span class="line"><span>  description: '个人博客网站',</span></span>
<span class="line"><span>  themeConfig: {</span></span>
<span class="line"><span>    nav: [</span></span>
<span class="line"><span>      { text: '首页', link: '/' },</span></span>
<span class="line"><span>      { text: '指南', link: '/guide/' },</span></span>
<span class="line"><span>    ],</span></span>
<span class="line"><span>    sidebar: {</span></span>
<span class="line"><span>      '/guide/': [</span></span>
<span class="line"><span>        {</span></span>
<span class="line"><span>          text: '指南',</span></span>
<span class="line"><span>          items: [</span></span>
<span class="line"><span>            { text: '快速上手', link: '/guide/started' },</span></span>
<span class="line"><span>          ]</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>      ]</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>})</span></span></code></pre></div>
<h2 id="创建首页" tabindex="-1">创建首页 <a class="header-anchor" href="#创建首页" aria-label="Permalink">​</a></h2>
<p>在 <code>docs/index.md</code> 中写入首页内容：</p>
<div class="language-markdown vp-adaptive-theme"><button class="copy"></button><span class="lang">md</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>---</span></span>
<span class="line"><span>layout: home</span></span>
<span class="line"><span>hero:</span></span>
<span class="line"><span>  name: 我的博客</span></span>
<span class="line"><span>  text: 个人技术博客</span></span>
<span class="line"><span>  tagline: 记录学习与成长</span></span>
<span class="line"><span>  actions:</span></span>
<span class="line"><span>    - theme: brand</span></span>
<span class="line"><span>      text: 开始阅读</span></span>
<span class="line"><span>      link: /guide/</span></span>
<span class="line"><span>---</span></span></code></pre></div>
<h2 id="启动开发服务器" tabindex="-1">启动开发服务器 <a class="header-anchor" href="#启动开发服务器" aria-label="Permalink">​</a></h2>
<p>在 <code>package.json</code> 中添加脚本：</p>
<div class="language-json vp-adaptive-theme"><button class="copy"></button><span class="lang">json</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>{</span></span>
<span class="line"><span>  "scripts": {</span></span>
<span class="line"><span>    "docs:dev": "vitepress dev docs",</span></span>
<span class="line"><span>    "docs:build": "vitepress build docs",</span></span>
<span class="line"><span>    "docs:preview": "vitepress preview docs"</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>}</span></span></code></pre></div>
<p>运行开发服务器：</p>
<div class="language-bash vp-adaptive-theme"><button class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>pnpm docs:dev</span></span></code></pre></div>
<p>打开浏览器访问 <code>http://localhost:5173</code> 即可看到你的博客！</p>
<h2 id="下一步" tabindex="-1">下一步 <a class="header-anchor" href="#下一步" aria-label="Permalink">​</a></h2>
<p>项目创建好了，接下来学习 <a href="operation.html">如何写作文章</a>。</p>
`;

const contentOperation = `
<h1 id="写作指南" tabindex="-1">写作指南 <a class="header-anchor" href="#写作指南" aria-label="Permalink">​</a></h1>
<h2 id="创建文章" tabindex="-1">创建文章 <a class="header-anchor" href="#创建文章" aria-label="Permalink">​</a></h2>
<p>在 <code>docs/guide/</code> 目录下创建 Markdown 文件即可：</p>
<div class="language-bash vp-adaptive-theme"><button class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>touch docs/guide/my-first-post.md</span></span></code></pre></div>
<h2 id="frontmatter" tabindex="-1">Frontmatter 配置 <a class="header-anchor" href="#frontmatter" aria-label="Permalink">​</a></h2>
<p>每篇文章开头可以添加 frontmatter 来配置文章元信息：</p>
<div class="language-markdown vp-adaptive-theme"><button class="copy"></button><span class="lang">md</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>---</span></span>
<span class="line"><span>title: 我的第一篇文章</span></span>
<span class="line"><span>description: 这是文章的描述</span></span>
<span class="line"><span>---</span></span>
<span class="line"><span></span></span>
<span class="line"><span># 文章标题</span></span>
<span class="line"><span></span></span>
<span class="line"><span>正文内容...</span></span></code></pre></div>
<h2 id="markdown-语法" tabindex="-1">Markdown 基础语法 <a class="header-anchor" href="#markdown-语法" aria-label="Permalink">​</a></h2>
<h3 id="标题" tabindex="-1">标题 <a class="header-anchor" href="#标题" aria-label="Permalink">​</a></h3>
<div class="language-markdown vp-adaptive-theme"><button class="copy"></button><span class="lang">md</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span># 一级标题</span></span>
<span class="line"><span>## 二级标题</span></span>
<span class="line"><span>### 三级标题</span></span></code></pre></div>
<h3 id="文本样式" tabindex="-1">文本样式 <a class="header-anchor" href="#文本样式" aria-label="Permalink">​</a></h3>
<div class="language-markdown vp-adaptive-theme"><button class="copy"></button><span class="lang">md</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>**粗体文本**</span></span>
<span class="line"><span>*斜体文本*</span></span>
<span class="line"><span>~~删除线~~</span></span>
<span class="line"><span>\`行内代码\`</span></span></code></pre></div>
<h3 id="列表" tabindex="-1">列表 <a class="header-anchor" href="#列表" aria-label="Permalink">​</a></h3>
<div class="language-markdown vp-adaptive-theme"><button class="copy"></button><span class="lang">md</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>- 无序列表项 1</span></span>
<span class="line"><span>- 无序列表项 2</span></span>
<span class="line"><span></span></span>
<span class="line"><span>1. 有序列表项 1</span></span>
<span class="line"><span>2. 有序列表项 2</span></span></code></pre></div>
<h3 id="链接和图片" tabindex="-1">链接和图片 <a class="header-anchor" href="#链接和图片" aria-label="Permalink">​</a></h3>
<div class="language-markdown vp-adaptive-theme"><button class="copy"></button><span class="lang">md</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>[链接文字](https://example.com)</span></span>
<span class="line"><span>![图片描述](/path/to/image.png)</span></span></code></pre></div>
<h3 id="代码块" tabindex="-1">代码块 <a class="header-anchor" href="#代码块" aria-label="Permalink">​</a></h3>
<div class="language-markdown vp-adaptive-theme"><button class="copy"></button><span class="lang">md</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>\`\`\`bash</span></span>
<span class="line"><span>npm install</span></span>
<span class="line"><span>\`\`\`</span></span></code></pre></div>
<h2 id="文章组织" tabindex="-1">文章组织 <a class="header-anchor" href="#文章组织" aria-label="Permalink">​</a></h2>
<p>建议按以下方式组织文章：</p>
<ul>
<li>按主题分目录：<code>docs/tech/</code>、<code>docs/life/</code></li>
<li>文件名用英文：<code>my-first-post.md</code></li>
<li>文章内用中文标题</li>
</ul>
<h2 id="下一步" tabindex="-1">下一步 <a class="header-anchor" href="#下一步" aria-label="Permalink">​</a></h2>
<p>文章写好了，接下来学习 <a href="preferences.html">主题配置</a>。</p>
`;

const contentPreferences = `
<h1 id="主题配置" tabindex="-1">主题配置 <a class="header-anchor" href="#主题配置" aria-label="Permalink">​</a></h1>
<h2 id="站点配置" tabindex="-1">站点配置 <a class="header-anchor" href="#站点配置" aria-label="Permalink">​</a></h2>
<p>在 <code>config.mts</code> 中配置站点基本信息：</p>
<div class="language-typescript vp-adaptive-theme"><button class="copy"></button><span class="lang">ts</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>export default defineConfig({</span></span>
<span class="line"><span>  title: '我的博客',</span></span>
<span class="line"><span>  description: '记录学习与生活',</span></span>
<span class="line"><span>  lang: 'zh-CN',</span></span>
<span class="line"><span>  lastUpdated: true,</span></span>
<span class="line"><span>  cleanUrls: true,</span></span>
<span class="line"><span>})</span></span></code></pre></div>
<h2 id="导航栏" tabindex="-1">导航栏配置 <a class="header-anchor" href="#导航栏" aria-label="Permalink">​</a></h2>
<div class="language-typescript vp-adaptive-theme"><button class="copy"></button><span class="lang">ts</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>themeConfig: {</span></span>
<span class="line"><span>  nav: [</span></span>
<span class="line"><span>    { text: '首页', link: '/' },</span></span>
<span class="line"><span>    { text: '技术', link: '/tech/' },</span></span>
<span class="line"><span>    { text: '生活', link: '/life/' },</span></span>
<span class="line"><span>    {</span></span>
<span class="line"><span>      text: '更多',</span></span>
<span class="line"><span>      items: [</span></span>
<span class="line"><span>        { text: '关于', link: '/about' },</span></span>
<span class="line"><span>        { text: 'GitHub', link: 'https://github.com' }</span></span>
<span class="line"><span>      ]</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  ]</span></span>
<span class="line"><span>}</span></span></code></pre></div>
<h2 id="侧边栏" tabindex="-1">侧边栏配置 <a class="header-anchor" href="#侧边栏" aria-label="Permalink">​</a></h2>
<div class="language-typescript vp-adaptive-theme"><button class="copy"></button><span class="lang">ts</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>sidebar: {</span></span>
<span class="line"><span>  '/tech/': [</span></span>
<span class="line"><span>    {</span></span>
<span class="line"><span>      text: '技术文章',</span></span>
<span class="line"><span>      items: [</span></span>
<span class="line"><span>        { text: 'Vue', link: '/tech/vue' },</span></span>
<span class="line"><span>        { text: 'React', link: '/tech/react' }</span></span>
<span class="line"><span>      ]</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  ]</span></span>
<span class="line"><span>}</span></span></code></pre></div>
<h2 id="主题色" tabindex="-1">自定义主题色 <a class="header-anchor" href="#主题色" aria-label="Permalink">​</a></h2>
<p>在 <code>docs/.vitepress/theme/</code> 下创建自定义 CSS：</p>
<div class="language-css vp-adaptive-theme"><button class="copy"></button><span class="lang">css</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>:root {</span></span>
<span class="line"><span>  --vp-c-brand: #ff6600;</span></span>
<span class="line"><span>  --vp-c-brand-light: #ff8533;</span></span>
<span class="line"><span>  --vp-c-brand-dark: #cc5200;</span></span>
<span class="line"><span>}</span></span></code></pre></div>
<h2 id="社交链接" tabindex="-1">社交链接 <a class="header-anchor" href="#社交链接" aria-label="Permalink">​</a></h2>
<div class="language-typescript vp-adaptive-theme"><button class="copy"></button><span class="lang">ts</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>socialLinks: [</span></span>
<span class="line"><span>  { icon: 'github', link: 'https://github.com/yourname' },</span></span>
<span class="line"><span>  { icon: 'twitter', link: 'https://twitter.com/yourname' }</span></span>
<span class="line"><span>]</span></span></code></pre></div>
<h2 id="搜索功能" tabindex="-1">搜索功能 <a class="header-anchor" href="#搜索功能" aria-label="Permalink">​</a></h2>
<div class="language-typescript vp-adaptive-theme"><button class="copy"></button><span class="lang">ts</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>search: {</span></span>
<span class="line"><span>  provider: 'local'</span></span>
<span class="line"><span>}</span></span></code></pre></div>
<h2 id="下一步" tabindex="-1">下一步 <a class="header-anchor" href="#下一步" aria-label="Permalink">​</a></h2>
<p>主题配置好了，接下来学习 <a href="window-arrangement.html">部署上线</a>。</p>
`;

const contentDeploy = `
<h1 id="部署上线" tabindex="-1">部署上线 <a class="header-anchor" href="#部署上线" aria-label="Permalink">​</a></h1>
<h2 id="github-pages" tabindex="-1">GitHub Pages 部署 <a class="header-anchor" href="#github-pages" aria-label="Permalink">​</a></h2>
<h3 id="创建仓库" tabindex="-1">创建仓库 <a class="header-anchor" href="#创建仓库" aria-label="Permalink">​</a></h3>
<p>在 GitHub 上创建一个新仓库，并将本地代码推送到远程：</p>
<div class="language-bash vp-adaptive-theme"><button class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>git init</span></span>
<span class="line"><span>git add .</span></span>
<span class="line"><span>git commit -m "init blog"</span></span>
<span class="line"><span>git remote add origin https://github.com/yourname/yourname.github.io.git</span></span>
<span class="line"><span>git push -u origin main</span></span></code></pre></div>
<h3 id="配置-github-actions" tabindex="-1">配置 GitHub Actions <a class="header-anchor" href="#配置-github-actions" aria-label="Permalink">​</a></h3>
<p>创建 <code>.github/workflows/deploy.yml</code>：</p>
<div class="language-yaml vp-adaptive-theme"><button class="copy"></button><span class="lang">yaml</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>name: Deploy</span></span>
<span class="line"><span>on:</span></span>
<span class="line"><span>  push:</span></span>
<span class="line"><span>    branches: [main]</span></span>
<span class="line"><span>permissions:</span></span>
<span class="line"><span>  contents: read</span></span>
<span class="line"><span>  pages: write</span></span>
<span class="line"><span>  id-token: write</span></span>
<span class="line"><span>jobs:</span></span>
<span class="line"><span>  build:</span></span>
<span class="line"><span>    runs-on: ubuntu-latest</span></span>
<span class="line"><span>    steps:</span></span>
<span class="line"><span>      - uses: actions/checkout@v4</span></span>
<span class="line"><span>      - uses: actions/setup-node@v4</span></span>
<span class="line"><span>        with:</span></span>
<span class="line"><span>          node-version: 20</span></span>
<span class="line"><span>      - run: npm ci</span></span>
<span class="line"><span>      - run: npm run docs:build</span></span>
<span class="line"><span>      - uses: actions/upload-pages-artifact@v3</span></span>
<span class="line"><span>        with:</span></span>
<span class="line"><span>          path: docs/.vitepress/dist</span></span>
<span class="line"><span>  deploy:</span></span>
<span class="line"><span>    needs: build</span></span>
<span class="line"><span>    runs-on: ubuntu-latest</span></span>
<span class="line"><span>    environment:</span></span>
<span class="line"><span>      name: github-pages</span></span>
<span class="line"><span>    steps:</span></span>
<span class="line"><span>      - uses: actions/deploy-pages@v4</span></span></code></pre></div>
<h2 id="cloudflare-pages" tabindex="-1">Cloudflare Pages 部署 <a class="header-anchor" href="#cloudflare-pages" aria-label="Permalink">​</a></h2>
<ol>
<li>登录 <a href="https://pages.cloudflare.com" target="_blank">Cloudflare Pages</a></li>
<li>连接 GitHub 仓库</li>
<li>设置构建命令：<code>npm run docs:build</code></li>
<li>设置输出目录：<code>docs/.vitepress/dist</code></li>
<li>点击部署</li>
</ol>
<h2 id="vercel" tabindex="-1">Vercel 部署 <a class="header-anchor" href="#vercel" aria-label="Permalink">​</a></h2>
<ol>
<li>安装 Vercel CLI：<code>npm i -g vercel</code></li>
<li>在项目目录运行：<code>vercel</code></li>
<li>按提示完成配置</li>
<li>生产部署：<code>vercel --prod</code></li>
</ol>
<h2 id="自定义域名" tabindex="-1">自定义域名 <a class="header-anchor" href="#自定义域名" aria-label="Permalink">​</a></h2>
<ol>
<li>购买域名（推荐 Cloudflare、Namecheap）</li>
<li>在部署平台添加自定义域名</li>
<li>配置 DNS 记录（CNAME 或 A 记录）</li>
<li>等待 DNS 生效（可能需要几分钟到几小时）</li>
</ol>
<h2 id="https" tabindex="-1">HTTPS 配置 <a class="header-anchor" href="#https" aria-label="Permalink">​</a></h2>
<p>GitHub Pages、Cloudflare Pages 和 Vercel 都会自动为你的网站配置 HTTPS 证书，无需手动操作。</p>
<h2 id="完成" tabindex="-1">完成 <a class="header-anchor" href="#完成" aria-label="Permalink">​</a></h2>
<p>恭喜！你的博客已经部署上线了！现在你可以：</p>
<ul>
<li>持续写文章，推送代码即可自动更新</li>
<li>配置自定义主题和插件</li>
<li>添加评论系统、访问统计等功能</li>
</ul>
`;

const contentChangelog = `
<h1 id="更新日志" tabindex="-1">更新日志 <a class="header-anchor" href="#更新日志" aria-label="Permalink">​</a></h1>
<h2 id="v1-0-0" tabindex="-1">v1.0.0 <a class="header-anchor" href="#v1-0-0" aria-label="Permalink">​</a></h2>
<p>2024-03-20</p>
<ul>
<li>初始版本发布</li>
<li>完成博客搭建教程全部内容</li>
<li>包含环境准备、项目创建、写作指南、主题配置、部署上线五大章节</li>
</ul>
<h2 id="v0-9-0" tabindex="-1">v0.9.0 <a class="header-anchor" href="#v0-9-0" aria-label="Permalink">​</a></h2>
<p>2024-03-15</p>
<ul>
<li>完成教程初稿</li>
<li>添加 GitHub Pages 部署说明</li>
<li>添加 Cloudflare Pages 部署说明</li>
</ul>
<h2 id="v0-5-0" tabindex="-1">v0.5.0 <a class="header-anchor" href="#v0-5-0" aria-label="Permalink">​</a></h2>
<p>2024-03-10</p>
<ul>
<li>搭建项目框架</li>
<li>编写环境准备和项目创建章节</li>
</ul>
`;

const contentDonate = `
<h1 id="赞助我们" tabindex="-1">赞助我们 <a class="header-anchor" href="#赞助我们" aria-label="Permalink">​</a></h1>
<p>如果这个教程对你有帮助，欢迎赞助支持我们继续创作更多优质内容。</p>
<h2 id="为什么赞助" tabindex="-1">为什么赞助？ <a class="header-anchor" href="#为什么赞助" aria-label="Permalink">​</a></h2>
<ul>
<li>支持开源教程的持续更新</li>
<li>帮助我们购买服务器和域名</li>
<li>激励我们创作更多优质内容</li>
</ul>
<h2 id="赞助方式" tabindex="-1">赞助方式 <a class="header-anchor" href="#赞助方式" aria-label="Permalink">​</a></h2>
<h3 id="wechat" tabindex="-1">微信赞助 <a class="header-anchor" href="#wechat" aria-label="Permalink">​</a></h3>
<p>请扫描下方微信赞助码</p>
<h3 id="alipay" tabindex="-1">支付宝赞助 <a class="header-anchor" href="#alipay" aria-label="Permalink">​</a></h3>
<p>请扫描下方支付宝赞助码</p>
<h3 id="github" tabindex="-1">GitHub Sponsors <a class="header-anchor" href="#github" aria-label="Permalink">​</a></h3>
<p>前往 <a href="https://github.com/sponsors" target="_blank">GitHub Sponsors</a> 赞助我们</p>
<h2 id="致谢" tabindex="-1">致谢 <a class="header-anchor" href="#致谢" aria-label="Permalink">​</a></h2>
<p>感谢所有赞助者的支持！你们的认可是我们前进的动力。</p>
`;

const contentContact = `
<h1 id="联系我" tabindex="-1">联系我 <a class="header-anchor" href="#联系我" aria-label="Permalink">​</a></h1>
<p>如果你在学习过程中遇到问题，或者有好的建议，欢迎通过以下方式联系我。</p>
<h2 id="github" tabindex="-1">GitHub <a class="header-anchor" href="#github" aria-label="Permalink">​</a></h2>
<p>在 GitHub 上提交 Issue 或 PR：</p>
<p><a href="https://github.com" target="_blank">https://github.com</a></p>
<h2 id="email" tabindex="-1">邮件 <a class="header-anchor" href="#email" aria-label="Permalink">​</a></h2>
<p>发送邮件到：</p>
<p><a href="mailto:hello@example.com">hello@example.com</a></p>
<h2 id="social" tabindex="-1">社交媒体 <a class="header-anchor" href="#social" aria-label="Permalink">​</a></h2>
<ul>
<li>Twitter：<a href="https://twitter.com" target="_blank">@yourname</a></li>
<li>微信公众号：搜索"博客部署教程"</li>
</ul>
<h2 id="反馈" tabindex="-1">问题反馈 <a class="header-anchor" href="#反馈" aria-label="Permalink">​</a></h2>
<p>如果你发现教程中有错误或过时的内容，请通过以下方式反馈：</p>
<ol>
<li>在 GitHub 上提交 Issue</li>
<li>发送邮件说明问题</li>
<li>在社交媒体上私信我们</li>
</ol>
<p>我们会在第一时间处理你的反馈。</p>
`;

// ===== 主流程 =====

console.log('=== Starting blog conversion v4 ===\n');
console.log('Strategy: Keep original structure, only replace content\n');

// 1. 处理 guide/ 下的原版文件（这些还是原版内容）
const guideDir = path.join(zhHans, 'guide');

writeFile(path.join(guideDir, 'index.html'),
  processFile(path.join(guideDir, 'index.html'), {
    title: '博客部署教程',
    content: contentGuideIndex,
    prevNext: { next: '环境准备' }
  }));
console.log('✓ guide/index.html');

writeFile(path.join(guideDir, 'started.html'),
  processFile(path.join(guideDir, 'started.html'), {
    title: '环境准备',
    content: contentStarted,
    prevNext: { prev: '博客部署教程', next: '创建项目' }
  }));
console.log('✓ guide/started.html');

writeFile(path.join(guideDir, 'milestones.html'),
  processFile(path.join(guideDir, 'milestones.html'), {
    title: '创建项目',
    content: contentMilestones,
    prevNext: { prev: '环境准备', next: '写作指南' }
  }));
console.log('✓ guide/milestones.html');

writeFile(path.join(guideDir, 'operation.html'),
  processFile(path.join(guideDir, 'operation.html'), {
    title: '写作指南',
    content: contentOperation,
    prevNext: { prev: '创建项目', next: '主题配置' }
  }));
console.log('✓ guide/operation.html');

writeFile(path.join(guideDir, 'preferences.html'),
  processFile(path.join(guideDir, 'preferences.html'), {
    title: '主题配置',
    content: contentPreferences,
    prevNext: { prev: '写作指南', next: '部署上线' }
  }));
console.log('✓ guide/preferences.html');

writeFile(path.join(guideDir, 'window-arrangement.html'),
  processFile(path.join(guideDir, 'window-arrangement.html'), {
    title: '部署上线',
    content: contentDeploy,
    prevNext: { prev: '主题配置' }
  }));
console.log('✓ guide/window-arrangement.html');

// 2. 从 guide/index.html 恢复根目录文件（修改路径前缀）
const guideIndexTpl = path.join(guideDir, 'index.html');

writeFile(path.join(zhHans, 'guide.html'),
  restoreRootFile(guideIndexTpl, path.join(zhHans, 'guide.html'), {
    title: '博客部署教程',
    content: contentGuideIndex,
    prevNext: { next: '环境准备' }
  }));
console.log('✓ guide.html (restored from guide/index.html)');

// 3. 从 reference/index.html 恢复 reference.html
const refIndexTpl = path.join(zhHans, 'reference', 'index.html');
writeFile(path.join(zhHans, 'reference.html'),
  restoreRootFile(refIndexTpl, path.join(zhHans, 'reference.html'), {
    title: '参考资料',
    content: '<h1 id="参考资料" tabindex="-1">参考资料 <a class="header-anchor" href="#参考资料" aria-label="Permalink">​</a></h1><p>这里提供一些有用的参考资料和链接。</p><h2 id="官方文档" tabindex="-1">官方文档 <a class="header-anchor" href="#官方文档" aria-label="Permalink">​</a></h2><ul><li><a href="https://vitepress.dev" target="_blank">VitePress 官方文档</a></li><li><a href="https://vuejs.org" target="_blank">Vue 3 官方文档</a></li><li><a href="https://nodejs.org" target="_blank">Node.js 官方文档</a></li></ul><h2 id="推荐资源" tabindex="-1">推荐资源 <a class="header-anchor" href="#推荐资源" aria-label="Permalink">​</a></h2><ul><li><a href="https://markdown.com.cn" target="_blank">Markdown 教程</a></li><li><a href="https://git-scm.com/book/zh" target="_blank">Git 教程</a></li></ul>'
  }));
console.log('✓ reference.html (restored from reference/index.html)');

// 4. 从 help/index.html 恢复 help.html
const helpIndexTpl = path.join(zhHans, 'help', 'index.html');
writeFile(path.join(zhHans, 'help.html'),
  restoreRootFile(helpIndexTpl, path.join(zhHans, 'help.html'), {
    title: '常见问题',
    content: '<h1 id="常见问题" tabindex="-1">常见问题 <a class="header-anchor" href="#常见问题" aria-label="Permalink">​</a></h1><h2 id="q1" tabindex="-1">VitePress 支持哪些浏览器？ <a class="header-anchor" href="#q1" aria-label="Permalink">​</a></h2><p>VitePress 支持所有现代浏览器，包括 Chrome、Firefox、Safari 和 Edge 的最新版本。不支持 IE 浏览器。</p><h2 id="q2" tabindex="-1">需要会 Vue 才能用 VitePress 吗？ <a class="header-anchor" href="#q2" aria-label="Permalink">​</a></h2><p>不需要。VitePress 使用 Markdown 编写内容，你不需要了解 Vue 也能搭建博客。但如果想要自定义组件，了解 Vue 会有帮助。</p><h2 id="q3" tabindex="-1">博客可以自定义域名吗？ <a class="header-anchor" href="#q3" aria-label="Permalink">​</a></h2><p>可以。无论使用 GitHub Pages、Cloudflare Pages 还是 Vercel，都支持自定义域名。具体配置方法请参考<a href="guide/window-arrangement.html#自定义域名">部署教程</a>。</p><h2 id="q4" tabindex="-1">如何添加评论功能？ <a class="header-anchor" href="#q4" aria-label="Permalink">​</a></h2><p>可以使用 Giscus、Utterances 或 Waline 等第三方评论系统，通过 VitePress 的自定义组件功能集成。</p>'
  }));
console.log('✓ help.html (restored from help/index.html)');

// 5. 处理 changelog.html, donate.html, contact.html
// 用 guide/operation.html 作为模板（有侧边栏的页面）
const tplWithSidebar = path.join(guideDir, 'operation.html');

writeFile(path.join(zhHans, 'changelog.html'),
  restoreRootFile(tplWithSidebar, path.join(zhHans, 'changelog.html'), {
    title: '更新日志',
    content: contentChangelog
  }));
console.log('✓ changelog.html');

writeFile(path.join(zhHans, 'donate.html'),
  restoreRootFile(tplWithSidebar, path.join(zhHans, 'donate.html'), {
    title: '赞助我们',
    content: contentDonate
  }));
console.log('✓ donate.html');

writeFile(path.join(zhHans, 'contact.html'),
  restoreRootFile(tplWithSidebar, path.join(zhHans, 'contact.html'), {
    title: '联系我',
    content: contentContact
  }));
console.log('✓ contact.html');

// 6. 恢复 index.html 首页
// 首页结构特殊（有 VPHero 和 VPFeatures，无侧边栏）
// 从 guide/index.html 恢复，但需要去掉侧边栏
let homeTpl = readFile(guideIndexTpl);
// 去掉侧边栏相关 class
homeTpl = homeTpl.replace('VPNavBarTitle has-sidebar', 'VPNavBarTitle');
homeTpl = homeTpl.replace('VPContent has-sidebar', 'VPContent');
homeTpl = homeTpl.replace('VPDoc has-sidebar has-aside', 'VPDoc');
homeTpl = homeTpl.replace('VPFooter has-sidebar', 'VPFooter');
homeTpl = homeTpl.replace('VPLocalNav has-sidebar empty', 'VPLocalNav');

// 删除侧边栏 aside
const asideStart = homeTpl.indexOf('<aside class="VPSidebar"');
if (asideStart >= 0) {
  const asideEnd = homeTpl.indexOf('</aside>', asideStart);
  if (asideEnd >= 0) {
    homeTpl = homeTpl.substring(0, asideStart) + homeTpl.substring(asideEnd + 8);
  }
}

// 删除 aside（VPDoc 的侧边目录）
const docAsideStart = homeTpl.indexOf('<div class="aside"');
if (docAsideStart >= 0) {
  const docAsideEnd = homeTpl.indexOf('</div></div></div>', docAsideStart);
  if (docAsideEnd >= 0) {
    homeTpl = homeTpl.substring(0, docAsideStart) + homeTpl.substring(docAsideEnd + 18);
  }
}

// 修改路径前缀
homeTpl = homeTpl.replace(/href="\.\.\/guide\.html"/g, 'href="guide.html"');
homeTpl = homeTpl.replace(/href="\.\.\/reference\.html"/g, 'href="reference.html"');
homeTpl = homeTpl.replace(/href="\.\.\/help\.html"/g, 'href="help.html"');
homeTpl = homeTpl.replace(/href="\.\.\/changelog\.html"/g, 'href="changelog.html"');
homeTpl = homeTpl.replace(/href="\.\.\/donate\.html"/g, 'href="donate.html"');
homeTpl = homeTpl.replace(/href="\.\.\/contact\.html"/g, 'href="contact.html"');
homeTpl = homeTpl.replace(/href="\.\.\/guide\//g, 'href="guide/');
homeTpl = homeTpl.replace(/href="\.\.\/reference\//g, 'href="reference/');
homeTpl = homeTpl.replace(/href="\.\.\/help\//g, 'href="help/');
homeTpl = homeTpl.replace(/href="\.\.\/index\.html"/g, 'href="index.html"');
homeTpl = homeTpl.replace(/src="\.\.\/\.\.\/images\//g, 'src="../images/');
homeTpl = homeTpl.replace(/href="\.\.\/\.\.\/assets\//g, 'href="../assets/');
homeTpl = homeTpl.replace(/src="\.\.\/\.\.\/assets\//g, 'src="../assets/');
homeTpl = homeTpl.replace(/href="\.\.\/\.\.\/vp-icons\.css"/g, 'href="../vp-icons.css"');

// 全局品牌替换
homeTpl = replaceBrand(homeTpl);
homeTpl = replaceSidebarText(homeTpl);
homeTpl = replaceNavText(homeTpl);
homeTpl = replaceTitle(homeTpl, '博客部署教程');
homeTpl = replaceMainContent(homeTpl, contentGuideIndex);

writeFile(path.join(zhHans, 'index.html'), homeTpl);
console.log('✓ index.html (restored as home page)');

// 7. 清理之前创建的多余文件
const filesToDelete = [
  path.join(zhHans, 'reference', 'culture.html'),
  path.join(zhHans, 'reference', 'essays.html'),
  path.join(zhHans, 'reference', 'photography.html'),
  path.join(zhHans, 'reference', 'technology.html'),
  path.join(guideDir, 'building-with-cloudflare-pages.html'),
  path.join(guideDir, 'dumb-phone-for-a-month.html'),
  path.join(guideDir, 'geometry-of-italian-coffee-bars.html'),
  path.join(guideDir, 'morning-light-photo-essay.html'),
  path.join(guideDir, 'on-writing-alone.html'),
  path.join(guideDir, 'the-art-of-slow-reading.html'),
];

filesToDelete.forEach(function(f) {
  if (fs.existsSync(f)) {
    fs.unlinkSync(f);
    console.log('✗ 删除多余文件: ' + path.basename(f));
  }
});

console.log('\n=== 全部完成 ===');
