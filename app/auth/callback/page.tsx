'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the error and error description from the URL
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          throw new Error(errorDescription || 'Error during authentication');
        }

        // Get the hash from the URL if it exists
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          // Set the session with the tokens
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) throw sessionError;
        } else {
          // Try to exchange the code for a session
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: searchParams.get('email') || '',
            password: searchParams.get('password') || '',
          });

          if (signInError) throw signInError;
        }

        // Check if the user is now authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          throw new Error('No user found after authentication');
        }

        // Redirect to feed on success
        router.push('/feed');
      } catch (error) {
        console.error('Error during authentication:', error);
        const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
        router.push('/login?error=' + encodeURIComponent(errorMessage));
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Logging you in...</h1>
        <p className="text-muted-foreground">Please wait while we complete the process.</p>
      </div>
    </div>
  );
} 