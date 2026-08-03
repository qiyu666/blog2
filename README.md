# Marginalia — 基于 Cloudflare 的全栈博客系统

一个运行在 Cloudflare 边缘网络上的现代化博客平台，前端 React + TypeScript，后端 Cloudflare Pages Functions，数据库 Cloudflare D1（SQLite at the edge）。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 · TypeScript · Vite 5 |
| 路由 | React Router v6 |
| 后端 | Cloudflare Pages Functions（Workers 运行时） |
| 数据库 | Cloudflare D1（边缘 SQLite） |
| 认证 | Session Cookie · GitHub OAuth · TOTP 2FA |
| 部署 | Cloudflare Pages（全球 300+ 边缘节点） |

## 功能一览

### 内容
- 文章发布与编辑（Markdown 编辑器，支持实时预览、工具栏、Tab 缩进）
- **Markdown 编辑器快捷键**（Ctrl+B 加粗 / Ctrl+I 斜体 / Ctrl+K 插入链接）
- 文章草稿与发布状态管理
- 分类、标签、封面图
- 文章自定义 JS（用户可为单篇文章注入自定义背景、音乐等）
- FTS5 全文搜索（覆盖标题、摘要、正文、标签）
- RSS Feed 与 Sitemap
- **Markdown 代码块语法高亮**（PrismJS 15 种语言 + Catppuccin 主题）
- **代码块一键复制**（复制按钮 + 成功提示）
- **文章阅读进度条**（顶部渐变进度条，实时跟踪滚动位置）
- **文章字体大小调节**（A+/A− 按钮，80%-160% 缩放，localStorage 持久化）
- **上一篇/下一篇导航**（同分类文章按时间排序，文末双向导航）
- **文章合集/专栏**（Series，多篇文章归入同一专栏，专栏列表 + 详情页）
- **文章归档**（按年月分组的归档页面）
- **标签云**（标签统计与按标签筛选）
- **阅读历史**（本地存储阅读进度，"继续阅读"入口）

### 社交
- 评论系统（支持嵌套回复、评论点赞）
- **评论折叠**（单条折叠 / 全部折叠/展开，折叠后显示回复数，递归统计子孙回复）
- **评论 @用户补全**（输入 @ 弹出用户下拉，上下键选择 + Enter 确认）
- **@提及通知**（评论/回复中提及的用户会收到通知提醒）
- 文章点赞与收藏
- 用户关注 / 粉丝体系
- 站内私信
- 通知系统（评论回复、点赞、收藏、关注、私信、@提及六种类型，支持已读/未读/删除）
- **邮件订阅**（页脚订阅入口，Token 退订链接，订阅管理页）
- **友情链接**（/links 页面，管理员可增删改排序）

### 用户
- 用户名/密码注册与登录
- GitHub OAuth 登录（新用户引导设置显示名称和密码）
- 个人主页（头像、渐变 Banner、统计栏、管理员徽章、关注/私信按钮）
- 个人主页可视化自定义（拖拽排序模块、自定义 CSS、背景图）
- **个人主页作品集**（分类筛选 + 文章卡片列表 + 客户端分页）
- **成就徽章系统**（7 种徽章：新手、勤奋、高产、人气、热门、互动、优质）
- **互动数据统计**（被点赞、被收藏、被评论总数展示）
- **社交联系方式**（GitHub、Twitter/X、QQ、微信、Telegram、B站、邮箱，共 7 种平台图标展示）
- 安全设置（修改密码、TOTP 2FA）

### 管理后台
- 仪表盘（数据概览）
- **访问统计仪表盘**（统计卡片 + 近 7 天趋势 SVG 柱状图 + 分类分布 + 热门文章 Top10 + 活跃用户 Top10）
- 文章管理（编辑/删除/置顶/精选）
- **文章批量操作**（多选 + 批量删除/发布/取消发布/置顶/取消置顶）
- 评论管理
- 用户管理（角色提升/降级）
- Bug 反馈管理
- 数据分析（访问量、热门文章、用户增长）
- **数据分析看板增强**（7 天访问趋势柱状图、热门文章 Top10 表格、30 天用户增长曲线）
- 分类与标签管理
- **友情链接管理**（增删改排序）

### 安全
- 登录暴力破解保护（15 分钟内 5 次失败锁定 30 分钟，按 IP 和账号双重限制）
- 管理员 API 速率限制（已认证 60 次/分钟，未认证 10 次/分钟）
- 管理员 TOTP 2FA 强制启用
- Session Cookie（SameSite=Lax，支持跨站 OAuth 回调）

