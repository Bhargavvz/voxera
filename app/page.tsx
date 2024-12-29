'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Loader2, MicIcon } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/feed');
    }
  }, [isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-background to-secondary p-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <MicIcon className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold">Voxera</h1>
          </div>
          <h2 className="text-4xl sm:text-6xl font-bold tracking-tight">
            Share Your Voice with the World
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join Voxera today and connect with people who share your interests. Share your thoughts, engage in meaningful conversations, and build lasting connections.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8" onClick={() => router.push('/register')}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => router.push('/login')}>
              Sign In
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-muted py-16">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold">Connect</h3>
            <p className="text-muted-foreground">Find and connect with people who share your interests and passions.</p>
          </div>
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold">Share</h3>
            <p className="text-muted-foreground">Share your thoughts, ideas, and experiences with your community.</p>
          </div>
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold">Engage</h3>
            <p className="text-muted-foreground">Engage in meaningful conversations and build lasting relationships.</p>
          </div>
        </div>
      </div>
    </div>
  );
}