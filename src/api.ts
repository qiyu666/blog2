import type {
  Post,
  PostInput,
  User,
  Comment,
  LikeStatus,
  Message,
  SearchResult,
  FollowStatus,
  NotificationItem,
  UserCategory,
} from './types';

export interface LoginResult {
  user?: User;
  token?: string;
  requires_2fa?: boolean;
  twofa_token?: string;
  message?: string;
}

const API_BASE: string = (import.meta.env.VITE_API_BASE as string) || ''

/**
 * 估算阅读时长（分钟）。
 * 中文字符按 1 个字计算，英文按空格分词；总词数除以 200 wpm 后向上取整，最小 1 分钟。
 */
export function estimateReadingTime(content: string): number {
  if (!content) return 1
  // 中文字符数（CJK 统一表意文字 + 兼容表意文字 + 全角标点不算字数）
  const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length
  // 移除中文字符后，按空白分词统计英文单词数
  const nonChinese = content.replace(/[\u4e00-\u9fff]/g, ' ')
  const englishWords = nonChinese.split(/\s+/).filter(Boolean).length
  const totalWords = chineseChars + englishWords
  return Math.max(1, Math.ceil(totalWords / 200))
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const fullUrl = API_BASE + url
  const res = await fetch(fullUrl, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  });
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      msg = data.error || msg;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ===== Posts =====
export async function getPosts(
  sort?: 'trending' | 'featured',
  status?: 'draft'
): Promise<Post[]> {
  const params = new URLSearchParams();
  if (sort) params.set('sort', sort);
  if (status) params.set('status', status);
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<Post[]>(`/api/posts${query}`);
}

export async function getPost(slug: string): Promise<Post> {
  return request<Post>(`/api/posts/${slug}`);
}

export interface PostNeighbor {
  id: number;
  title: string;
  slug: string;
}

export async function getPostNeighbors(slug: string): Promise<{ previous: PostNeighbor | null; next: PostNeighbor | null }> {
  return request(`/api/posts/${slug}/neighbors`);
}

export interface RelatedPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  cover_image: string;
  category: string;
  created_at: string;
}

// 相关文章推荐：基于共享标签与同分类
export async function getRelatedPosts(slug: string): Promise<RelatedPost[]> {
  return request<RelatedPost[]>(`/api/posts/${slug}/related`);
}

export async function createPost(data: PostInput): Promise<Post> {
  return request<Post>('/api/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePost(id: number, data: PostInput): Promise<Post> {
  return request<Post>(`/api/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePost(id: number): Promise<void> {
  await request<void>(`/api/posts/${id}`, { method: 'DELETE' });
}

// ===== 历史版本（Revisions） =====
export interface Revision {
  id: number;
  created_at: string;
  author_id: number | null;
  author_username: string | null;
  title: string;
  title_excerpt: string;
  content_length: number;
}

export interface RevisionDetail {
  id: number;
  post_id: number;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string;
  cover_image: string;
  custom_js: string;
  author_id: number | null;
  author_username: string | null;
  created_at: string;
}

export async function getPostRevisions(id: number | string): Promise<Revision[]> {
  return request<Revision[]>(`/api/posts/${id}/revisions`);
}

export async function getRevision(
  id: number | string,
  revisionId: number
): Promise<RevisionDetail> {
  return request<RevisionDetail>(`/api/posts/${id}/revisions/${revisionId}`);
}

export async function restoreRevision(
  id: number | string,
  revisionId: number
): Promise<void> {
  await request<{ success: boolean }>(`/api/posts/${id}/revisions/${revisionId}`, {
    method: 'POST',
  });
}

// ===== Auth =====
export async function register(
  username: string,
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  return request<{ user: User; token: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

export async function login(
  identifier: string,
  password: string
): Promise<LoginResult> {
  return request<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
}

/** 2FA 第二步：用 twofa_token + 6 位验证码完成登录 */
export async function loginVerify2fa(
  twofaToken: string,
  code: string
): Promise<{ user: User; token: string }> {
  return request<{ user: User; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ twofa_token: twofaToken, code }),
  });
}

export async function logout(): Promise<void> {
  await request<void>('/api/auth/logout', { method: 'POST' });
}

export async function getCurrentUser(): Promise<User | null> {
  const data = await request<{ user: User | null }>('/api/auth/me');
  return data.user;
}

// ===== Comments =====
export async function getComments(postSlug: string): Promise<Comment[]> {
  return request<Comment[]>(`/api/posts/${postSlug}/comments`);
}

export async function createComment(
  postSlug: string,
  content: string,
  parentId?: number | null
): Promise<Comment> {
  return request<Comment>(`/api/posts/${postSlug}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, parent_id: parentId ?? null }),
  });
}

