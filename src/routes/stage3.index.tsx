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
            나의 입장은 <span className="rounded-md border-2 border-red-500 bg-red-50 px-2 py-0.5 text-lg font-extrabold text-red-600">찬성</span>, AI의 입장은 <span className="rounded-md border border-red-300 bg-red-50/60 px-2 py-0.5 font-bold text-red-500">반대</span>입니다. 끝까지 자신의 입장을 견지해 보세요.
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