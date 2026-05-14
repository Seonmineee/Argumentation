import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMsg } from "@/lib/stream";

type Props = {
  messages: ChatMsg[];
  isStreaming: boolean;
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyHint?: string;
  rightSlot?: React.ReactNode;
  userLabel?: React.ReactNode;
  assistantLabel?: React.ReactNode;
};

export function ChatPanel({
  messages, isStreaming, onSend, placeholder, disabled, emptyHint, rightSlot, userLabel, assistantLabel,
}: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming]);

  function send() {
    const t = input.trim();
    if (!t || disabled || isStreaming) return;
    onSend(t);
    setInput("");
  }

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col rounded-2xl border bg-card shadow-sm">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && emptyHint && (
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">{emptyHint}</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}>
              {((m.role === "user" && userLabel) || (m.role === "assistant" && assistantLabel)) && (
                <div className="mb-1 text-xs font-semibold opacity-90">
                  {m.role === "user" ? userLabel : assistantLabel}
                </div>
              )}
              <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2 [&_*]:text-inherit">
                <ReactMarkdown>{m.content || (m.role === "assistant" && isStreaming && i === messages.length - 1 ? "…" : "")}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t p-3">
        {rightSlot && <div className="mb-2">{rightSlot}</div>}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder={placeholder ?? "메시지를 입력하세요. (Enter 전송, Shift+Enter 줄바꿈)"}
            rows={2}
            disabled={disabled || isStreaming}
            className="resize-none"
          />
          <Button onClick={send} disabled={disabled || isStreaming || !input.trim()}>
            전송
          </Button>
        </div>
      </div>
    </div>
  );
}