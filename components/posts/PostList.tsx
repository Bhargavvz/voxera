'use client';

import { useAuth } from '@/hooks/use-auth';
import { Post } from '@/lib/types/post';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';

interface PostListProps {
  posts: Post[];
  onLike?: (postId: string) => Promise<void>;
  onDelete?: (postId: string) => Promise<void>;
}

export default function PostList({ posts, onLike, onDelete }: PostListProps) {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <div key={post.id} className="bg-card p-4 rounded-lg border">
          <div className="flex space-x-4">
            <Avatar>
              <AvatarImage src={post.author.avatar_url || undefined} alt={post.author.name} />
              <AvatarFallback>
                {post.author.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{post.author.name}</div>
                  <div className="text-sm text-muted-foreground">
                    @{post.author.username} · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </div>
                </div>
                {user?.id === post.author.id && onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(post.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap">{post.content}</p>
              <div className="mt-4 flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => onLike?.(post.id)}
                >
                  <Heart className="h-4 w-4 mr-2" />
                  {post.likes}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {post.comments}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}