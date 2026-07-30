const fs = require('fs');
const path = require('path');

const base = 'C:/Users/qiyu/AppData/Roaming/TRAE SOLO CN/ModularData/ai-agent/work-mode-projects/6a641c34aeff9643835af5d6/viarotel-docs';
const zhHans = path.join(base, 'zhHans');

const posts = [
  {
    id: 1,
    title: '慢读的艺术：在快节奏世界中找回深度阅读',
    slug: 'the-art-of-slow-reading',
    category: '随笔',
    tags: ['阅读', '书籍', '正念', '注意力'],
    author: 'Elena Marsh',
    date: '2024-03-15',
    excerpt: '在无限滚动和碎片化注意力的时代，重新找回深度、从容的阅读，是一种安静的反叛。',
    cover: '',
    content: `# 慢读的艺术

曾经，阅读不是一项需要完成的任务，而是一个可以栖息的地方。你会在椅子上坐定，手中捧着书的重量，时间便失去了锐利的边缘。

而现在，我们生活在无限滚动的时代。标题争夺着我们的注意力碎片。文章——如果真的被读了的话——是在通知间隙的三十秒内匆匆扫过的。我们消费文字如同快餐：迅速、机械、毫无滋味。

但如果我们选择另一种方式呢？

## 慢读意味着什么

慢读，不是字面意义上的读得慢。它是关于在场。它是决定给予文本应得的空间——在打动你的句子上停留，因为韵律愉悦而重读一段，合上书，盯着墙，让一个想法沉淀下来。

它意味着：

- 选择深度而非广度
- 允许自己不读完一本配不上你时间的书
- 手中握着铅笔阅读，与作者对话
- 让一篇短文占据你整个下午的思绪

## 安静的反叛

每一次慢读，都是一次小小的拒绝。拒绝让算法决定什么值得你关注。拒绝把浏览等同于理解。拒绝把文学当作内容。

世界不会为你慢下来。但你可以在其中慢下来。你可以关掉标签页。你可以静音手机。你可以打开一本书——一本真正的、有纸页的书——只读一章。然后与它共处。

这就够了。`
  },
  {
    id: 2,
    title: '使用 Cloudflare Pages 构建全栈应用：实践指南',
    slug: 'building-with-cloudflare-pages',
    category: '技术',
    tags: ['cloudflare', 'pages', 'workers', 'd1', '部署'],
    author: 'David Chen',
    date: '2024-02-28',
    excerpt: '从零到部署只需几分钟。一篇在 Cloudflare 边缘网络上构建全栈应用的实战指南。',
    cover: '',
    content: `# 使用 Cloudflare Pages 构建全栈应用

Cloudflare Pages 不只是静态站点托管。借助 Pages Functions，你获得了 Workers 运行时的全部能力——这意味着你的博客、仪表盘或 SaaS 应用可以完全运行在边缘。

## 为什么选择 Cloudflare Pages？

- **全球默认**：你的站点运行在 300+ 边缘节点上
- **内置函数**：\`/functions\` 中基于文件的路由提供无服务器 API
- **D1 数据库**：边缘 SQLite，免费套餐足以应对大多数博客
- **Git 集成**：推送即部署，或使用 wrangler CLI

## 架构

一个典型的 Pages 项目如下：

\`\`\`
project/
├── src/           # 前端（React、Vue 等）
├── functions/     # 后端 API（Pages Functions）
├── dist/          # 构建产物（自动部署）
└── wrangler.jsonc # Cloudflare 配置
\`\`\`

前端构建到 \`dist/\`，\`functions/\` 中的 Pages Functions 自动成为 API 路由。D1 绑定为你提供运行在边缘的 SQLite 数据库。

## 部署

最简单的部署方式：

\`\`\`bash
npm run build
npx wrangler pages deploy ./dist --project-name=my-blog
\`\`\`

就是这样。你的站点已经在 \`*.pages.dev\` 域名上线了，全球分发，HTTPS 内置。

## 自定义域名

添加你自己的域名很简单——在仪表板中添加自定义域名，Cloudflare 会自动处理 DNS 和 SSL 证书。`
  },
  {
    id: 3,
    title: '晨光摄影随笔',
    slug: 'morning-light-photo-essay',
    category: '摄影',
    tags: ['摄影', '早晨', '光线', '随笔', '黎明'],
    author: 'Mira Tanaka',
    date: '2024-01-20',
    excerpt: '白昼的第一个小时，将平凡的街道变成了电影般的画面。一场关于黎明静谧戏剧的视觉冥想。',
    cover: '',
    content: `# 晨光随笔

晨光有一种其他时刻都不具备的质感。它还不是正午那种刺眼的、毫无差别的明亮。它是倾斜的、金色的、有选择性的——只照亮某些表面，忽略另一些。

清晨六点的城市，属于另一群人。快递员。慢跑者。一夜未眠的人。他们穿行在一个感觉像是借来的、暂时的风景里。

## 金色窗口

摄影师称之为黄金时刻，但这感觉太精确了。更像是一扇金色的窗——十五分钟，也许二十分钟，光线恰到好处。砖墙仿佛从内部被点亮。长长的影子像伸出的手一样横过空旷的人行道。

你无法计划它。你只能在场。

## 相机看到了什么

当然，相机是会说谎的。它压缩光线，让它静止，把空气中的寒意和街角面包店的香气都剥除了。但它也揭示了一些东西：旧油漆的纹理，以你的目光会一扫而过的方式；苍白天空中消防梯的几何形状。

晨光让每个人都成了摄影师，哪怕只有一瞬间。`
  },
  {
    id: 4,
    title: '论独自写作',
    slug: 'on-writing-alone',
    category: '随笔',
    tags: ['写作', '孤独', '技艺', '创造力'],
    author: 'James Okafor',
    date: '2023-12-10',
    excerpt: '写作是最孤独的职业，而这恰恰是它的意义所在。关于孤独、技艺，以及文字奇异陪伴的沉思。',
    cover: '',
    content: `# 论独自写作

你坐下。房间很安静。光标在闪烁。接下来的一小时——或者三小时，或者八小时——只有你和这个句子。

写作不是团队运动。它不能被众包，不能被委员会批准，也不能被站会优化。它需要的是现代生活设计用来消除的东西：持续的、不受打扰的注意力。

## 灵感的神话

不写作的人常常把它想象成一系列灵感迸发的时刻——缪斯在你耳边低语，文字如水般流淌。写作的人知道真相：大多数日子里，文字不会流淌。它们是被一个字一个字从脑子里拽出来的，而你的脑子宁愿做几乎任何其他事情。

然而。

你坐在那里。你写下一个糟糕的句子。然后是一个稍微不那么糟糕的。然后——有时候，不总是——一个让你惊讶的句子，一个感觉真实的句子，一个让所有的端坐都值得的句子。

## 作为方法的孤独

写作的孤独不是副作用。它是方法。当有人和你说话时，你听不到句子想要变成什么。当通知拉着你的袖子时，你无法追随一个想法到它的终点。

页面要求沉默。作为回报，它提供了某种罕见的东西：发现你真实想法的机会。

这值得孤独。`
  },
  {
    id: 5,
    title: '意式咖啡馆的空间几何',
    slug: 'geometry-of-italian-coffee-bars',
    category: '文化',
    tags: ['咖啡', '意大利', '设计', '文化', '罗马'],
    author: 'Sofia Romano',
    date: '2023-11-05',
    excerpt: '为什么站在罗马的吧台前感觉和坐在其他任何地方的咖啡馆都不一样。从设计角度看意大利咖啡仪式。',
    cover: '',
    content: `# 意式咖啡馆的空间几何

早上八点走进罗马的一家咖啡吧，你会立刻注意到一件事：没有人坐着。

每个人都站在吧台边。他们在聊天——互相聊，和咖啡师聊，或者漫无目的地聊。他们两口喝完浓缩咖啡，也许三口。然后就走了。整个仪式需要四分钟。

## 作为舞台的吧台

意大利咖啡吧里的吧台不是家具。它是舞台。整个表演都在这里发生：点单、制作、寒暄、消费、离开。

高度是刻意的——刚好在肘部以下，这样你站着时可以舒适地放杯子。表面是大理石或不锈钢，触感冰凉，易于擦拭。咖啡机像祭坛一样占据主导地位。

## 站与坐

秘密是这样的：坐下会改变关系。当你坐下时，咖啡变成了目的地。当你站着时，它是一个时刻——早晨的一个标点，而不是一个句子。

意大利咖啡吧是为流动而设计的，不是为了逗留。座位很少，而且更贵。信息很明确：喝完你的咖啡，说完你的话，然后继续你的一天。

这不是不友善。这是另一种快乐理论。快乐是强度，不是持续时间。四分钟的完美浓缩咖啡，而不是四十分钟的平庸拿铁。

这种几何里有智慧。`
  },
  {
    id: 6,
    title: '我用了一个月功能机的体验',
    slug: 'dumb-phone-for-a-month',
    category: '随笔',
    tags: ['智能手机', '数字极简主义', '注意力', '技术'],
    author: 'Alex Park',
    date: '2023-10-18',
    excerpt: '三十天没有智能手机。我得到了什么，失去了什么，以及我对自己与注意力关系的了解。',
    cover: '',
    content: `# 我用了一个月功能机的体验

一个星期二，我关掉了 iPhone，把它放进了抽屉。另一只手里，我握着一部诺基亚 2780——一部翻盖手机，只能打电话和发短信，别的什么都做不了。

我告诉自己这是个实验。三十天。我能挺过三十天的。

## 第一周：幻肢

前三天是生理性的。我的手不断伸向一部不在那里的手机。我会拍拍空空的口袋，感到一阵小小的恐慌。等火车、等水壶烧开、等一个迟到五分钟的朋友——没有无限滚动这个安全阀，这些时刻让人无法忍受。

到第四天，我开始读火车上的海报。到第六天，我意识到那五分钟的等待其实并非无法忍受。它们只是五分钟而已。

## 第二周：无聊

没有手机，无聊回来了。真正的无聊——那种你盯着墙，让思绪漫游的无聊。我已经忘记了这种感觉。

事实证明，无聊不是敌人。它是土壤。想法在其中生长。第十天，在等一个会议开始时，我想到了一个卡了好几个星期的项目的点子。它完整地浮现出来，仿佛一直在等我停止看屏幕。

## 第三周：对话

人们和我说话的方式不一样了。不是因为我变了，而是因为我在场了。不再瞥通知。不再一边滚动一边半听。只有注意力，完整而不分心。

起初这让人们感到不自在。然后，他们开始敞开心扉。

## 第四周：结论

第三十一天，我重新用回了智能手机。但我回去的方式不一样了。通知关了。没有社交媒体应用。功能机还在我包里，作为一个提醒：我不必每时每刻都对互联网可用。

这个实验不是关于拒绝技术。它是关于记住我有选择。`
  }
];

