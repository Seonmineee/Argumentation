import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStudent } from "@/lib/student";
import { supabase } from "@/integrations/supabase/client";
import { StageNav } from "@/components/StageNav";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEBATE_TOPIC, TOPIC_BACKGROUND } from "@/lib/topic";
import { toast } from "sonner";

export const Route = createFileRoute("/stage2")({
  component: Stage2,
});

function Stage2() {
  const student = useStudent();
  const navigate = useNavigate();
  const [pro, setPro] = useState("");
  const [con, setCon] = useState("");
  const [position, setPosition] = useState<"pro" | "con" | "">("");
  const [claim, setClaim] = useState("");
  const [evidence, setEvidence] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student === null) return;
    if (!student) { navigate({ to: "/" }); return; }
    (async () => {
      const { data } = await supabase.from("stage2_research").select("*")
        .eq("student_id", student.id).maybeSingle();
      if (data) {
        setPro(data.pro_arguments ?? "");
        setCon(data.con_arguments ?? "");
        setPosition((data.my_position as "pro" | "con") ?? "");
        setClaim(data.my_claim ?? "");
        setEvidence(data.my_evidence ?? "");
      }
    })();
  }, [student, navigate]);

  async function save(next?: boolean) {
    if (!student) return;
    setSaving(true);
    const { error } = await supabase.from("stage2_research").upsert({
      student_id: student.id,
      pro_arguments: pro,
      con_arguments: con,
      my_position: position || null,
      my_claim: claim,
      my_evidence: evidence,
      updated_at: new Date().toISOString(),
    }, { onConflict: "student_id" });
    setSaving(false);
    if (error) return toast.error("저장 실패: " + error.message);
    toast.success("저장되었습니다.");
    if (next) navigate({ to: "/stage3" });
  }

  if (!student) return null;

  return (
    <div className="min-h-screen bg-background">
      <StageNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold text-primary">2단계 · 자료 조사 및 입장 정리</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          인터넷·ChatGPT 등을 활용해 찬·반 양측의 주장을 조사하고, 자신의 주장과 근거를 정리하세요.
        </p>
        <details className="my-4 rounded-lg border bg-card p-4 text-sm">
          <summary className="cursor-pointer font-semibold text-primary">논제: {DEBATE_TOPIC}</summary>
          <div className="mt-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
            {TOPIC_BACKGROUND}
          </div>
        </details>

        <div className="space-y-5">
          <div className="rounded-2xl border bg-card p-5">
            <Label htmlFor="pro" className="text-base font-semibold text-primary">찬성 측 주요 주장 정리</Label>
            <Textarea id="pro" rows={5} value={pro} onChange={(e) => setPro(e.target.value)}
              placeholder="찬성 측은 어떤 근거로 주장하는지 정리해 보세요." className="mt-2" />
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <Label htmlFor="con" className="text-base font-semibold text-primary">반대 측 주요 주장 정리</Label>
            <Textarea id="con" rows={5} value={con} onChange={(e) => setCon(e.target.value)}
              placeholder="반대 측은 어떤 근거로 주장하는지 정리해 보세요." className="mt-2" />
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <Label className="text-base font-semibold text-primary">나의 입장</Label>
            <div className="mt-3 flex gap-2">
              {(["pro", "con"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPosition(p)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    position === p ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  {p === "pro" ? "찬성" : "반대"}
                </button>
              ))}
            </div>
            <Label htmlFor="claim" className="mt-4 block text-sm">나의 주장 (한 문장)</Label>
            <Textarea id="claim" rows={2} value={claim} onChange={(e) => setClaim(e.target.value)} className="mt-1" />
            <Label htmlFor="ev" className="mt-3 block text-sm">나의 근거</Label>
            <Textarea id="ev" rows={4} value={evidence} onChange={(e) => setEvidence(e.target.value)} className="mt-1" />
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => save(false)} disabled={saving}>저장만 하기</Button>
            <Button onClick={() => save(true)} disabled={saving}>저장하고 3단계로</Button>
          </div>
        </div>
      </main>
    </div>
  );
}