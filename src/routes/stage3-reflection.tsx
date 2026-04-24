import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStudent } from "@/lib/student";
import { StageNav } from "@/components/StageNav";
import { ReflectionView } from "@/components/ReflectionView";

export const Route = createFileRoute("/stage3-reflection")({
  component: Stage3Reflection,
});

function Stage3Reflection() {
  const student = useStudent();
  const navigate = useNavigate();
  useEffect(() => { if (student === null) return; if (!student) navigate({ to: "/" }); }, [student, navigate]);
  if (!student) return null;

  return (
    <div className="min-h-screen bg-background">
      <StageNav />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-primary">3단계 · 찬성 토론 성찰</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            성찰 코치 챗봇이 방금 한 토론을 함께 돌아봅니다.
          </p>
        </div>
        <ReflectionView student={student} stage={3} studentPosition="pro" nextHref="/stage4" nextLabel="4단계로 이동" />
      </main>
    </div>
  );
}