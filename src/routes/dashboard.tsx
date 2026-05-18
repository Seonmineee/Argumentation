import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStudent } from "@/lib/student";
import { supabase } from "@/integrations/supabase/client";
import { StageNav } from "@/components/StageNav";
import { DEBATE_TOPIC, TOPIC_BACKGROUND } from "@/lib/topic";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

type Progress = {
  pre: boolean;
  research: boolean;
  debate3Ended: boolean;
  reflection3: boolean;
  debate4Ended: boolean;
  reflection4: boolean;
  report: boolean;
  post: boolean;
};

function Dashboard() {
  const student = useStudent();
  const navigate = useNavigate();
  const [p, setP] = useState<Progress | null>(null);

  useEffect(() => {
    if (student === null) return;
    if (!student) { navigate({ to: "/" }); return; }
    (async () => {
      const sid = student.id;
      const [surveys, research, sessions, refl1, refl2, report] = await Promise.all([
        supabase.from("surveys").select("survey_type").eq("student_id", sid),
        supabase.from("research_memo").select("id").eq("student_id", sid).maybeSingle(),
        supabase.from("debate_sessions").select("stage,status").eq("student_id", sid),
        supabase.from("reflection_1_chat").select("id").eq("student_id", sid).limit(1),
        supabase.from("reflection_2_chat").select("id").eq("student_id", sid).limit(1),
        supabase.from("final_reports").select("id").eq("student_id", sid).maybeSingle(),
      ]);
      const types = new Set((surveys.data ?? []).map((r) => r.survey_type));
      const sess = sessions.data ?? [];
      setP({
        pre: types.has("pre"),
        research: !!research.data,
        debate3Ended: sess.some((s) => s.stage === 3 && s.status === "ended"),
        reflection3: (refl1.data ?? []).length > 0,
        debate4Ended: sess.some((s) => s.stage === 4 && s.status === "ended"),
        reflection4: (refl2.data ?? []).length > 0,
        report: !!report.data,
        post: types.has("post"),
      });
    })();
  }, [student, navigate]);

  if (!student || !p) return null;

  const items = [
    { to: "/stage1", title: "1단계 · 사전 설문", desc: "토론 전 자기 진단(41문항)", done: p.pre },
    { to: "/stage2", title: "2단계 · 자료 조사 및 입장 정리", desc: "찬·반 자료를 정리하고 내 주장을 구성합니다.", done: p.research },
    { to: "/stage3", title: "3단계 · 3-1 찬성 토론 / 3-2 토론 성찰", desc: "찬성 토론 후 토론 기록을 보며 성찰 챗봇과 대화하고 메모를 작성합니다.", done: p.debate3Ended && p.reflection3 },
    { to: "/stage4", title: "4단계 · 4-1 반대 토론 / 4-2 토론 성찰", desc: "반대 토론 후 토론 기록을 보며 성찰 챗봇과 대화하고 메모를 작성합니다.", done: p.debate4Ended && p.reflection4 },
    { to: "/stage5/reflection", title: "5단계 · 5-1 최종 성찰 / 5-2 사후 설문", desc: "최종 성찰 보고서를 작성한 뒤 사후 설문을 진행합니다.", done: p.report && p.post },
  ];

  return (
    <div className="min-h-screen bg-background">
      <StageNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-8 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-accent">오늘의 논제</h2>
          <h1 className="mt-2 text-2xl font-bold text-primary">{DEBATE_TOPIC}</h1>
          <details className="mt-4 text-sm leading-relaxed text-muted-foreground">
            <summary className="cursor-pointer text-primary hover:underline">배경 자료 펼쳐보기</summary>
            <div className="mt-3 whitespace-pre-line">{TOPIC_BACKGROUND}</div>
          </details>
        </section>

        <h2 className="mb-4 text-lg font-semibold text-foreground">학습 단계</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((it, i) => (
            <Link
              key={it.to}
              to={it.to}
              className="group rounded-2xl border bg-card p-5 shadow-sm transition-all hover:border-accent hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-accent">STEP {i + 1}</span>
                  <h3 className="mt-1 text-base font-semibold text-foreground">{it.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{it.desc}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  it.done ? "bg-accent/20 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {it.done ? "완료" : "진행 전"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}