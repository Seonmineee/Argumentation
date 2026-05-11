import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { streamChat, type ChatMsg } from "@/lib/stream";
import { toast } from "sonner";
import { Send, Loader2, Sparkles } from "lucide-react";
import { getGivenName, type StudentSession } from "@/lib/student";
import { supabase } from "@/integrations/supabase/client";

const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-chat`;

export function ResearchChat({ student }: { student?: StudentSession | null }) {
  const givenName = useMemo(() => getGivenName(student?.name), [student?.name]);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content: givenName ? `${givenName}님 안녕하세요?` : "안녕하세요?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setLoading(true);
    if (student?.id) {
      supabase.from("research_messages").insert({
        student_id: student.id, role: "user", content: text,
      }).then(({ error }) => { if (error) console.error("save user msg", error); });
    }
    let acc = "";
    await streamChat({
      url: URL,
      body: { messages: next, studentName: student?.name ?? "" },
      onDelta: (d) => {
        acc += d;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      },
      onDone: () => {
        setLoading(false);
        if (student?.id && acc) {
          supabase.from("research_messages").insert({
            student_id: student.id, role: "assistant", content: acc,
          }).then(({ error }) => { if (error) console.error("save asst msg", error); });
        }
      },
      onError: (err) => {
        setLoading(false);
        setMessages((prev) => prev.slice(0, -1));
        toast.error(err.message);
      },
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.content || (loading && i === messages.length - 1 ? (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> 생각 중...
                </span>
              ) : null)}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t bg-card p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="예) 16세 청소년의 정치 참여 관련 해외 사례를 알려줘"
            rows={2}
            className="min-h-[44px] resize-none"
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="h-10 w-10 shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3" /> AI 응답은 부정확할 수 있어요. 중요한 정보는 직접 확인하세요.
        </p>
      </div>
    </div>
  );
}