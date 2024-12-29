'use client';

import { UserProfile } from '@/lib/types/user';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ProfileHeaderProps {
  profile: UserProfile;
  onEditProfile?: () => void;
}

export default function ProfileHeader({ profile, onEditProfile }: ProfileHeaderProps) {
  return (
    <div className="relative">
      {/* Cover Image */}
      <div className="h-48 bg-secondary">
        {profile.coverImageUrl && (
          <img
            src={profile.coverImageUrl}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Profile Info */}
      <div className="px-4 pb-4">
        <div className="relative -mt-16">
          <Avatar className="w-32 h-32 border-4 border-background">
            <AvatarImage src={profile.avatarUrl} alt={profile.name} />
            <AvatarFallback>{profile.name[0]}</AvatarFallback>
          </Avatar>
        </div>

        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{profile.name}</h1>
            <p className="text-muted-foreground">@{profile.username}</p>
          </div>
          {profile.isCurrentUser ? (
            <Button onClick={onEditProfile} variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <Button>Follow</Button>
          )}
        </div>

        {profile.bio && <p className="mt-4">{profile.bio}</p>}

        <div className="mt-4 flex items-center space-x-4 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Joined {format(new Date(profile.createdAt), 'MMMM yyyy')}</span>
        </div>

        <div className="mt-4 flex space-x-4">
          <div>
            <span className="font-bold">{profile.followingCount}</span>{' '}
            <span className="text-muted-foreground">Following</span>
          </div>
          <div>
            <span className="font-bold">{profile.followersCount}</span>{' '}
            <span className="text-muted-foreground">Followers</span>
          </div>
        </div>
      </div>
    </div>
  );
}