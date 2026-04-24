import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStudent } from "@/lib/student";
import { supabase } from "@/integrations/supabase/client";
import { StageNav } from "@/components/StageNav";
import { SurveyForm } from "@/components/SurveyForm";
import { toast } from "sonner";

export const Route = createFileRoute("/stage1")({
  component: Stage1,
});

function Stage1() {
  const student = useStudent();
  const navigate = useNavigate();
  const [initial, setInitial] = useState<Record<string, number> | undefined>();
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (student === null) return;
    if (!student) { navigate({ to: "/" }); return; }
    (async () => {
      const { data } = await supabase
        .from("surveys").select("responses")
        .eq("student_id", student.id).eq("survey_type", "pre").maybeSingle();
      if (data?.responses) {
        setInitial(data.responses as Record<string, number>);
        setDone(true);
      }
      setLoaded(true);
    })();
  }, [student, navigate]);

  async function submit(responses: Record<string, number>) {
    if (!student) return;
    setSubmitting(true);
    const { error } = await supabase.from("surveys").upsert(
      { student_id: student.id, survey_type: "pre", responses },
      { onConflict: "student_id,survey_type" }
    );
    setSubmitting(false);
    if (error) { toast.error("제출 실패: " + error.message); return; }
    toast.success("사전 설문이 제출되었습니다.");
    setDone(true);
    setTimeout(() => navigate({ to: "/stage2" }), 800);
  }

  if (!student || !loaded) return null;

  return (
    <div className="min-h-screen bg-background">
      <StageNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">1단계 · 사전 설문</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            평소 자신의 모습에 가장 가까운 곳에 답해 주세요. 정답은 없습니다. (총 {41}문항)
          </p>
          {done && (
            <p className="mt-2 rounded-md bg-accent/20 px-3 py-2 text-xs text-primary">
              이미 제출했지만 다시 수정해서 제출할 수 있어요.
            </p>
          )}
        </div>
        <SurveyForm initial={initial} onSubmit={submit} submitting={submitting} />
      </main>
    </div>
  );
}