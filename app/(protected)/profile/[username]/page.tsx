'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase/client';
import { Profile } from '@/hooks/use-auth';
import { Post } from '@/lib/types/post';
import { Button } from '@/components/ui/button';
import { Loader2, Settings, Edit, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PostList from '@/components/posts/PostList';
import { toast } from '@/components/ui/use-toast';

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { user, profile: currentUserProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [stats, setStats] = useState({
    posts: 0,
    followers: 0,
    following: 0,
  });

  const username = params?.username as string;
  const isOwnProfile = currentUserProfile?.username === username;

  useEffect(() => {
    if (!username) return;

    const fetchProfile = async () => {
      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Check if following
        if (user && !isOwnProfile) {
          const { data: followData } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', user.id)
            .eq('following_id', profileData.id)
            .single();
          
          setIsFollowing(!!followData);
        }

        // Fetch posts with likes count
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            *,
            author:profiles(id, username, name, avatar_url),
            likes:post_likes(count),
            comments:post_comments(count)
          `)
          .eq('author_id', profileData.id)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        // Transform posts data
        const transformedPosts = postsData.map(post => ({
          ...post,
          author: post.author[0],
          likes: post.likes.length,
          comments: post.comments.length,
          createdAt: post.created_at,
        }));

        setPosts(transformedPosts);

        // Fetch stats
        const [postsCount, followersCount, followingCount] = await Promise.all([
          supabase
            .from('posts')
            .select('id', { count: 'exact' })
            .eq('author_id', profileData.id),
          supabase
            .from('follows')
            .select('follower_id', { count: 'exact' })
            .eq('following_id', profileData.id),
          supabase
            .from('follows')
            .select('following_id', { count: 'exact' })
            .eq('follower_id', profileData.id),
        ]);

        setStats({
          posts: postsCount.count || 0,
          followers: followersCount.count || 0,
          following: followingCount.count || 0,
        });

      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username, user, isOwnProfile]);

  const handleFollow = async () => {
    if (!user || !profile) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id);

        if (error) throw error;

        setStats(prev => ({
          ...prev,
          followers: prev.followers - 1,
        }));

        // Create notification
        await supabase.from('notifications').insert([
          {
            user_id: profile.id,
            actor_id: user.id,
            type: 'follow',
          },
        ]);

      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert([
            {
              follower_id: user.id,
              following_id: profile.id,
            },
          ]);

        if (error) throw error;

        setStats(prev => ({
          ...prev,
          followers: prev.followers + 1,
        }));
      }

      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error following/unfollowing:', error);
      toast({
        title: "Error",
        description: "Failed to follow/unfollow. Please try again.",
        variant: "destructive"
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = () => {
    router.push('/messages');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Profile not found</h1>
          <p className="text-muted-foreground">The user you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.push('/feed')}>Return to Feed</Button>
        </div>
      </div>
    );
  }

  const initials = profile.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="space-y-8">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center gap-8">
          <Avatar className="h-32 w-32">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.name} />
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <h1 className="text-2xl font-bold">{profile.name}</h1>
              <span className="text-muted-foreground">@{profile.username}</span>
              {isOwnProfile ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/settings')}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/profile/edit')}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    onClick={handleFollow}
                    disabled={followLoading}
                  >
                    {followLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      isFollowing ? "Unfollow" : "Follow"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleMessage}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
              )}
            </div>

            {profile.bio && (
              <p className="text-muted-foreground">{profile.bio}</p>
            )}

            <div className="flex justify-center md:justify-start gap-8">
              <div className="text-center">
                <div className="font-bold">{stats.posts}</div>
                <div className="text-muted-foreground text-sm">Posts</div>
              </div>
              <div className="text-center cursor-pointer hover:opacity-80">
                <div className="font-bold">{stats.followers}</div>
                <div className="text-muted-foreground text-sm">Followers</div>
              </div>
              <div className="text-center cursor-pointer hover:opacity-80">
                <div className="font-bold">{stats.following}</div>
                <div className="text-muted-foreground text-sm">Following</div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Posts</h2>
          {posts.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No posts yet
            </div>
          ) : (
            <PostList posts={posts} />
          )}
        </div>
      </div>
    </div>
  );
}