export interface Profile {
  id: string;
  username: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
}

export interface Post {
  id: string;
  content: string;
  author: Profile;
  likes: number;
  comments: number;
  isLiked: boolean;
  createdAt: string;
}