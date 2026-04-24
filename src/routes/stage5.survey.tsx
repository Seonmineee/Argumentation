import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStudent } from "@/lib/student";
import { supabase } from "@/integrations/supabase/client";
import { StageNav } from "@/components/StageNav";
import { Button } from "@/components/ui/button";
import { SurveyForm } from "@/components/SurveyForm";
import { toast } from "sonner";

export const Route = createFileRoute("/stage5/survey")({
  component: Stage5Survey,
});

function Stage5Survey() {
  const student = useStudent();
  const navigate = useNavigate();
  const [postInitial, setPostInitial] = useState<Record<string, number | string> | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (student === null) return;
    if (!student) { navigate({ to: "/" }); return; }
    (async () => {
      const { data } = await supabase.from("surveys").select("responses")
        .eq("student_id", student.id).eq("survey_type", "post").maybeSingle();
      if (data?.responses) {
        setPostInitial(data.responses as Record<string, number | string>);
        setDone(true);
      }
    })();
  }, [student, navigate]);

  async function submit(responses: Record<string, number | string>) {
    if (!student) return;
    setSubmitting(true);
    const { error } = await supabase.from("surveys").upsert(
      { student_id: student.id, survey_type: "post", responses },
      { onConflict: "student_id,survey_type" }
    );
    setSubmitting(false);
    if (error) { toast.error("제출 실패: " + error.message); return; }
    toast.success("모든 학습이 완료되었습니다! 수고하셨어요.");
    setDone(true);
  }

  if (!student) return null;

  return (
    <div className="min-h-screen bg-background">
      <StageNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        {done ? (
          <div className="rounded-2xl border bg-card p-10 text-center">
            <h1 className="text-2xl font-bold text-primary">학습 완료 🎉</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              모든 단계를 완료했습니다. 수고하셨어요!
              <br />교사가 학습 기록을 검토할 예정입니다.
            </p>
            <Button className="mt-6" onClick={() => navigate({ to: "/dashboard" })}>대시보드로</Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-primary">5-2단계 · 사후 설문</h1>
            <p className="mt-2 text-sm text-muted-foreground">사전 설문과 동일한 41문항입니다. 솔직하게 답해 주세요.</p>
            <div className="mt-6">
              <SurveyForm
                initial={postInitial}
                onSubmit={submit}
                submitting={submitting}
                onSkip={() => setDone(true)}
                includePostExtras
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}