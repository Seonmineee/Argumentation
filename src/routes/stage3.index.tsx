import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStudent } from "@/lib/student";
import { StageNav } from "@/components/StageNav";
import { DebateView } from "@/components/DebateView";

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
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-primary">3단계 · 찬성 입장 토론</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            나는 <span className="font-semibold text-accent">찬성</span>, AI는 반대 입장입니다. 끝까지 입장을 견지해 보세요.
          </p>
        </div>
        <DebateView student={student} stage={3} studentPosition="pro" reflectionHref="/stage3/reflection" />
      </main>
    </div>
  );
}