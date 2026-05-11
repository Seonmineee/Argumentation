import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { streamChat, type ChatMsg } from "@/lib/stream";
import { ChatPanel } from "@/components/ChatPanel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { StudentSession } from "@/lib/student";

export function DebateView({
  student,
  stage,
  studentPosition,
  reflectionHref,
}: {
  student: StudentSession;
  stage: 3 | 4;
  studentPosition: "pro" | "con";
  reflectionHref: "/stage3/reflection" | "/stage4/reflection";
}) {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [ending, setEnding] = useState(false);
  const initStarted = useRef(false);

  const userTurns = messages.filter((m) => m.role === "user").length;

  // Load or create session
  useEffect(() => {
    (async () => {
      const { data: existing } = await supabase
        .from("debate_sessions").select("*")
        .eq("student_id", student.id).eq("stage", stage).maybeSingle();

      let sid = existing?.id as string | undefined;

      if (!sid) {
        const { data: created, error } = await supabase.from("debate_sessions").insert({
          student_id: student.id, stage, student_position: studentPosition,
        }).select().single();
        if (error) { toast.error("세션 생성 실패"); return; }
        sid = created.id;
      }

      const { data: msgs } = await supabase.from("debate_chat")
        .select("role,content").eq("session_id", sid!).order("created_at");

      setSessionId(sid!);
      setMessages((msgs ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
      setLoaded(true);
    })();
  }, [student.id, stage, studentPosition]);

  const callAI = useCallback(async (history: ChatMsg[], sid: string) => {
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    let acc = "";
    await streamChat({
      url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/debate-chat`,
      body: { messages: history, studentPosition, studentName: student.name ?? "" },
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
          await supabase.from("debate_chat").insert({
            session_id: sid, role: "assistant", content: acc,
          });
        }
      },
      onError: ({ message }) => {
        setStreaming(false);
        setMessages((prev) => prev.slice(0, -1));
        toast.error(message);
      },
    });
  }, [studentPosition, student.name]);

  // Auto-greet if no messages
  useEffect(() => {
    if (!loaded || !sessionId || messages.length > 0 || initStarted.current) return;
    initStarted.current = true;
    callAI([{ role: "user", content: "토론을 시작해 주세요. 입장과 핵심 근거 2개를 제시해 주세요." }], sessionId)
      .then(() => {
        // Don't store the synthetic kick-off as a real user message
      });
  }, [loaded, sessionId, messages.length, callAI]);

  async function send(text: string) {
    if (!sessionId) return;
    const userMsg: ChatMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    await supabase.from("debate_chat").insert({
      session_id: sessionId, role: "user", content: text,
    });
    await callAI(next, sessionId);
  }

  async function endDebate() {
    if (!sessionId || ending) return;
    setEnding(true);
    try {
      await supabase.from("debate_sessions")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", sessionId);
      navigate({ to: reflectionHref });
    } catch {
      setEnding(false);
      toast.error("토론 종료 처리 중 오류가 발생했습니다.");
    }
  }

  if (!loaded) return <div className="p-8 text-center text-muted-foreground">불러오는 중...</div>;

  return (
    <ChatPanel
      messages={messages}
      isStreaming={streaming}
      onSend={send}
      emptyHint="AI가 첫 발언을 준비하고 있어요..."
      rightSlot={
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>나의 발언 {userTurns}회</span>
          <Button
            size="sm"
            onClick={endDebate}
            disabled={ending || streaming || userTurns === 0}
          >
            {ending ? "이동 중..." : "토론 종료 후 성찰로 →"}
          </Button>
        </div>
      }
    />
  );
}