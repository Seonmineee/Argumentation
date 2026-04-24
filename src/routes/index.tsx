import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStudent, setStudent } from "@/lib/student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
       { title: "ChatGPT 기반 토론 플랫폼" },
       { name: "description", content: "AI와 함께 토론하고 나의 토론을 성찰하세요." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [studentNumber, setStudentNumber] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
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
          .insert({ student_number: studentNumber, phone_last4: phoneLast4 })
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
         <div className="mb-8 text-center space-y-2">
           <h1 className="text-3xl font-bold text-primary">ChatGPT 기반 토론 플랫폼</h1>
           <p className="text-sm text-muted-foreground">AI와 함께 토론하고 나의 토론을 성찰하세요.</p>
         </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "확인 중..." : "시작하기"}
            </Button>
          </form>
        </div>
         <p className="mt-4 text-center text-xs text-muted-foreground">학번 + 휴대폰 끝 4자리를 입력하세요.</p>
      </div>
    </div>
  );
}
