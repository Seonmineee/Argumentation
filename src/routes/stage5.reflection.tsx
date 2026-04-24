import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStudent } from "@/lib/student";
import { supabase } from "@/integrations/supabase/client";
import { StageNav } from "@/components/StageNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

  useEffect(() => {
    if (student === null) return;
    if (!student) { navigate({ to: "/" }); return; }
    (async () => {
      const { data } = await supabase.from("final_reports").select("content")
        .eq("student_id", student.id).maybeSingle();
      if (data?.content) { setReport(data.content); setReportSaved(true); }
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
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold text-primary">5-1단계 · 최종 성찰 보고서</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          3·4단계의 토론과 성찰 내용을 종합하여, 본인의 사고가 어떻게 변화했는지 작성해 보세요.
          <br />다음 항목을 포함하면 좋아요: ① 두 입장에서 토론하며 얻은 통찰, ② 가장 강했던/약했던 나의 근거,
          ③ AI 반박 중 가장 인상 깊었던 것, ④ 이 논제에 대한 나의 최종 입장과 그 근거.
        </p>
        <Textarea rows={20} className="mt-4" value={report} onChange={(e) => setReport(e.target.value)}
          placeholder="여기에 최종 성찰 보고서를 작성하세요." />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{report.length}자</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={save} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
            <Link to="/stage5/survey">
              <Button disabled={!reportSaved}>5-2 사후 설문으로 →</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}