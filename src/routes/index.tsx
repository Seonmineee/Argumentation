import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStudent, setStudent, getResumeRoute } from "@/lib/student";
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
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTest, setIsTest] = useState(false);

  useEffect(() => {
    const s = getStudent();
    if (s) {
      getResumeRoute(s.id).then((to) => navigate({ to }));
    }
  }, [navigate]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setIsTest(params.get("test") === "1");
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d+$/.test(studentNumber)) return setError("학번은 숫자만 입력해 주세요.");
    if (!/^\d{4}$/.test(phoneLast4)) return setError("휴대폰 끝 4자리(숫자 4개)를 입력해 주세요.");
    const trimmedName = name.trim();
    if (!trimmedName) return setError("이름을 입력해 주세요.");
    if (trimmedName.length > 50) return setError("이름은 50자 이내로 입력해 주세요.");
    setLoading(true);
    const effectiveStudentNumber = isTest ? `${studentNumber}-T` : studentNumber;
    const effectiveName = isTest ? `[TEST] ${trimmedName}` : trimmedName;
    try {
      const { data: existing, error: selErr } = await supabase
        .from("students")
        .select("*")
        .eq("student_number", effectiveStudentNumber)
        .eq("phone_last4", phoneLast4)
        .maybeSingle();
      if (selErr) throw selErr;

      let row = existing;
      if (!row) {
        const { data: inserted, error: insErr } = await supabase
          .from("students")
          .insert({ student_number: effectiveStudentNumber, phone_last4: phoneLast4, name: effectiveName })
          .select()
          .single();
        if (insErr) throw insErr;
        row = inserted;
      } else if (row.name !== effectiveName) {
        const { data: updated, error: updErr } = await supabase
          .from("students")
          .update({ name: effectiveName })
          .eq("id", row.id)
          .select()
          .single();
        if (updErr) throw updErr;
        row = updated;
      }

      setStudent({
        id: row.id,
        student_number: row.student_number,
        phone_last4: row.phone_last4,
        name: row.name,
      });
      const to = await getResumeRoute(row.id);
      navigate({ to });
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
           {isTest && (
             <p className="text-xs font-semibold text-amber-600">테스트 모드 (별도 계정으로 저장됩니다)</p>
           )}
         </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nm">이름</Label>
              <Input id="nm" placeholder="예: 홍길동" maxLength={50}
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sn">학번</Label>
              <Input id="sn" inputMode="numeric" placeholder="예: 10101"
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
         <p className="mt-4 text-center text-xs text-muted-foreground">이름, 학번, 휴대폰 끝 4자리를 입력하세요.</p>
      </div>
    </div>
  );
}
