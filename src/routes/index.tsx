import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStudent, setStudent } from "@/lib/student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEBATE_TOPIC } from "@/lib/topic";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "토론·성찰 학습 플랫폼" },
      { name: "description", content: "AI와 함께하는 고등학생 토론·성찰 학습" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [studentNumber, setStudentNumber] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getStudent()) navigate({ to: "/dashboard" });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d+$/.test(studentNumber)) return setError("학번은 숫자만 입력해 주세요.");
    if (!/^\d{4}$/.test(phoneLast4)) return setError("휴대폰 끝 4자리(숫자 4개)를 입력해 주세요.");
    setLoading(true);
    try {
      const { data: existing, error: selErr } = await supabase
        .from("students")
        .select("*")
        .eq("student_number", studentNumber)
        .eq("phone_last4", phoneLast4)
        .maybeSingle();
      if (selErr) throw selErr;

      let row = existing;
      if (!row) {
        const { data: inserted, error: insErr } = await supabase
          .from("students")
          .insert({ student_number: studentNumber, phone_last4: phoneLast4, name: name || null })
          .select()
          .single();
        if (insErr) throw insErr;
        row = inserted;
      }

      setStudent({
        id: row.id,
        student_number: row.student_number,
        phone_last4: row.phone_last4,
        name: row.name,
      });
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">토론·성찰 학습 플랫폼</h1>
          <p className="mt-3 text-sm text-muted-foreground">AI와 함께하는 5단계 토론 학습</p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <p className="mb-4 rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">오늘의 논제 ·</span> {DEBATE_TOPIC}
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="sn">학번</Label>
              <Input id="sn" inputMode="numeric" placeholder="예: 30215"
                value={studentNumber} onChange={(e) => setStudentNumber(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div>
              <Label htmlFor="ph">휴대폰 끝 4자리</Label>
              <Input id="ph" inputMode="numeric" maxLength={4} placeholder="예: 1234"
                value={phoneLast4} onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} />
            </div>
            <div>
              <Label htmlFor="nm">이름 (선택)</Label>
              <Input id="nm" placeholder="홍길동" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "확인 중..." : "시작하기"}
            </Button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          학번 + 휴대폰 끝 4자리로 본인 학습 기록을 이어갈 수 있어요.
        </p>
      </div>
    </div>
  );
}