### UI/UX
- 现代化设计，玻璃拟态（Glassmorphism）风格
- 亮色/暗色模式无缝切换
- **多语言 i18n 支持**（中文简体 / English，react-i18next 实现，偏好本地存储）
- 响应式布局（桌面/平板/移动端）
- 全局音乐播放器（播放列表、跨页面状态同步）
- 页面切换自动滚动到顶部
- 微动画与过渡效果
- **404 页面美化**（渐变浮动动画、15 秒倒计时、返回首页/搜索按钮）
- **设置页保存反馈**（按钮状态变化、右下角浮动 Toast、自动滚动到顶部）

## 项目结构

```
blog2/
├── src/                        # 前端源码
│   ├── auth/                   #   认证上下文与路由守卫
│   ├── components/             #   通用组件
│   │   ├── Header.tsx          #     导航栏 + 主题切换 + 通知菜单
│   │   ├── Footer.tsx          #     页脚
│   │   ├── Layout.tsx          #     布局骨架
│   │   ├── LanguageSwitcher.tsx#     多语言切换器（中/英）
│   │   ├── MarkdownEditor.tsx  #     Markdown 编辑器
│   │   ├── MusicPlayer.tsx     #     全局音乐播放器
│   │   ├── PostCard.tsx        #     文章卡片
│   │   ├── PostForm.tsx        #     文章发布/编辑表单
│   │   ├── PostSidebar.tsx     #     文章页侧边栏
│   │   ├── SearchBar.tsx       #     搜索栏
│   │   ├── SEO.tsx             #     SEO meta 标签
│   │   ├── SocialLinks.tsx     #     社交联系方式图标（支持文章页/用户主页复用）
│   │   └── NotificationsMenu.tsx#    通知下拉菜单
│   ├── pages/                  #   页面组件
│   │   ├── Home.tsx            #     首页
│   │   ├── PostDetail.tsx      #     文章详情
│   │   ├── NewPost.tsx         #     发布文章
│   │   ├── EditPost.tsx        #     编辑文章
│   │   ├── Login.tsx           #     登录
│   │   ├── Register.tsx        #     注册
│   │   ├── UserProfile.tsx     #     用户主页
│   │   ├── Search.tsx          #     搜索结果
│   │   ├── Settings.tsx        #     个人设置
│   │   ├── Security.tsx        #     安全设置
│   │   ├── Customize.tsx       #     主页自定义
│   │   ├── Mailbox.tsx         #     站内信
│   │   ├── Notifications.tsx   #     通知列表
│   │   ├── Favorites.tsx       #     收藏夹
│   │   ├── Drafts.tsx          #     草稿箱
│   │   ├── Admin.tsx           #     管理后台
│   │   ├── Analytics.tsx       #     数据分析
│   │   ├── BugReport.tsx       #     Bug 反馈
│   │   ├── GithubCallback.tsx  #     GitHub OAuth 回调
│   │   ├── OAuthSetup.tsx      #     OAuth 新用户引导
│   │   ├── Promote.tsx         #     推广页
│   │   ├── Archives.tsx        #     文章归档
│   │   ├── History.tsx         #     阅读历史
│   │   ├── Tag.tsx             #     标签云与按标签筛选
│   │   ├── SeriesList.tsx      #     合集/专栏列表
│   │   ├── SeriesDetail.tsx    #     合集详情
│   │   ├── Links.tsx           #     友情链接
│   │   └── Unsubscribe.tsx     #     邮件退订
│   ├── App.tsx                 #   路由定义
│   ├── api.ts                  #   前端 API 封装
│   ├── types.ts                #   TypeScript 类型定义
│   ├── index.css               #   全局样式
│   └── main.tsx                #   入口文件（BrowserRouter、AuthProvider）
├── functions/                  # 后端 API（Pages Functions）
│   └── api/
│       ├── _auth.ts            #   认证中间件
│       ├── _rate-limit.ts      #   速率限制
│       ├── _totp.ts            #   TOTP 2FA 工具
│       ├── _email.ts           #   邮件工具
│       ├── _notifications.ts   #   通知推送工具
│       ├── _helpers.ts         #   通用工具函数
│       ├── _css-sanitizer.ts   #   CSS 安全过滤
│       ├── posts.ts            #   文章列表/创建
│       ├── posts/[id]/         #   文章详情/评论/点赞/收藏/上下篇导航
│       ├── comments/[id]/      #   评论管理/点赞
│       ├── search.ts           #   全文搜索
│       ├── feed.ts             #   RSS Feed
│       ├── sitemap.ts          #   站点地图
│       ├── archives.ts         #   文章归档
│       ├── series.ts           #   合集/专栏 API
│       ├── subscribe.ts        #   邮件订阅/退订
│       ├── links.ts            #   友情链接
│       ├── auth/               #   认证相关
│       │   ├── login.ts        #     登录
│       │   ├── register.ts     #     注册
│       │   ├── logout.ts       #     登出
│       │   ├── me.ts           #     当前用户信息
│       │   ├── 2fa.ts          #     2FA 启用/验证
│       │   ├── change-password.ts # 修改密码
│       │   └── github/         #     GitHub OAuth
│       ├── admin/              #   管理员接口
│       │   ├── posts.ts        #     文章管理
│       │   ├── comments.ts     #     评论管理
│       │   ├── users.ts        #     用户管理
│       │   ├── analytics.ts    #     数据分析
│       │   ├── reports.ts      #     Bug 反馈管理
│       │   ├── promote.ts      #     用户角色管理
│       │   └── migrations.ts   #     数据库迁移管理
│       ├── users/[username].ts #   用户主页数据
│       ├── follows.ts          #   关注/取消关注
│       ├── favorites.ts        #   收藏列表
│       ├── messages.ts         #   站内信
│       ├── notifications.ts    #   通知列表
│       ├── bugs.ts             #   Bug 提交
│       └── seed.ts             #   数据种子
├── public/                     # 静态资源
│   ├── _redirects              #   Cloudflare Pages 重定向规则
│   ├── _headers                #   安全响应头
│   └── favicon.svg             #   站点图标
├── schema.sql                  # 数据库初始 schema
├── schema-v2.sql ~ v13.sql     # 增量迁移脚本（v10 阅读历史/v11 归档索引/v12 合集/v13 订阅+友链）
├── wrangler.jsonc              # Cloudflare 配置
├── vite.config.ts              # Vite 构建配置
├── tsconfig.json               # TypeScript 配置
└── package.json                # 项目依赖与脚本
```

