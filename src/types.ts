export interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string;
  cover_image: string;
  published: number;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface PostInput {
  title: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string;
  cover_image: string;
}
