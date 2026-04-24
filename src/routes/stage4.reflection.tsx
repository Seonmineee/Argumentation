import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStudent } from "@/lib/student";
import { StageNav } from "@/components/StageNav";
import { ReflectionView } from "@/components/ReflectionView";

export const Route = createFileRoute("/stage4/reflection")({
  component: Stage4Reflection,
});

function Stage4Reflection() {
  const student = useStudent();
  const navigate = useNavigate();
  useEffect(() => { if (student === null) return; if (!student) navigate({ to: "/" }); }, [student, navigate]);
  if (!student) return null;

  return (
    <div className="min-h-screen bg-background">
      <StageNav />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-primary">4-2단계 · 반대 토론 성찰</h1>
          <p className="mt-1 text-sm text-muted-foreground">성찰 코치 챗봇과 토론을 돌아봅니다.</p>
        </div>
        <ReflectionView student={student} stage={4} studentPosition="con" nextHref="/stage5/reflection" nextLabel="5-1단계로 이동" />
      </main>
    </div>
  );
}