export interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  author_id?: number | null;
  author_username?: string | null;
  category: string;
  tags: string;
  cover_image: string;
  published: number;
  views: number;
  likes_count?: number;
  comments_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PostInput {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string;
  cover_image: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  avatar: string;
  bio: string;
  created_at: string;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  parent_id: number | null;
  content: string;
  created_at: string;
  author_username: string;
  author_avatar: string;
}

export interface LikeStatus {
  count: number;
  liked: boolean;
}

export interface FavoriteStatus {
  favorited: boolean;
  action?: string;
}

export interface Message {
  id: number;
  subject: string;
  content: string;
  read_at: string | null;
  created_at: string;
  from_id?: number;
  from_username?: string;
  from_avatar?: string;
  to_id?: number;
  to_username?: string;
  to_avatar?: string;
}
