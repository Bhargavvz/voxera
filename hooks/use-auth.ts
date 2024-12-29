'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Profile } from '@/lib/types/post';
import { toast } from '@/components/ui/use-toast';
import { PostgrestSingleResponse } from '@supabase/postgrest-js';
import { User } from '@supabase/supabase-js';

async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(operation, retries - 1, delay * 1.5);
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const response = await withRetry(async () => {
        const result = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        return result as PostgrestSingleResponse<Profile>;
      });

      if (response.error) {
        if (response.error.code === 'PGRST116') {
          console.log('Profile not found, retrying in 1s...');
          // No profile found, might need to wait for the trigger to create it
          setTimeout(() => fetchProfile(userId), 1000);
          return;
        }
        throw response.error;
      }

      console.log('Profile fetched successfully:', response.data);
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile. Please try refreshing the page.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    console.log('Auth hook mounted, checking session...');

    // Get initial session
    withRetry(() => supabase.auth.getSession())
      .then(({ data: { session } }) => {
        if (!mounted) return;
        
        console.log('Initial session:', session);
        setUser(session?.user ?? null);
        if (session?.user) {
          console.log('User found in session, fetching profile...');
          fetchProfile(session.user.id);
        } else {
          console.log('No user in session');
          setLoading(false);
        }
      })
      .catch(error => {
        console.error('Error getting session:', error);
        if (mounted) {
          setLoading(false);
          toast({
            title: 'Error',
            description: 'Failed to load session. Please try refreshing the page.',
            variant: 'destructive',
          });
        }
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      console.log('Auth state changed:', { event: _event, session });
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log('User found in auth change, fetching profile...');
        fetchProfile(session.user.id);
      } else {
        console.log('No user in auth change');
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      console.log('Auth hook unmounting...');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    profile,
    isAuthenticated: !!user,
    loading,
  };
} 