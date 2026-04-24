import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { streamChat, type ChatMsg } from "@/lib/stream";
import { ChatPanel } from "@/components/ChatPanel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { StudentSession } from "@/lib/student";

export function ReflectionView({
  student,
  stage,
  studentPosition,
  nextHref,
  nextLabel,
}: {
  student: StudentSession;
  stage: 3 | 4;
  studentPosition: "pro" | "con";
  nextHref: "/stage4" | "/stage5";
  nextLabel: string;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [transcript, setTranscript] = useState<string>("");
  const [streaming, setStreaming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [debateEnded, setDebateEnded] = useState(false);
  const initStarted = useRef(false);

  useEffect(() => {
    (async () => {
      // Verify debate ended
      const { data: sess } = await supabase.from("debate_sessions")
        .select("id,status").eq("student_id", student.id).eq("stage", stage).maybeSingle();
      if (!sess || sess.status !== "ended") { setLoaded(true); return; }
      setDebateEnded(true);

      const { data: dmsgs } = await supabase.from("debate_messages")
        .select("role,content").eq("session_id", sess.id).order("created_at");
      const tr = (dmsgs ?? [])
        .map((m) => `${m.role === "user" ? "[학생]" : "[AI]"} ${m.content}`)
        .join("\n\n");
      setTranscript(tr);

      const { data: rmsgs } = await supabase.from("reflection_messages")
        .select("role,content").eq("student_id", student.id).eq("stage", stage)
        .order("created_at");
      setMessages((rmsgs ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
      setLoaded(true);
    })();
  }, [student.id, stage]);

  const callAI = useCallback(async (history: ChatMsg[], tr: string) => {
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    let acc = "";
    await streamChat({
      url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reflection-chat`,
      body: { messages: history, studentPosition, debateTranscript: tr },
      onDelta: (d) => {
        acc += d;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
      },
      onDone: async () => {
        setStreaming(false);
        if (acc) {
          await supabase.from("reflection_messages").insert({
            student_id: student.id, stage, role: "assistant", content: acc,
          });
        }
      },
      onError: ({ message }) => {
        setStreaming(false);
        setMessages((prev) => prev.slice(0, -1));
        toast.error(message);
      },
    });
  }, [student.id, stage, studentPosition]);

  useEffect(() => {
    if (!loaded || !debateEnded || messages.length > 0 || initStarted.current) return;
    initStarted.current = true;
    callAI([{ role: "user", content: "토론 성찰을 시작해 주세요." }], transcript);
  }, [loaded, debateEnded, messages.length, callAI, transcript]);

  async function send(text: string) {
    const userMsg: ChatMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    await supabase.from("reflection_messages").insert({
      student_id: student.id, stage, role: "user", content: text,
    });
    await callAI(next, transcript);
  }

  if (!loaded) return <div className="p-8 text-center text-muted-foreground">불러오는 중...</div>;

  if (!debateEnded) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">먼저 토론을 끝까지 진행하고 종료해 주세요.</p>
      </div>
    );
  }

  const userTurns = messages.filter((m) => m.role === "user").length;

  return (
    <ChatPanel
      messages={messages}
      isStreaming={streaming}
      onSend={send}
      placeholder="성찰 코치의 질문에 자유롭게 답해 보세요."
      emptyHint="성찰 코치가 첫 질문을 준비하고 있어요..."
      rightSlot={
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>나의 성찰 답변 {userTurns}회</span>
          <Link to={nextHref}>
            <Button size="sm" variant={userTurns >= 3 ? "default" : "outline"}>{nextLabel} →</Button>
          </Link>
        </div>
      }
    />
  );
}