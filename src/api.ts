import type { Post, PostInput } from './types';

const API_BASE = '/api/posts';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function getPosts(): Promise<Post[]> {
  return request<Post[]>(API_BASE);
}

export async function getPost(slug: string): Promise<Post> {
  return request<Post>(`${API_BASE}/${slug}`);
}

export async function createPost(data: PostInput): Promise<Post> {
  return request<Post>(API_BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePost(id: number, data: PostInput): Promise<Post> {
  return request<Post>(`${API_BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePost(id: number): Promise<void> {
  await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
}
