'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { usePosts } from '@/hooks/use-posts';
import { Loader2 } from 'lucide-react';
import CreatePost from '@/components/posts/CreatePost';
import PostList from '@/components/posts/PostList';

export default function FeedPage() {
  const router = useRouter();
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const { posts, loading: postsLoading, createPost, deletePost, toggleLike } = usePosts();

  useEffect(() => {
    console.log('Feed page auth state:', { isAuthenticated, authLoading, user, profile });
    if (!authLoading && !isAuthenticated) {
      console.log('User not authenticated, redirecting to login...');
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router, user, profile]);

  if (authLoading) {
    console.log('Auth loading...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    console.log('User not authenticated, rendering null');
    return null;
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="space-y-8">
        <CreatePost onSubmit={createPost} />
        {postsLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No posts yet. Be the first to post!
          </div>
        ) : (
          <PostList
            posts={posts}
            onLike={toggleLike}
            onDelete={deletePost}
          />
        )}
      </div>
    </div>
  );
}