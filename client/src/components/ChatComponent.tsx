import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Activity } from "lucide-react";
import type { ChatMessage, Game } from "@shared/schema";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatComponentProps {
  gameId?: string;
  messages: ChatMessage[];
  onSendMessage: (username: string, message: string) => void;
  username?: string;
  isAuthenticated?: boolean;
  role?: string;
  game?: Game;
}

export function ChatComponent({ messages, onSendMessage, username, isAuthenticated, role, gameId, game }: ChatComponentProps) {
  const [message, setMessage] = useState("");
  const [lastPlay, setLastPlay] = useState(game?.lastPlay || "");
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (game?.lastPlay !== undefined) {
      setLastPlay(game.lastPlay || "");
    }
  }, [game?.lastPlay]);

  const updateLastPlayMutation = useMutation({
    mutationFn: async (newLastPlay: string) => {
      if (!gameId) return;
      await apiRequest("PATCH", `/api/games/${gameId}`, { lastPlay: newLastPlay });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}`] });
      toast({ title: "Updated", description: "Last play updated successfully" });
    }
  });

  const handleLastPlaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateLastPlayMutation.mutate(lastPlay);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && username?.trim()) {
      onSendMessage(username.trim(), message.trim());
      setMessage("");
    }
  };

  if (!isAuthenticated || !username) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 gap-4">
        <h3 className="text-lg font-semibold">Chat Requires Login</h3>
        <p className="text-sm text-muted-foreground text-center">
          You must be logged in to participate in the live chat
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Live Chat</h3>
          <span className="text-sm text-muted-foreground" data-testid="text-chat-username">
            {username}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="space-y-1" data-testid={`message-${msg.id}`}>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold" data-testid={`message-username-${msg.id}`}>
                    {msg.username}
                  </span>
                  <span className="text-xs text-muted-foreground" data-testid={`message-time-${msg.id}`}>
                    {format(new Date(msg.createdAt!), "h:mm a")}
                  </span>
                </div>
                <div className="bg-muted rounded-md px-3 py-2 inline-block max-w-full break-words">
                  <p className="text-sm" data-testid={`message-text-${msg.id}`}>{msg.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="border-t p-4">
        <div className="flex gap-2">
          <Input 
            value={message} 
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            data-testid="input-chat-message"
          />
          <Button type="submit" size="icon" data-testid="button-send-message">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
