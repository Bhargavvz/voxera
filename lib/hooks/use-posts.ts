'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Post } from '@/lib/types/post';
import { getPosts, transformPost } from '@/lib/api/posts';

const POSTS_PER_PAGE = 10;

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    loadInitialPosts();
    subscribeToUpdates();

    return () => {
      supabase.channel('posts').unsubscribe();
    };
  }, []);

  const loadInitialPosts = async () => {
    try {
      const initialPosts = await getPosts({ limit: POSTS_PER_PAGE, offset: 0 });
      setPosts(initialPosts);
      setHasMore(initialPosts.length === POSTS_PER_PAGE);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (!hasMore || loading) return;

    const nextPage = page + 1;
    setLoading(true);

    try {
      const newPosts = await getPosts({
        limit: POSTS_PER_PAGE,
        offset: nextPage * POSTS_PER_PAGE,
      });
      setPosts((prev) => [...prev, ...newPosts]);
      setHasMore(newPosts.length === POSTS_PER_PAGE);
      setPage(nextPage);
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    supabase
      .channel('posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          const newPost = transformPost(payload.new);
          setPosts((prev) => [newPost, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          const updatedPost = transformPost(payload.new);
          setPosts((prev) =>
            prev.map((post) =>
              post.id === updatedPost.id ? updatedPost : post
            )
          );
        }
      )
      .subscribe();
  };

  return {
    posts,
    loading,
    hasMore,
    loadMore: loadMorePosts,
  };
}