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

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
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

export async function getFavorites(): Promise<Post[]> {
  return request<Post[]>('/api/favorites');
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
}

export async function getUserProfile(username: string): Promise<UserProfile> {
  return request<UserProfile>(`/api/users/${encodeURIComponent(username)}`);
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
