'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender: {
    id: string;
    username: string;
    name: string;
    avatar_url: string | null;
  };
};

type Conversation = {
  user: {
    id: string;
    username: string;
    name: string;
    avatar_url: string | null;
  };
  lastMessage: Message | null;
  unreadCount: number;
};

export default function MessagesPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<Conversation['user'] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      try {
        // Fetch all messages to/from the current user
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(
              id,
              username,
              name,
              avatar_url
            )
          `)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Group messages by conversation
        const conversationsMap = new Map<string, Conversation>();
        
        data.forEach(message => {
          const otherUserId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
          const otherUser = message.sender_id === user.id ? null : message.sender[0];
          
          if (!conversationsMap.has(otherUserId)) {
            conversationsMap.set(otherUserId, {
              user: otherUser || { id: otherUserId }, // We'll need to fetch missing user info
              lastMessage: message,
              unreadCount: message.sender_id !== user.id && !message.read ? 1 : 0,
            });
          } else {
            const conv = conversationsMap.get(otherUserId)!;
            if (message.sender_id !== user.id && !message.read) {
              conv.unreadCount++;
            }
          }
        });

        // Fetch missing user info
        const missingUserIds = Array.from(conversationsMap.values())
          .filter(conv => !conv.user.username)
          .map(conv => conv.user.id);

        if (missingUserIds.length > 0) {
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('id, username, name, avatar_url')
            .in('id', missingUserIds);

          if (userError) throw userError;

          userData.forEach(u => {
            const conv = conversationsMap.get(u.id);
            if (conv) {
              conv.user = u;
            }
          });
        }

        setConversations(Array.from(conversationsMap.values()));
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    // Subscribe to new messages
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !selectedUser) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(
              id,
              username,
              name,
              avatar_url
            )
          `)
          .or(
            `and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),` +
            `and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user.id})`
          )
          .order('created_at', { ascending: true });

        if (error) throw error;

        const transformedMessages = data.map(message => ({
          ...message,
          sender: message.sender[0],
        }));

        setMessages(transformedMessages);

        // Mark messages as read
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('receiver_id', user.id)
          .eq('sender_id', selectedUser.id)
          .eq('read', false);

      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [user, selectedUser]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedUser || !newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user.id,
            receiver_id: selectedUser.id,
            content: newMessage.trim(),
          },
        ]);

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container max-w-6xl mx-auto h-[calc(100vh-4rem)] p-4">
      <div className="grid grid-cols-[300px_1fr] h-full gap-4">
        {/* Conversations List */}
        <div className="border rounded-lg overflow-hidden">
          <div className="p-4 border-b bg-card">
            <h2 className="font-semibold">Messages</h2>
          </div>
          <div className="overflow-y-auto h-[calc(100%-4rem)]">
            {conversations.map((conversation) => (
              <div
                key={conversation.user.id}
                className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-accent ${
                  selectedUser?.id === conversation.user.id ? 'bg-accent' : ''
                }`}
                onClick={() => setSelectedUser(conversation.user)}
              >
                <Avatar>
                  <AvatarImage
                    src={conversation.user.avatar_url || undefined}
                    alt={conversation.user.name}
                  />
                  <AvatarFallback>
                    {conversation.user.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold truncate">
                      {conversation.user.name}
                    </span>
                    {conversation.lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.lastMessage.created_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  {conversation.lastMessage && (
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.lastMessage.content}
                    </p>
                  )}
                </div>
                {conversation.unreadCount > 0 && (
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {conversation.unreadCount}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="border rounded-lg overflow-hidden flex flex-col">
          {selectedUser ? (
            <>
              <div className="p-4 border-b bg-card">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage
                      src={selectedUser.avatar_url || undefined}
                      alt={selectedUser.name}
                    />
                    <AvatarFallback>
                      {selectedUser.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{selectedUser.name}</div>
                    <div className="text-sm text-muted-foreground">
                      @{selectedUser.username}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-2 max-w-[80%] ${
                      message.sender_id === user?.id ? 'ml-auto' : ''
                    }`}
                  >
                    {message.sender_id !== user?.id && (
                      <Avatar className="w-8 h-8">
                        <AvatarImage
                          src={message.sender.avatar_url || undefined}
                          alt={message.sender.name}
                        />
                        <AvatarFallback>
                          {message.sender.name
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`rounded-lg p-3 ${
                        message.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent'
                      }`}
                    >
                      <p>{message.content}</p>
                      <div className="text-xs opacity-70 mt-1">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={sendMessage} className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <Button type="submit" disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a conversation to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 