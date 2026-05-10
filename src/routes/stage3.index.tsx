import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStudent } from "@/lib/student";
import { StageNav } from "@/components/StageNav";
import { DebateView } from "@/components/DebateView";
import { DebateSidePanels } from "@/components/DebateSidePanels";

export const Route = createFileRoute("/stage3/")({
  component: Stage3,
});

function Stage3() {
  const student = useStudent();
  const navigate = useNavigate();
  useEffect(() => { if (student === null) return; if (!student) navigate({ to: "/" }); }, [student, navigate]);
  if (!student) return null;

  return (
    <div className="min-h-screen bg-background">
      <StageNav />
      <main className="mx-auto max-w-[1400px] px-4 py-6">
        <div className="mb-5">
          <h1 className="text-3xl font-bold tracking-tight text-primary">3-1단계 · 찬성 입장 토론</h1>
          <p className="mt-2 text-base leading-relaxed text-foreground">
            나는 <span className="rounded-md bg-accent/15 px-2 py-0.5 font-bold text-accent">찬성</span>, AI는 <span className="font-semibold text-muted-foreground">반대</span> 입장입니다. 끝까지 자신의 입장을 견지해 보세요.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <DebateSidePanels student={student} stage={3} side="pro" />
          <DebateView student={student} stage={3} studentPosition="pro" reflectionHref="/stage3/reflection" />
        </div>
      </main>
    </div>
  );
}