## 快速开始

### 前置要求

- Node.js 18+
- npm 或其他包管理器
- Cloudflare 账号（免费套餐即可）

### 1. 克隆仓库

```bash
git clone https://github.com/qiyu666/blog2.git
cd blog2
npm install
```

### 2. 创建 D1 数据库

```bash
npx wrangler login          # 登录 Cloudflare
npx wrangler d1 create blog-db
```

将返回的 `database_id` 填入 `wrangler.jsonc`：

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "blog-db",
      "database_id": "你的数据库ID"
    }
  ]
}
```

### 3. 初始化数据库

```bash
# 本地开发环境
npx wrangler d1 execute blog-db --file=./schema.sql

# 远程生产环境
npx wrangler d1 execute blog-db --remote --file=./schema.sql
```

按顺序执行增量迁移（v2 → v13）：

```bash
npx wrangler d1 execute blog-db --file=./schema-v2.sql
npx wrangler d1 execute blog-db --file=./schema-v3.sql
# ...依次执行到 v13
# v9  添加社交联系方式字段（GitHub/Twitter/QQ/微信/Telegram/B站/邮箱）
# v12 添加文章合集/专栏表（series、post_series）
# v13 添加邮件订阅与友情链接表（subscriptions、friend_links）
npx wrangler d1 execute blog-db --file=./schema-v13.sql
```

### 4. 配置环境变量

在 `wrangler.jsonc` 的 `vars` 中配置：

```jsonc
{
  "vars": {
    "ADMIN_SECRET": "你的管理员密钥",
    "GITHUB_CLIENT_ID": "你的GitHub OAuth Client ID",
    "GITHUB_CLIENT_SECRET": "你的GitHub OAuth Client Secret"
  }
}
```

如需 GitHub OAuth，在 [GitHub Developer Settings](https://github.com/settings/developers) 创建 OAuth App，回调地址填 `https://你的域名/api/auth/github/callback`。

### 5. 本地开发

```bash
npm run dev                  # 启动 Vite 开发服务器（前端）
npx wrangler pages dev ./dist --d1 DB=blog-db  # 启动 Pages Functions（后端）
```

### 6. 部署

