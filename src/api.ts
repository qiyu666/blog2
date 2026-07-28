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
    following_count?: number;
    followers_count?: number;
  };
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
}

export async function getUserProfile(username: string): Promise<UserProfile> {
  return request<UserProfile>(`/api/users/${encodeURIComponent(username)}`);
}

export async function updateProfile(
  username: string,
  data: ProfileUpdate
): Promise<{ user: User; success: boolean }> {
  return request<{ user: User; success: boolean }>(
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
