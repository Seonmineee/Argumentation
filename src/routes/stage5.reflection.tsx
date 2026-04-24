import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStudent } from "@/lib/student";
import { supabase } from "@/integrations/supabase/client";
import { StageNav } from "@/components/StageNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

export const Route = createFileRoute("/stage5/reflection")({
  component: Stage5Reflection,
});

function Stage5Reflection() {
  const student = useStudent();
  const navigate = useNavigate();
  const [report, setReport] = useState("");
  const [saving, setSaving] = useState(false);
  const [reportSaved, setReportSaved] = useState(false);
  const [note3, setNote3] = useState("");
  const [note4, setNote4] = useState("");

  useEffect(() => {
    if (student === null) return;
    if (!student) { navigate({ to: "/" }); return; }
    (async () => {
      const [reportRes, n3Res, n4Res] = await Promise.all([
        supabase.from("final_reports").select("content")
          .eq("student_id", student.id).maybeSingle(),
        supabase.from("reflection_notes").select("content")
          .eq("student_id", student.id).eq("stage", 3).maybeSingle(),
        supabase.from("reflection_notes").select("content")
          .eq("student_id", student.id).eq("stage", 4).maybeSingle(),
      ]);
      if (reportRes.data?.content) { setReport(reportRes.data.content); setReportSaved(true); }
      if (n3Res.data?.content) setNote3(n3Res.data.content);
      if (n4Res.data?.content) setNote4(n4Res.data.content);
    })();
  }, [student, navigate]);

  async function save() {
    if (!student) return;
    if (report.trim().length < 100) return toast.error("최소 100자 이상 작성해 주세요.");
    setSaving(true);
    const { error } = await supabase.from("final_reports").upsert(
      { student_id: student.id, content: report, updated_at: new Date().toISOString() },
      { onConflict: "student_id" }
    );
    setSaving(false);
    if (error) return toast.error("저장 실패: " + error.message);
    toast.success("저장 완료!");
    setReportSaved(true);
  }

  if (!student) return null;

  return (
    <div className="min-h-screen bg-background">
      <StageNav />
      <main className="mx-auto max-w-[1400px] px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-primary">5-1단계 · 최종 성찰 보고서</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            3·4단계의 토론과 성찰 내용을 종합하여, 본인의 사고가 어떻게 변화했는지 작성해 보세요.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Left: previous reflection notes */}
          <div className="flex h-[calc(100vh-180px)] flex-col rounded-2xl border bg-card shadow-sm">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">내 성찰 메모</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                3-2단계와 4-2단계에서 작성한 성찰 메모입니다.
              </p>
            </div>
            <ScrollArea className="flex-1 px-4 py-3">
              <div className="space-y-4 text-sm">
                <section>
                  <div className="mb-1 text-xs font-semibold text-primary">3-2단계 · 찬성 토론 성찰 메모</div>
                  <div className="whitespace-pre-wrap rounded-lg border bg-background p-3 leading-relaxed text-foreground min-h-[3rem]">
                    {note3 || <span className="text-muted-foreground">아직 작성된 메모가 없습니다.</span>}
                  </div>
                </section>
                <section>
                  <div className="mb-1 text-xs font-semibold text-accent">4-2단계 · 반대 토론 성찰 메모</div>
                  <div className="whitespace-pre-wrap rounded-lg border bg-accent/10 p-3 leading-relaxed text-foreground min-h-[3rem]">
                    {note4 || <span className="text-muted-foreground">아직 작성된 메모가 없습니다.</span>}
                  </div>
                </section>
              </div>
            </ScrollArea>
          </div>

          {/* Right: final report */}
          <div className="flex h-[calc(100vh-180px)] flex-col rounded-2xl border bg-card shadow-sm">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">최종 성찰 보고서</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                포함하면 좋아요: ① 두 입장에서 얻은 통찰, ② 가장 강했던/약했던 근거, ③ 인상 깊었던 AI 반박, ④ 나의 최종 입장과 근거.
              </p>
            </div>
            <div className="flex-1 p-3">
              <Textarea
                value={report}
                onChange={(e) => setReport(e.target.value)}
                placeholder="여기에 최종 성찰 보고서를 작성하세요."
                className="h-full resize-none"
              />
            </div>
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-xs text-muted-foreground">{report.length}자</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={save} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
                <Link to="/stage5/survey">
                  <Button size="sm" disabled={!reportSaved}>5-2 사후 설문으로 →</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}