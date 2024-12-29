import { supabase } from './supabase/client';
import { toast } from '@/components/ui/use-toast';
import { AuthError as SupabaseAuthError, AuthResponse, User } from '@supabase/supabase-js';
import { PostgrestError, PostgrestResponse, PostgrestSingleResponse } from '@supabase/postgrest-js';

export type AuthError = {
  message: string;
};

type Profile = {
  id: string;
  username: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
};

// Utility function to handle retries
async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000,
  shouldRetry = (error: unknown) => true
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (
      retries === 0 ||
      (error instanceof Error && 
        (error.message.includes('rate limit') || !shouldRetry(error)))
    ) {
      throw error;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(operation, retries - 1, delay * 1.5, shouldRetry);
  }
}

async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
    .throwOnError();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await withRetry(() =>
      supabase.auth.signInWithPassword({
        email,
        password,
      })
    );

    if (error) throw error;

    // After successful sign in, get the user's profile
    if (data.user) {
      try {
        const profile = await getProfile(data.user.id);
        return { 
          user: data.user, 
          session: data.session,
          profile,
          error: null 
        };
      } catch (profileError) {
        console.error('Error fetching profile:', profileError);
        // Continue with sign in even if profile fetch fails
        return { user: data.user, session: data.session, error: null };
      }
    }

    return { user: data.user, session: data.session, error: null };
  } catch (error) {
    console.error('Error signing in:', error);
    let message = 'An error occurred during sign in';
    if (error instanceof Error) {
      if (error.message.includes('Email not confirmed')) {
        message = 'Please check your email to confirm your account before signing in.';
      } else if (error.message.includes('timeout') || error.message.includes('504')) {
        message = 'Connection timeout. Please check your internet connection and try again.';
      } else if (error.message.includes('rate limit')) {
        message = 'Too many attempts. Please wait a moment before trying again.';
      } else if (error.message.includes('Invalid login credentials')) {
        message = 'Invalid email or password';
      } else {
        message = error.message;
      }
    }
    return { user: null, error: { message } };
  }
}

export async function signUp(
  email: string,
  password: string,
  username: string
) {
  try {
    // First check if username is available
    const { data: existingUser, error: checkError } = await withRetry(
      async () => {
        const response = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username)
          .maybeSingle();
        return response;
      },
      3,
      1000
    );

    if (checkError) {
      // Ignore PGRST116 (no rows returned) as it means username is available
      if (checkError.code !== 'PGRST116') {
        throw checkError;
      }
    }

    if (existingUser) {
      return {
        user: null,
        error: { message: 'Username is already taken' },
      };
    }

    // Add a delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Sign up the user - the trigger will create the profile
    const { data, error } = await withRetry(
      () => supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            name: username,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      }),
      3,
      2000,
      (error) => !(error instanceof Error && error.message.includes('rate limit'))
    );

    if (error) {
      if (error.message.includes('rate limit')) {
        return {
          user: null,
          error: { message: 'Please wait a minute before trying again' },
        };
      }
      throw error;
    }

    if (!data?.user) {
      throw new Error('Failed to create user account');
    }

    // Try to sign in immediately if no email confirmation is required
    if (data.session) {
      try {
        const profile = await getProfile(data.user.id);
        return {
          user: data.user,
          session: data.session,
          profile,
          error: null,
          message: 'Account created successfully! Redirecting...',
        };
      } catch (profileError) {
        console.error('Error fetching profile:', profileError);
        return {
          user: data.user,
          session: data.session,
          error: null,
          message: 'Account created successfully! Redirecting...',
        };
      }
    }

    // If email confirmation is required
    return {
      user: data.user,
      error: null,
      message: 'Please check your email to confirm your account. You can close this window.',
    };
  } catch (error) {
    console.error('Error signing up:', error);
    let message = 'An error occurred during sign up';
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('504')) {
        message = 'Connection timeout. Please check your internet connection and try again.';
      } else if (error.message.includes('rate limit')) {
        message = 'Please wait a minute before trying again.';
      } else if (error.message.includes('Database tables not set up')) {
        message = 'Database setup required. Please contact support.';
      } else if (error.message.includes('User already registered')) {
        message = 'An account with this email already exists.';
      } else {
        message = error.message;
      }
    }
    return { user: null, error: { message } };
  }
}

export async function signOut() {
  try {
    const { error } = await withRetry(() => supabase.auth.signOut());
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    let message = 'An error occurred during sign out';
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('504')) {
        message = 'Connection timeout. Please check your internet connection and try again.';
      } else {
        message = error.message;
      }
    }
    return { error: { message } };
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await withRetry(() => supabase.auth.getUser());
    if (error) throw error;

    if (user) {
      try {
        const profile = await getProfile(user.id);
        return { user, profile, error: null };
      } catch (profileError) {
        console.error('Error fetching profile:', profileError);
        return { user, error: null };
      }
    }

    return { user, error: null };
  } catch (error) {
    console.error('Error getting current user:', error);
    let message = 'Error getting current user';
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('504')) {
        message = 'Connection timeout. Please check your internet connection and try again.';
      } else {
        message = error.message;
      }
    }
    return { user: null, error: { message } };
  }
}