```bash
npm run build               # 构建前端
npm run deploy              # 部署到 Cloudflare Pages
```

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | TypeScript 编译 + Vite 构建 |
| `npm run preview` | 预览构建产物 |
| `npm run deploy` | 构建并部署到 Cloudflare Pages |
| `npm run db:create` | 创建 D1 数据库 |
| `npm run db:init` | 本地初始化数据库 schema |
| `npm run db:init:remote` | 远程初始化数据库 schema |
| `npm run db:migrate` | 本地执行增量迁移 |
| `npm run db:migrate:remote` | 远程执行增量迁移 |

## API 路由

### 公开接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/posts` | 文章列表（支持分页、分类筛选） |
| GET | `/api/posts/:id` | 文章详情（支持 ID 和 slug 双查询） |
| GET | `/api/posts/:id/comments` | 文章评论列表 |
| GET | `/api/posts/:id/neighbors` | 上一篇/下一篇导航（同分类） |
| GET | `/api/search?q=关键词` | 全文搜索 |
| GET | `/api/feed` | RSS Feed |
| GET | `/api/sitemap` | 站点地图 |
| GET | `/api/archives` | 文章归档（按年月分组） |
| GET | `/api/series` | 合集/专栏列表 |
| GET | `/api/series/:slug` | 合集详情（含文章列表） |
| GET | `/api/links` | 友情链接列表 |
| POST | `/api/subscribe` | 邮件订阅 |
| GET | `/api/users/:username` | 用户主页信息 |

### 认证接口
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 当前用户信息 |
| POST | `/api/auth/2fa` | 2FA 启用/验证 |
| POST | `/api/auth/change-password` | 修改密码 |
| GET | `/api/auth/github` | GitHub OAuth 跳转 |
| GET | `/api/auth/github/callback` | GitHub OAuth 回调 |

### 用户接口（需登录）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/posts` | 创建文章 |
| PUT | `/api/posts/:id` | 编辑文章 |
| POST | `/api/posts/:id/likes` | 点赞/取消点赞 |
| POST | `/api/posts/:id/favorites` | 收藏/取消收藏 |
| POST | `/api/posts/:id/comments` | 发表评论 |
| POST | `/api/comments/:id/likes` | 评论点赞 |
| POST | `/api/follows` | 关注/取消关注 |
| GET | `/api/favorites` | 收藏列表 |
| GET | `/api/messages` | 站内信列表 |
| POST | `/api/messages` | 发送私信 |
| GET | `/api/notifications` | 通知列表 |
| POST | `/api/bugs` | 提交 Bug 反馈 |

### 管理员接口（需管理员权限）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/posts` | 文章管理 |
| DELETE | `/api/admin/posts/:id` | 删除文章 |
| GET | `/api/admin/comments` | 评论管理 |
| GET | `/api/admin/users` | 用户管理 |
| POST | `/api/admin/promote` | 用户角色变更 |
| GET | `/api/admin/analytics` | 数据分析 |
| GET | `/api/admin/reports` | Bug 反馈管理 |

## 数据库结构

主要数据表：

- **users** — 用户（用户名、邮箱、密码哈希、头像、角色、2FA 密钥、主页自定义等）
- **posts** — 文章（标题、slug、摘要、正文、分类、标签、封面、发布状态、置顶/精选、自定义 JS）
- **comments** — 评论（支持嵌套回复）
- **likes** — 点赞记录
- **favorites** — 收藏记录
- **follows** — 关注关系
- **messages** — 站内私信
- **notifications** — 通知（评论回复/点赞/收藏/关注/私信）
- **sessions** — 会话管理
- **login_attempts** — 登录尝试记录（防暴力破解）
- **admin_rate_limits** — 管理员 API 速率限制
- **bugs** — Bug 反馈
- **posts_fts** — FTS5 全文搜索虚拟表
- **series** — 文章合集/专栏（slug、标题、描述、封面、作者）
- **post_series** — 文章与合集关联（多对多，含排序字段）
- **subscriptions** — 邮件订阅（邮箱、退订 token、确认状态）
- **friend_links** — 友情链接（名称、URL、描述、排序）

## 在其他电脑上运行

1. 安装 [Node.js](https://nodejs.org/) 18+
2. 克隆仓库：`git clone https://github.com/qiyu666/blog2.git`
3. 安装依赖：`npm install`
4. 安装 Cloudflare CLI：`npx wrangler login`
5. 创建/绑定 D1 数据库（见上方步骤 2-3）
6. 启动开发服务器：`npm run dev`

> 项目使用 Cloudflare D1 云数据库，无需安装本地数据库。

## 浏览器支持

支持所有现代浏览器（Chrome、Firefox、Safari、Edge 最新版本）。

## License

MIT
