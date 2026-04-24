import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStudent } from "@/lib/student";
import { StageNav } from "@/components/StageNav";
import { DebateView } from "@/components/DebateView";
import { DebateSidePanels } from "@/components/DebateSidePanels";

export const Route = createFileRoute("/stage4/")({
  component: Stage4,
});

function Stage4() {
  const student = useStudent();
  const navigate = useNavigate();
  useEffect(() => { if (student === null) return; if (!student) navigate({ to: "/" }); }, [student, navigate]);
  if (!student) return null;

  return (
    <div className="min-h-screen bg-background">
      <StageNav />
      <main className="mx-auto max-w-[1400px] px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-primary">4-1단계 · 반대 입장 토론</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            나는 <span className="font-semibold text-accent">반대</span>, AI는 찬성 입장입니다.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <DebateSidePanels student={student} stage={4} side="con" />
          <DebateView student={student} stage={4} studentPosition="con" reflectionHref="/stage4/reflection" />
        </div>
      </main>
    </div>
  );
}