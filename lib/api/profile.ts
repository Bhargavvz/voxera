import { supabase } from '@/lib/supabase/client';
import { UserProfile } from '@/lib/types/user';

export async function updateProfile(userId: string, data: Partial<UserProfile>) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return profile;
}

export async function uploadProfileImage(
  userId: string,
  file: File,
  type: 'avatar' | 'cover'
) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${type}.${fileExt}`;
  const { data, error } = await supabase.storage
    .from('profiles')
    .upload(fileName, file, { upsert: true });

  if (error) throw error;

  const { data: publicUrl } = supabase.storage
    .from('profiles')
    .getPublicUrl(fileName);

  return publicUrl.publicUrl;
}