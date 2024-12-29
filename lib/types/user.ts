export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  followersCount: number;
  followingCount: number;
  createdAt: string;
}

export interface UserProfile extends User {
  isFollowing?: boolean;
  isCurrentUser?: boolean;
}