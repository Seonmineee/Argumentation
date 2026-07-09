import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { streamChat, type ChatMsg } from "@/lib/stream";
import { ChatPanel } from "@/components/ChatPanel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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
  nextHref: "/stage4" | "/stage5/reflection";
  nextLabel: string;
}) {
  const debateTable = stage === 3 ? "debate_1_chat" : "debate_2_chat";
  const reflTable = stage === 3 ? "reflection_1_chat" : "reflection_2_chat";
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [transcript, setTranscript] = useState<string>("");
  const [prevTranscript, setPrevTranscript] = useState<string>("");
  const [debateMsgs, setDebateMsgs] = useState<{ role: string; content: string }[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hasDebate, setHasDebate] = useState(false);
  const [note, setNote] = useState<string>("");
  const [noteSaved, setNoteSaved] = useState<string>("");
  const initStarted = useRef(false);

  const userTurns = messages.filter((m) => m.role === "user").length;

  useEffect(() => {
    (async () => {
      const { data: dmsgs } = await supabase
        .from(debateTable)
        .select("sender,message")
        .eq("student_id", student.id)
        .order("created_at");
      const list: { role: string; content: string }[] = [];
      for (const m of (dmsgs ?? []) as Array<{ sender: string; message: string }>) {
        list.push({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.message,
        });
      }
      if (list.length === 0) {
        setLoaded(true);
        return;
      }
      setHasDebate(true);
      setDebateMsgs(list);
      const tr = list
        .map((m) => `${m.role === "user" ? "[학생]" : "[AI]"} ${m.content}`)
        .join("\n\n");
      setTranscript(tr);

      // For stage 4 reflection, also load the 1st debate transcript for comparison.
      if (stage === 4) {
        const { data: prev } = await supabase
          .from("debate_1_chat")
          .select("sender,message")
          .eq("student_id", student.id)
          .order("created_at");
        const prevList: string[] = [];
        for (const m of (prev ?? []) as Array<{ sender: string; message: string }>) {
          prevList.push(`${m.sender === "user" ? "[학생]" : "[AI]"} ${m.message}`);
        }
        if (prevList.length > 0) setPrevTranscript(prevList.join("\n\n"));
      }

      const { data: rmsgs } = await supabase
        .from(reflTable)
        .select("user_message,assistant_message")
        .eq("student_id", student.id)
        .order("created_at");
      const expanded: ChatMsg[] = [];
      for (const m of (rmsgs ?? []) as Array<{
        user_message: string | null;
        assistant_message: string | null;
      }>) {
        if (m.user_message) expanded.push({ role: "user", content: m.user_message });
        if (m.assistant_message) expanded.push({ role: "assistant", content: m.assistant_message });
      }
      setMessages(expanded);

      const { data: noteRow } = await supabase
        .from("reflection_notes")
        .select("content")
        .eq("student_id", student.id)
        .eq("stage", stage)
        .maybeSingle();
      if (noteRow?.content) setNote(noteRow.content);
      setLoaded(true);
    })();
  }, [student.id, stage, debateTable, reflTable]);

  const callAI = useCallback(
    async (history: ChatMsg[], tr: string, userText: string | null) => {
      setStreaming(true);
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      let acc = "";
      await streamChat({
        url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reflection-chat`,
        body: {
          messages: history,
          studentPosition,
          debateTranscript: tr,
          studentName: student.name ?? "",
          previousDebateTranscript: stage === 4 ? prevTranscript : undefined,
        },
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
            await supabase.from(reflTable).insert({
              student_id: student.id,
              student_number: student.student_number ?? null,
              name: student.name ?? null,
              phone_last4: student.phone_last4 ?? null,
              user_message: userText,
              assistant_message: acc,
            });
          }
        },
        onError: ({ message }) => {
          setStreaming(false);
          setMessages((prev) => prev.slice(0, -1));
          toast.error(message);
        },
      });
    },
    [
      student.id,
      stage,
      studentPosition,
      student.name,
      student.student_number,
      student.phone_last4,
      reflTable,
      prevTranscript,
    ],
  );

  useEffect(() => {
    if (!loaded || !hasDebate || messages.length > 0 || initStarted.current) return;
    initStarted.current = true;
    callAI([{ role: "user", content: "토론 성찰을 시작해 주세요." }], transcript, null);
  }, [loaded, hasDebate, messages.length, callAI, transcript]);

  async function send(text: string) {
    const userMsg: ChatMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    await callAI(next, transcript, text);
  }

  // Auto-save note (debounced)
  useEffect(() => {
    if (!loaded || !hasDebate) return;
    const t = setTimeout(async () => {
      const { error } = await supabase.from("reflection_notes").upsert(
        {
          student_id: student.id,
          stage,
          content: note,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,stage" },
      );
      if (!error) setNoteSaved(new Date().toLocaleTimeString());
    }, 800);
    return () => clearTimeout(t);
  }, [note, loaded, hasDebate, student.id, stage]);

  if (!loaded) return <div className="p-8 text-center text-muted-foreground">불러오는 중...</div>;

  if (!hasDebate) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          먼저 토론을 진행해 주세요. 토론 기록이 있어야 성찰을 시작할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: Debate transcript */}
        <div className="rounded-2xl border bg-card shadow-sm flex flex-col h-[calc(100vh-180px)]">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">내 토론 기록</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {studentPosition === "pro" ? "찬성" : "반대"} 입장으로 진행한 토론입니다.
            </p>
          </div>
          <ScrollArea className="flex-1 px-4 py-3">
            <div className="space-y-3">
              {debateMsgs.map((m, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-3 text-sm ${
                    m.role === "user" ? "bg-primary/10 border border-primary/20" : "bg-muted border"
                  }`}
                >
                  <div className="text-xs font-semibold mb-1 text-muted-foreground">
                    {m.role === "user" ? "나" : "AI"}
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Reflection chat */}
        <ChatPanel
          messages={messages}
          isStreaming={streaming}
          onSend={send}
          placeholder="성찰 코치의 질문에 자유롭게 답해 보세요."
          emptyHint="성찰 코치가 첫 질문을 준비하고 있어요..."
          rightSlot={
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span
                className={
                  userTurns < 5 ? "font-medium text-amber-600" : "font-medium text-emerald-600"
                }
              >
                나의 발언 {userTurns}회{" "}
                {userTurns < 5 ? `(최소 5회 · 앞으로 ${5 - userTurns}회)` : "✓"}
              </span>
              {userTurns < 5 ? (
                <Button size="sm" disabled title="최소 5회 이상 성찰 대화 후 이동할 수 있습니다.">
                  {nextLabel} →
                </Button>
              ) : (
                <Link to={nextHref}>
                  <Button size="sm">{nextLabel} →</Button>
                </Link>
              )}
            </div>
          }
        />
      </div>

      {/* Memo panel */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">나의 성찰 메모</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              토론 기록과 성찰 코치와의 대화를 보면서, 배운 점·개선할 점·다음에 시도할 전략을
              자유롭게 적어 보세요.
            </p>
          </div>
          {noteSaved && (
            <span className="text-xs text-muted-foreground">자동 저장됨 {noteSaved}</span>
          )}
        </div>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="예) 핵심 쟁점 파악에서는 ___이 좋았고, 반박을 위한 질문에서는 ___이 부족했다. 다음에는 ___을 시도하겠다."
          rows={6}
          className="resize-y"
        />
      </div>
    </div>
  );
}