export async function deleteComment(id: number): Promise<void> {
  await request<void>(`/api/comments/${id}`, { method: 'DELETE' });
}

export async function editComment(id: number, content: string): Promise<Comment> {
  return request<Comment>(`/api/comments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
}

// ===== Likes =====
export async function getLikeStatus(postSlug: string): Promise<LikeStatus> {
  return request<LikeStatus>(`/api/posts/${postSlug}/likes`);
}

export async function toggleLike(postSlug: string): Promise<{ liked: boolean }> {
  return request<{ liked: boolean }>(`/api/posts/${postSlug}/likes`, {
    method: 'POST',
  });
}

// ===== Comment Likes =====
export async function getCommentLikes(commentId: number): Promise<LikeStatus> {
  return request<LikeStatus>(`/api/comments/${commentId}/likes`);
}

export async function toggleCommentLike(commentId: number): Promise<{ liked: boolean }> {
  return request<{ liked: boolean }>(`/api/comments/${commentId}/likes`, {
    method: 'POST',
  });
}

// ===== Favorites =====
export async function toggleFavorite(
  postSlug: string
): Promise<{ favorited: boolean }> {
  return request<{ favorited: boolean }>(`/api/posts/${postSlug}/favorites`, {
    method: 'POST',
  });
}

export async function getFavorites(): Promise<Array<Post & { collection_id?: number | null; favorited_at?: string }>> {
  return request<Post[]>('/api/favorites');
}

// ===== 收藏夹（Collection 文件夹） =====
export interface FavoriteCollection {
  id: number;
  name: string;
  count: number;
}

export async function getFavoriteCollections(): Promise<FavoriteCollection[]> {
  return request<FavoriteCollection[]>('/api/favorites/collections');
}

export async function createFavoriteCollection(name: string): Promise<FavoriteCollection> {
  return request<FavoriteCollection>('/api/favorites/collections', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function renameFavoriteCollection(
  id: number,
  name: string
): Promise<FavoriteCollection> {
  return request<FavoriteCollection>(`/api/favorites/collections?id=${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export async function deleteFavoriteCollection(id: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/favorites/collections?id=${id}`, {
    method: 'DELETE',
  });
}

/** 移动某条收藏到指定 collection（collection_id=null 表示移到默认收藏） */
export async function moveFavorite(
  favoriteId: number,
  collectionId: number | null
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/favorites/${favoriteId}`, {
    method: 'PATCH',
    body: JSON.stringify({ collection_id: collectionId }),
  });
}

// ===== 草稿分享链接 =====
export interface ShareLinkResult {
  token: string;
  share_url: string;
  expires_at: string;
  id: number | null;
}

export async function createShareLink(postId: number | string): Promise<ShareLinkResult> {
  return request<ShareLinkResult>(`/api/posts/${postId}/share-link`, {
    method: 'POST',
  });
}

export async function revokeShareLink(
  postId: number | string,
  token?: string
): Promise<{ success: boolean }> {
  const qs = token ? `?token=${encodeURIComponent(token)}` : '';
  return request<{ success: boolean }>(`/api/posts/${postId}/share-link${qs}`, {
    method: 'DELETE',
  });
}

export async function getSharedPost(
  postId: number | string,
  token: string
): Promise<{ post: Post; is_share_preview: boolean; expires_at: string }> {
  return request(`/api/posts/${postId}/share-link?token=${encodeURIComponent(token)}`);
}

/** /share/:token 公开页面用的读取接口（无需 postId，后端按 token 反查） */
export async function getSharedPostByToken(
  token: string
): Promise<{ post: Post; is_share_preview: boolean; expires_at: string }> {
  const API_BASE: string = (import.meta.env.VITE_API_BASE as string) || '';
  const res = await fetch(`${API_BASE}/api/posts/0/share-link?token=${encodeURIComponent(token)}`, {
    credentials: 'same-origin',
  });
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      msg = data.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// ===== Messages (站内信) =====
export async function getMessages(
  box: 'inbox' | 'sent' | 'unread' = 'inbox'
): Promise<Message[]> {
  return request<Message[]>(`/api/messages?box=${box}`);
}

export async function getMessage(id: number): Promise<Message> {
  return request<Message>(`/api/messages/${id}`);
}

export async function sendMessage(
  to: string,
  subject: string,
  content: string
): Promise<Message> {
  return request<Message>('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ to, subject, content }),
  });
}

export async function deleteMessage(id: number): Promise<void> {
  await request<void>(`/api/messages/${id}`, { method: 'DELETE' });
}

// ===== Unread count (for header badge) =====
export async function getUnreadCount(): Promise<number> {
  try {
    const msgs = await getMessages('unread');
    return msgs.length;
  } catch {
    return 0;
  }
}

// ===== Admin =====
export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  avatar: string;
  bio: string;
  created_at: string;
  posts_count: number;
  comments_count: number;
}

export interface AdminPost {
  id: number;
  title: string;
  slug: string;
  category: string;
  published: number;
  status: 'published' | 'draft';
  views: number;
  created_at: string;
  updated_at: string;
  author_username: string | null;
  likes_count: number;
  comments_count: number;
  is_pinned: number;
  is_featured: number;
  tags?: string;
}

export interface AdminComment {
  id: number;
  content: string;
  created_at: string;
  post_id: number;
  author_username: string;
  post_title: string;
  post_slug: string;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  return request<AdminUser[]>('/api/admin/users');
}

export async function updateUserRole(
  id: number,
  role: 'member' | 'admin'
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/admin/users?id=${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function getAdminPosts(): Promise<AdminPost[]> {
  return request<AdminPost[]>('/api/admin/posts');
}

export async function getAdminComments(): Promise<AdminComment[]> {
  return request<AdminComment[]>('/api/admin/comments');
}

export async function promoteUser(
  username: string,
  secret: string
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>('/api/admin/promote', {
    method: 'POST',
    body: JSON.stringify({ username, secret }),
  });
}

// ===== 举报 Reports =====
export interface AdminReport {
  id: number;
  reporter_id: number;
  reporter_username: string;
  target_type: string;
  target_id: number;
  target_label: string;
  reason: string;
  status: string;
  created_at: string;
}

export async function reportTarget(
  targetType: 'post' | 'comment' | 'user',
  targetId: number,
  reason: string
): Promise<void> {
  await request<void>('/api/reports', {
    method: 'POST',
    body: JSON.stringify({ target_type: targetType, target_id: targetId, reason }),
  });
}

export async function getAdminReports(): Promise<AdminReport[]> {
  return request<AdminReport[]>('/api/admin/reports');
}

export async function updateReportStatus(
  id: number,
  status: 'resolved' | 'dismissed'
): Promise<void> {
  await request<void>(`/api/admin/reports?id=${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ id, status }),
  });
}

// ===== Analytics =====
export interface AnalyticsData {
  userGrowth: { day: string; count: number }[];
  postGrowth: { day: string; count: number }[];
  commentGrowth: { day: string; count: number }[];
  categoryDist: { category: string; count: number }[];
  topPosts: {
    id: number;
    title: string;
    slug: string;
    views: number;
    likes_count: number;
    comments_count: number;
    score: number;
  }[];
  topUsers: { id: number; username: string; post_count: number }[];
  overview: {
    users: number;
    posts: number;
    comments: number;
    likes: number;
    views: number;
    pendingReports: number;
  };
  trends7d?: Array<{ date: string; posts: number; users: number; comments: number }>;
  userGrowth30d?: Array<{ date: string; daily_count: number; cumulative: number }>;
  pvUv?: { totalPV: number; totalUV: number };
  topViewedPosts?: Array<{
    id: number;
    title: string;
    slug: string;
    category: string;
    pv: number;
    uv: number;
    legacy_views: number;
  }>;
  pvTrend30d?: Array<{ date: string; pv: number; uv: number }>;
}

export async function getAnalytics(): Promise<AnalyticsData> {
  return request<AnalyticsData>('/api/admin/analytics');
}

// ===== User Profile =====
export interface UserProfile {
  user: User;
  posts: Post[];
  stats: {
    posts_count: number;
    comments_count: number;
    total_likes_received: number;
    total_favorites_received: number;
    total_comments_received?: number;
    following_count?: number;
    followers_count?: number;
  };
  categories?: UserCategory[];
  is_following?: boolean;
}

export interface ProfileUpdate {
  display_name?: string;
  bio?: string;
  avatar?: string;
  location?: string;
  website?: string;
  profile_bg?: string;
  profile_css?: string;
  profile_layout?: string;
  social_github?: string;
  social_twitter?: string;
  social_qq?: string;
  social_wechat?: string;
  social_telegram?: string;
  social_bilibili?: string;
  social_email?: string;
  social_facebook?: string;
}

export async function getUserProfile(username: string): Promise<UserProfile> {
  return request<UserProfile>(`/api/users/${encodeURIComponent(username)}`);
}

// ===== 用户活动时间线 =====
export type ActivityType = 'post' | 'comment' | 'like' | 'favorite';

export interface ActivityItem {
  type: ActivityType;
  target_id: number;
  target_title: string;
  target_slug: string;
  created_at: string;
}

export async function getUserActivity(username: string): Promise<ActivityItem[]> {
  const data = await request<{ activities: ActivityItem[] }>(
    `/api/users/${encodeURIComponent(username)}/activity`
  );
  return data.activities;
}

export async function updateProfile(
  username: string,
  data: ProfileUpdate
): Promise<{ user: User; success: boolean; warning?: string }> {
  return request<{ user: User; success: boolean; warning?: string }>(
    `/api/users/${encodeURIComponent(username)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  );
}

// ===== 搜索 =====
export async function searchPosts(query: string): Promise<{ query: string; posts: SearchResult[] }> {
  return request<{ query: string; posts: SearchResult[] }>(
    `/api/search?q=${encodeURIComponent(query)}`
  );
}

// ===== 归档 =====
export interface ArchiveGroup {
  ym: string;
  year: number;
  month: number;
  count: number;
  posts: Array<{
    id: number;
    title: string;
    slug: string;
    category: string;
    created_at: string;
    author_username: string | null;
  }>;
}

export async function getArchives(): Promise<{ archives: ArchiveGroup[]; total: number }> {
  return request<{ archives: ArchiveGroup[]; total: number }>('/api/archives');
}

// ===== 标签云 =====
export interface TagStat {
  name: string;
  count: number;
}

export async function getTags(): Promise<TagStat[]> {
  const posts = await getPosts();
  const map = new Map<string, number>();
  for (const p of posts) {
    for (const t of p.tags.split(',').map((s) => s.trim()).filter(Boolean)) {
      map.set(t, (map.get(t) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getPostsByTag(tag: string): Promise<Post[]> {
  const posts = await getPosts();
  return posts.filter((p) =>
    p.tags.split(',').map((t) => t.trim()).includes(tag)
  );
}

// ===== 合集/专栏 =====
export interface Series {
  id: number;
  slug: string;
  title: string;
  description: string;
  cover_image: string;
  author_id: number | null;
  author_username?: string;
  posts_count?: number;
  created_at: string;
}

export interface SeriesPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  cover_image: string;
  views: number;
  created_at: string;
  sort_order: number;
  likes_count: number;
  comments_count: number;
}

export async function getSeriesList(): Promise<Series[]> {
  return request<Series[]>('/api/series');
}

export async function getSeries(slug: string): Promise<{ series: Series; posts: SeriesPost[] }> {
  return request(`/api/series/${slug}`);
}

export async function createSeries(data: { title: string; description?: string; cover_image?: string }): Promise<Series> {
  return request<Series>('/api/series', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSeries(slug: string, data: { title?: string; description?: string; cover_image?: string }): Promise<Series> {
  return request<Series>(`/api/series/${slug}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSeries(slug: string): Promise<void> {
  await request(`/api/series/${slug}`, { method: 'DELETE' });
}

export async function addPostToSeries(slug: string, postId: number, sortOrder?: number): Promise<void> {
  await request(`/api/series/${slug}/posts`, {
    method: 'POST',
    body: JSON.stringify({ post_id: postId, sort_order: sortOrder }),
  });
}

export async function removePostFromSeries(slug: string, postId: number): Promise<void> {
  await request(`/api/series/${slug}/posts?post_id=${postId}`, { method: 'DELETE' });
}

// ===== 邮箱订阅 =====
export async function subscribe(email: string): Promise<{ ok: boolean; message?: string }> {
  return request('/api/subscribe', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function unsubscribe(token: string): Promise<{ ok: boolean }> {
  return request(`/api/unsubscribe?token=${encodeURIComponent(token)}`, { method: 'DELETE' });
}

// ===== 友情链接 =====
export interface FriendLink {
  id: number;
  name: string;
  url: string;
  description: string;
  sort_order: number;
}

export async function getFriendLinks(): Promise<FriendLink[]> {
  return request<FriendLink[]>('/api/links');
}

export async function createFriendLink(data: { name: string; url: string; description?: string; sort_order?: number }): Promise<FriendLink> {
  return request<FriendLink>('/api/links', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteFriendLink(id: number): Promise<void> {
  await request(`/api/links?id=${id}`, { method: 'DELETE' });
}

// ===== 通知 =====
export async function getNotifications(box: 'all' | 'unread' = 'all'): Promise<NotificationItem[]> {
  const param = box === 'unread' ? '?box=unread' : '';
  return request<NotificationItem[]>(`/api/notifications${param}`);
}

export async function markNotificationsRead(opts: { id?: number; all?: boolean }): Promise<void> {
  await request<{ success: boolean }>('/api/notifications', {
    method: 'POST',
    body: JSON.stringify(opts),
  });
}

export async function deleteNotification(opts: { id?: number; all?: boolean }): Promise<void> {
  const qs = opts.all ? '?all=true' : opts.id ? `?id=${opts.id}` : '';
  await request<void>(`/api/notifications${qs}`, { method: 'DELETE' });
}

// ===== 关注 =====
export async function getFollowStatus(username: string): Promise<FollowStatus> {
  return request<FollowStatus>(`/api/follows?username=${encodeURIComponent(username)}`);
}

export async function toggleFollow(username: string): Promise<{ following: boolean }> {
  return request<{ following: boolean }>('/api/follows', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

// ===== 2FA =====
export interface TwoFactorStatus {
  enabled: boolean;
}

export interface TwoFactorSetup {
  secret: string;
  otpauth_url: string;
}

export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  return request<TwoFactorStatus>('/api/auth/2fa');
}

export async function setupTwoFactor(): Promise<TwoFactorSetup> {
  return request<TwoFactorSetup>('/api/auth/2fa', {
    method: 'POST',
    body: JSON.stringify({ action: 'setup' }),
  });
}

export async function enableTwoFactor(code: string): Promise<{ enabled: boolean; message?: string }> {
  return request<{ enabled: boolean; message?: string }>('/api/auth/2fa', {
    method: 'POST',
    body: JSON.stringify({ action: 'enable', code }),
  });
}

export async function disableTwoFactor(code: string): Promise<{ enabled: boolean; message?: string }> {
  return request<{ enabled: boolean; message?: string }>('/api/auth/2fa', {
    method: 'POST',
    body: JSON.stringify({ action: 'disable', code }),
  });
}

export function startGithubAuth(): void {
  window.location.href = '/api/auth/github';
}

export async function changePassword(newPassword: string, oldPassword?: string): Promise<void> {
  await request<void>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ newPassword, oldPassword }),
  });
}

// ===== Bug 报告 =====
export interface BugReportInput {
  type: string;
  severity: string;
  title: string;
  description: string;
  url?: string;
  browser?: string;
}

export interface BugReportItem {
  id: number;
  reporter_id: number | null;
  reporter_username: string | null;
  type: string;
  severity: string;
  title: string;
  description: string;
  url: string;
  browser: string;
  status: string;
  admin_note: string;
  created_at: string;
}

export async function submitBug(data: BugReportInput): Promise<{ success: boolean; id: number }> {
  return request<{ success: boolean; id: number }>('/api/bugs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getBugs(): Promise<BugReportItem[]> {
  const data = await request<{ bugs: BugReportItem[] }>('/api/bugs');
  return data.bugs;
}

// ===== 用户搜索（@ 补全） =====
export async function searchUsers(query: string): Promise<Array<{ id: number; username: string; display_name: string | null; avatar: string | null }>> {
  const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, { credentials: 'same-origin' })
  if (!res.ok) return []
  return res.json()
}

// ===== 关注 Feed =====
export interface FeedPost {
  id: number
  title: string
  slug: string
  excerpt: string
  category: string
  cover_image: string | null
  created_at: string
  author_username: string
  author_display_name: string | null
  author_avatar: string | null
  views: number
  likes_count: number
  comments_count: number
}
export async function getFollowingFeed(cursor?: string): Promise<{ posts: FeedPost[]; has_more: boolean; next_cursor: string | null }> {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  const qs = params.toString()
  return request(`/api/following/feed${qs ? `?${qs}` : ''}`, { credentials: 'same-origin' })
}

// ===== 批量操作（文章） =====
export async function batchPostAction(
  action: 'delete' | 'publish' | 'unpublish' | 'pin' | 'unpin',
  ids: number[]
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/admin/posts', {
    method: 'POST',
    body: JSON.stringify({ action, ids }),
  });
}

// ===== 分类管理 =====
export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  count: number;
}

export interface PublicCategory {
  id: number;
  name: string;
  slug: string;
  icon: string;
  count: number;
}

export async function getCategories(): Promise<PublicCategory[]> {
  return request<PublicCategory[]>('/api/categories');
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  return request<AdminCategory[]>('/api/admin/categories');
}

export async function createCategory(data: {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  sort_order?: number;
}): Promise<AdminCategory> {
  return request<AdminCategory>('/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCategory(
  id: number,
  data: Partial<{
    name: string;
    slug: string;
    description: string;
    icon: string;
    sort_order: number;
  }>
): Promise<AdminCategory> {
  return request<AdminCategory>(`/api/admin/categories?id=${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: number): Promise<{ success: boolean; id: number; name: string }> {
  return request(`/api/admin/categories?id=${id}`, {
    method: 'DELETE',
  });
}

// ===== 数据导入/导出 =====
export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  total: number;
  errors?: string[];
}

/** 触发浏览器下载：导出文章为 JSON 或 Markdown */
export async function exportPosts(format: 'json' | 'markdown'): Promise<void> {
  const res = await fetch(`/api/admin/export?format=${encodeURIComponent(format)}`, {
    credentials: 'same-origin',
  });
  if (!res.ok) {
    let msg = `导出失败: ${res.status}`;
    try {
      const data = await res.json();
      msg = data.error || msg;
    } catch {}
    throw new Error(msg);
  }
  const blob = await res.blob();
  const stamp = new Date().toISOString().slice(0, 10);
  const ext = format === 'markdown' ? 'md' : 'json';
  const filename = `posts-${stamp}.${ext}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 导入文章（接受数组或 { posts: [...] }） */
export async function importPosts(data: unknown): Promise<ImportResult> {
  return request<ImportResult>('/api/admin/import', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ===== 评论审核 =====
export interface AdminCommentWithStatus extends AdminComment {
  status?: string;
}

export async function getAdminPendingComments(): Promise<AdminCommentWithStatus[]> {
  return request<AdminCommentWithStatus[]>('/api/admin/comments?status=pending');
}

export async function moderateComment(
  id: number,
  action: 'approve' | 'reject' | 'spam'
): Promise<{ success: boolean; id: number; status: string }> {
  return request(`/api/admin/comments?id=${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ id, action }),
  });
}

// ===== 文章访问统计（PV/UV） =====
export interface PostStats {
  pv: number;
  uv: number;
}

/** 上报一次访问（前端在 PostDetail 加载时调用） */
export async function recordPostView(postId: number | string): Promise<void> {
  try {
    await fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ post_id: postId }),
    });
  } catch {
    // 静默失败：统计不应影响阅读体验
  }
}

/** 获取某篇文章的 PV/UV（作者或管理员） */
export async function getPostStats(slug: string): Promise<PostStats | null> {
  try {
    return await request<PostStats>(`/api/posts/${slug}/stats`);
  } catch {
    return null;
  }
}
