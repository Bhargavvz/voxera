import { supabase } from '@/lib/supabase/client';
import { CreatePostData, Post } from '@/lib/types/post';

interface GetPostsOptions {
  limit?: number;
  offset?: number;
  userId?: string;
}

export async function getPosts({ limit = 10, offset = 0, userId }: GetPostsOptions = {}) {
  const query = supabase
    .from('posts')
    .select(`
      id,
      content,
      image_url,
      likes_count,
      comments_count,
      created_at,
      profiles:author_id (
        id,
        name,
        username,
        avatar_url
      ),
      post_likes (
        user_id
      )
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) {
    query.eq('author_id', userId);
  }

  const { data: posts, error } = await query;

  if (error) throw error;
  return posts.map(transformPost);
}

export async function createPost(authorId: string, data: CreatePostData) {
  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      author_id: authorId,
      content: data.content,
      image_url: data.imageUrl,
    })
    .select(`
      id,
      content,
      image_url,
      likes_count,
      comments_count,
      created_at,
      profiles:author_id (
        id,
        name,
        username,
        avatar_url
      )
    `)
    .single();

  if (error) throw error;
  return transformPost(post);
}

export async function toggleLike(postId: string, userId: string) {
  const { data: existingLike } = await supabase
    .from('post_likes')
    .select()
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (existingLike) {
    await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
  } else {
    await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: userId });
  }
}

export function transformPost(post: any): Post {
  return {
    id: post.id,
    content: post.content,
    imageUrl: post.image_url,
    author: {
      id: post.profiles.id,
      name: post.profiles.name,
      username: post.profiles.username,
      avatarUrl: post.profiles.avatar_url,
    },
    likes: post.likes_count,
    comments: post.comments_count,
    isLiked: post.post_likes?.some((like: any) => like.user_id === supabase.auth.user()?.id),
    createdAt: post.created_at,
  };
}