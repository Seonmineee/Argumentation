import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStudent } from "@/lib/student";
import { supabase } from "@/integrations/supabase/client";
import { StageNav } from "@/components/StageNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SurveyForm } from "@/components/SurveyForm";
import { toast } from "sonner";

export const Route = createFileRoute("/stage5")({
  component: Stage5,
});

function Stage5() {
  const student = useStudent();
  const navigate = useNavigate();
  const [report, setReport] = useState("");
  const [reportSaved, setReportSaved] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [step, setStep] = useState<"report" | "survey" | "done">("report");
  const [postInitial, setPostInitial] = useState<Record<string, number> | undefined>();
  const [submittingSurvey, setSubmittingSurvey] = useState(false);

  useEffect(() => {
    if (student === null) return;
    if (!student) { navigate({ to: "/" }); return; }
    (async () => {
      const [{ data: r }, { data: s }] = await Promise.all([
        supabase.from("final_reports").select("content").eq("student_id", student.id).maybeSingle(),
        supabase.from("surveys").select("responses").eq("student_id", student.id).eq("survey_type", "post").maybeSingle(),
      ]);
      if (r?.content) { setReport(r.content); setReportSaved(true); }
      if (s?.responses) {
        setPostInitial(s.responses as Record<string, number>);
        setStep("done");
      } else if (r?.content) {
        setStep("survey");
      }
    })();
  }, [student, navigate]);

  async function saveReport() {
    if (!student) return;
    if (report.trim().length < 100) return toast.error("최소 100자 이상 작성해 주세요.");
    setSavingReport(true);
    const { error } = await supabase.from("final_reports").upsert(
      { student_id: student.id, content: report, updated_at: new Date().toISOString() },
      { onConflict: "student_id" }
    );
    setSavingReport(false);
    if (error) return toast.error("저장 실패: " + error.message);
    toast.success("최종 보고서 저장 완료. 사후 설문으로 이동합니다.");
    setReportSaved(true);
    setStep("survey");
  }

  async function submitPost(responses: Record<string, number>) {
    if (!student) return;
    setSubmittingSurvey(true);
    const { error } = await supabase.from("surveys").upsert(
      { student_id: student.id, survey_type: "post", responses },
      { onConflict: "student_id,survey_type" }
    );
    setSubmittingSurvey(false);
    if (error) return toast.error("제출 실패: " + error.message);
    toast.success("모든 학습이 완료되었습니다! 수고하셨어요.");
    setStep("done");
  }

  if (!student) return null;

  return (
    <div className="min-h-screen bg-background">
      <StageNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex gap-2 text-xs">
          {(["report", "survey", "done"] as const).map((s, i) => (
            <span key={s} className={`flex-1 rounded-full px-3 py-1 text-center ${
              step === s ? "bg-primary text-primary-foreground" :
              ["report","survey","done"].indexOf(step) > i ? "bg-accent/30 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {i + 1}. {s === "report" ? "최종 보고서" : s === "survey" ? "사후 설문" : "완료"}
            </span>
          ))}
        </div>

        {step === "report" && (
          <>
            <h1 className="text-2xl font-bold text-primary">5단계 · 최종 성찰 보고서</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              3·4단계의 토론과 성찰 내용을 종합하여, 본인의 사고가 어떻게 변화했는지 작성해 보세요.
              <br />다음 항목을 포함하면 좋아요: ① 두 입장에서 토론하며 얻은 통찰, ② 가장 강했던/약했던 나의 근거,
              ③ AI 반박 중 가장 인상 깊었던 것, ④ 이 논제에 대한 나의 최종 입장과 그 근거.
            </p>
            <Textarea rows={20} className="mt-4" value={report} onChange={(e) => setReport(e.target.value)}
              placeholder="여기에 최종 성찰 보고서를 작성하세요." />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{report.length}자</span>
              <Button onClick={saveReport} disabled={savingReport}>저장하고 사후 설문으로</Button>
            </div>
            {reportSaved && (
              <div className="mt-3 text-right">
                <Button variant="outline" size="sm" onClick={() => setStep("survey")}>
                  사후 설문 바로 가기 →
                </Button>
              </div>
            )}
          </>
        )}

        {step === "survey" && (
          <>
            <h1 className="text-2xl font-bold text-primary">사후 설문</h1>
            <p className="mt-2 text-sm text-muted-foreground">사전 설문과 동일한 41문항입니다. 솔직하게 답해 주세요.</p>
            <div className="mt-6">
              <SurveyForm initial={postInitial} onSubmit={submitPost} submitting={submittingSurvey} />
            </div>
          </>
        )}

        {step === "done" && (
          <div className="rounded-2xl border bg-card p-10 text-center">
            <h1 className="text-2xl font-bold text-primary">학습 완료 🎉</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              모든 단계를 완료했습니다. 수고하셨어요!
              <br />교사가 학습 기록을 검토할 예정입니다.
            </p>
            <Button className="mt-6" onClick={() => navigate({ to: "/dashboard" })}>대시보드로</Button>
          </div>
        )}
      </main>
    </div>
  );
}