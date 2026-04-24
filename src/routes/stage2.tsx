import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStudent } from "@/lib/student";
import { supabase } from "@/integrations/supabase/client";
import { StageNav } from "@/components/StageNav";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEBATE_TOPIC, TOPIC_BACKGROUND } from "@/lib/topic";
import { toast } from "sonner";
import { ResearchChat } from "@/components/ResearchChat";

export const Route = createFileRoute("/stage2")({
  component: Stage2,
});

function Stage2() {
  const student = useStudent();
  const navigate = useNavigate();
  const [pro, setPro] = useState("");
  const [con, setCon] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student === null) return;
    if (!student) { navigate({ to: "/" }); return; }
    (async () => {
      const { data } = await supabase.from("stage2_research").select("*")
        .eq("student_id", student.id).maybeSingle();
      if (data) {
        setPro(data.pro_arguments ?? "");
        setCon(data.con_arguments ?? "");
      }
    })();
  }, [student, navigate]);

  async function save(next?: boolean) {
    if (!student) return;
    setSaving(true);
    const { error } = await supabase.from("stage2_research").upsert({
      student_id: student.id,
      pro_arguments: pro,
      con_arguments: con,
      my_position: null,
      my_claim: "",
      my_evidence: "",
      updated_at: new Date().toISOString(),
    }, { onConflict: "student_id" });
    setSaving(false);
    if (error) return toast.error("저장 실패: " + error.message);
    toast.success("저장되었습니다.");
    if (next) navigate({ to: "/stage3" });
  }

  if (!student) return null;

  return (
    <div className="min-h-screen bg-background">
      <StageNav />
      <main className="mx-auto max-w-[1400px] px-4 py-8">
        <h1 className="text-2xl font-bold text-primary">2단계 · 자료 조사 및 입장 정리</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          인터넷·ChatGPT 등을 활용해 찬·반 양측의 주장을 조사하고, 자신의 주장과 근거를 정리하세요.
        </p>
        <details className="my-4 rounded-lg border bg-card p-4 text-sm">
          <summary className="cursor-pointer font-semibold text-primary">논제: {DEBATE_TOPIC}</summary>
          <div className="mt-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
            {TOPIC_BACKGROUND}
          </div>
        </details>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* LEFT: research + position */}
          <div className="space-y-5">
            <div className="rounded-2xl border bg-card p-5">
              <Label htmlFor="pro" className="text-base font-semibold text-primary">찬성측 관련 정보 정리</Label>
              <Textarea id="pro" rows={5} value={pro} onChange={(e) => setPro(e.target.value)}
                placeholder="찬성 측의 주장, 근거, 사례, 통계 등을 자유롭게 정리해 보세요." className="mt-2 min-h-[180px]" />
            </div>
            <div className="rounded-2xl border bg-card p-5">
              <Label htmlFor="con" className="text-base font-semibold text-primary">반대측 관련 정보 정리</Label>
              <Textarea id="con" rows={5} value={con} onChange={(e) => setCon(e.target.value)}
                placeholder="반대 측의 주장, 근거, 사례, 통계 등을 자유롭게 정리해 보세요." className="mt-2 min-h-[180px]" />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => save(false)} disabled={saving}>저장만 하기</Button>
              <Button onClick={() => save(true)} disabled={saving}>저장하고 3단계로</Button>
            </div>
          </div>

          {/* RIGHT: research tools */}
          <div className="flex flex-col gap-5 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
            <div className="flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-2xl border bg-card">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <span className="text-sm font-semibold text-primary">AI 자료 조사 (ChatGPT)</span>
                <span className="text-[11px] text-muted-foreground">실시간 채팅</span>
              </div>
              <ResearchChat />
            </div>
            <div className="flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-2xl border bg-card">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <span className="text-sm font-semibold text-primary">Google 검색</span>
                <a href={`https://www.google.com/search?q=${encodeURIComponent(DEBATE_TOPIC)}`} target="_blank" rel="noreferrer"
                  className="text-xs text-muted-foreground hover:underline">새 창 열기 ↗</a>
              </div>
              <iframe
                src={`https://www.google.com/search?igu=1&q=${encodeURIComponent(DEBATE_TOPIC)}`}
                title="Google Search"
                className="h-full w-full flex-1"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}