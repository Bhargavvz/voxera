'use client';

import { Button } from '@/components/ui/button';
import { MicIcon } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function HeroSection() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center py-20 px-4"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="flex justify-center mb-8"
      >
        <div className="relative">
          <MicIcon className="h-16 w-16 text-primary" />
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-primary/10 rounded-full -z-10"
          />
        </div>
      </motion.div>

      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60"
      >
        Connect, Share, and Engage
      </motion.h1>

      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto"
      >
        Join millions of users sharing their thoughts, experiences, and stories
        in a vibrant social community.
      </motion.p>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="flex flex-col sm:flex-row justify-center gap-4"
      >
        <Link href="/register">
          <Button size="lg" className="text-lg px-8 w-full sm:w-auto">
            Get Started
          </Button>
        </Link>
        <Link href="/about">
          <Button size="lg" variant="outline" className="text-lg px-8 w-full sm:w-auto">
            Learn More
          </Button>
        </Link>
      </motion.div>
    </motion.div>
  );
}