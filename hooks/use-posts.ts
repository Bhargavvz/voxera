'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/components/ui/use-toast';
import { Post, Profile } from '@/lib/types/post';

interface DatabasePost {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles: Profile[];
}

export function usePosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      // First, fetch all posts with author info
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          author_id,
          profiles (
            id,
            username,
            name,
            bio,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      if (!postsData) {
        setPosts([]);
        return;
      }

      // Then, fetch likes count for each post
      const postsWithCounts = await Promise.all(
        (postsData as DatabasePost[]).map(async (post) => {
          const { count: likesCount } = await supabase
            .from('post_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { count: commentsCount } = await supabase
            .from('post_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          // Check if current user has liked the post
          const { data: userLike } = await supabase
            .from('post_likes')
            .select('*')
            .eq('post_id', post.id)
            .eq('user_id', user?.id)
            .single();

          if (!post.profiles?.[0]) {
            throw new Error('Post author not found');
          }

          return {
            id: post.id,
            content: post.content,
            author: post.profiles[0],
            likes: likesCount || 0,
            comments: commentsCount || 0,
            isLiked: !!userLike,
            createdAt: post.created_at,
          };
        })
      );

      setPosts(postsWithCounts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts. Please try refreshing the page.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (content: string) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create a post.",
        variant: "destructive"
      });
      return;
    }

    try {
      // First create the post
      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert({
          content,
          author_id: user.id,
        })
        .select('id')
        .single();

      if (postError) throw postError;
      if (!newPost) throw new Error('Failed to create post');

      // Then fetch the complete post with author info
      const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          author_id,
          profiles (
            id,
            username,
            name,
            bio,
            avatar_url
          )
        `)
        .eq('id', newPost.id)
        .single();

      if (fetchError) throw fetchError;
      if (!post || !post.profiles?.[0]) throw new Error('Failed to fetch post');

      const createdPost: Post = {
        id: post.id,
        content: post.content,
        author: post.profiles[0],
        likes: 0,
        comments: 0,
        isLiked: false,
        createdAt: post.created_at,
      };

      setPosts(prev => [createdPost, ...prev]);
      toast({
        title: "Success",
        description: "Post created successfully!",
      });
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create post. Please try again.",
        variant: "destructive"
      });
    }
  };

  const deletePost = async (postId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('author_id', user.id);

      if (error) throw error;

      setPosts(prev => prev.filter(post => post.id !== postId));
      toast({
        title: "Success",
        description: "Post deleted successfully!",
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post. Please try again.",
        variant: "destructive"
      });
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to like posts.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;

        setPosts(prev =>
          prev.map(post =>
            post.id === postId
              ? { ...post, likes: post.likes - 1, isLiked: false }
              : post
          )
        );
      } else {
        // Like
        const { error } = await supabase
          .from('post_likes')
          .insert([
            {
              post_id: postId,
              user_id: user.id,
            },
          ]);

        if (error) throw error;

        setPosts(prev =>
          prev.map(post =>
            post.id === postId
              ? { ...post, likes: post.likes + 1, isLiked: true }
              : post
          )
        );
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to like/unlike post. Please try again.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchPosts();

    // Subscribe to changes
    const channel = supabase
      .channel('posts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    posts,
    loading,
    createPost,
    deletePost,
    toggleLike,
  };
} 