import type {
  Post,
  PostInput,
  User,
  Comment,
  LikeStatus,
  Message,
} from './types';

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
export async function getPosts(): Promise<Post[]> {
  return request<Post[]>('/api/posts');
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
): Promise<{ user: User; token: string }> {
  return request<{ user: User; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
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
  views: number;
  created_at: string;
  updated_at: string;
  author_username: string | null;
  likes_count: number;
  comments_count: number;
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
