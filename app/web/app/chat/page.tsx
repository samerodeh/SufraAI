"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, RotateCcw, ChefHat } from "lucide-react";
import { sendMessage } from "@/lib/api";
import { QUICK_REPLIES } from "@/lib/constants";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Message } from "@/lib/types";

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3.5 py-2.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const prefillItem = searchParams.get("item");
  const { userId } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: prefillItem
        ? `Hi! You're asking about **${prefillItem}** — great choice! What would you like to know? I can tell you about ingredients, allergens, or customization options.`
        : "مرحباً! Hi there! I'm SufraAI, Sufra's assistant. I can help you explore the menu, find items that match your dietary needs, or help with reservations. What can I do for you?",
    },
  ]);
  const [input, setInput] = useState(
    prefillItem ? `Tell me more about the ${prefillItem}` : ""
  );
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const submit = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(({ role, content }) => ({
        role,
        content,
      }));
      const { response } = await sendMessage(content, history, userId ?? "guest");
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't reach the server right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "مرحباً! Hi there! I'm SufraAI, Sufra's assistant. What can I help you with?",
      },
    ]);
    setInput("");
  };

  const showQuickReplies = messages.length <= 1 && !loading;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Chat header */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ChefHat size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">SufraAI</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ask about menu, allergies, reservations…
            </p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Clear conversation"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-end gap-2 ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                  msg.role === "user"
                    ? "bg-secondary text-muted-foreground"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {msg.role === "user" ? (
                  <User size={12} />
                ) : (
                  <Bot size={12} />
                )}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-card border border-border text-foreground"
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex items-end gap-2"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot size={12} />
              </div>
              <div className="rounded-2xl rounded-bl-sm border border-border bg-card">
                <TypingIndicator />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <AnimatePresence>
        {showQuickReplies && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-2"
          >
            <div className="scroll-row">
              {QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  onClick={() => submit(reply)}
                  className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                >
                  {reply}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            className="min-h-[38px] max-h-32 resize-none text-sm border-border"
            rows={1}
          />
          <Button
            onClick={() => submit()}
            disabled={!input.trim() || loading}
            size="icon"
            className="shrink-0 h-9 w-9"
            aria-label="Send message"
          >
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatContent />
    </Suspense>
  );
}