const categories = [
  { name: '随笔', slug: 'essays', count: 3, desc: '关于生活、阅读、写作的思考' },
  { name: '技术', slug: 'technology', count: 1, desc: '编程、工具、开发经验' },
  { name: '摄影', slug: 'photography', count: 1, desc: '影像与光影的故事' },
  { name: '文化', slug: 'culture', count: 1, desc: '旅行、设计、人文观察' }
];

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
  
  html = html.replace(/^### (.*)$/gm, '<h3>$1 <a class="header-anchor" href="#$1">​</a></h3>');
  html = html.replace(/^## (.*)$/gm, '<h2>$1 <a class="header-anchor" href="#$1">​</a></h2>');
  html = html.replace(/^# (.*)$/gm, '<h1>$1 <a class="header-anchor" href="#$1">​</a></h1>');
  
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  html = html.replace(/^- (.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n)+/g, function(match) {
    return '<ul>' + match + '</ul>';
  });
  
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs.map(function(p) {
    if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<pre') || p.startsWith('<div') || p.startsWith('<li') || p.startsWith('```')) {
      return p;
    }
    return '<p>' + p.replace(/\n/g, '<br />') + '</p>';
  }).join('\n\n');
  
  return html;
}

console.log('Blog posts loaded:', posts.length);
console.log('Categories:', categories.map(c => c.name).join(', '));

module.exports = { posts, categories, renderMarkdown, escapeHtml };