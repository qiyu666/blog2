export interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  author_id?: number | null;
  author_username?: string | null;
  author_avatar?: string | null;
  category: string;
  tags: string;
  cover_image: string;
  published: number;
  views: number;
  likes_count?: number;
  comments_count?: number;
  is_pinned?: number;
  is_featured?: number;
  custom_js?: string;
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
  published?: number;
  custom_js?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  avatar: string;
  bio: string;
  display_name?: string;
  location?: string;
  website?: string;
  profile_css?: string;
  profile_bg?: string;
  profile_layout?: string;
  password_hash?: string;
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
  likes_count?: number;
  liked?: boolean;
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

export interface SearchResult {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  cover_image: string;
  views: number;
  created_at: string;
  author_id?: number | null;
  author_username?: string | null;
  likes_count?: number;
  comments_count?: number;
  highlight?: string;
}

export interface FollowStatus {
  following: number;
  followers: number;
  is_following: boolean;
}

export interface NotificationItem {
  id: number;
  type: 'comment_reply' | 'post_comment' | 'like' | 'favorite' | 'follow' | 'message' | 'system';
  read_at: string | null;
  created_at: string;
  post_id: number | null;
  comment_id: number | null;
  message_id: number | null;
  actor_username: string | null;
  actor_avatar: string | null;
  post_title: string | null;
  post_slug: string | null;
}
