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
  const [proClaim, setProClaim] = useState("");
  const [proEvidence, setProEvidence] = useState("");
  const [conClaim, setConClaim] = useState("");
  const [conEvidence, setConEvidence] = useState("");
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
        // my_claim / my_evidence may contain JSON {pro,con} or legacy plain string
        const parseDual = (raw: string | null) => {
          if (!raw) return { pro: "", con: "" };
          try {
            const j = JSON.parse(raw);
            if (j && typeof j === "object" && ("pro" in j || "con" in j)) {
              return { pro: j.pro ?? "", con: j.con ?? "" };
            }
          } catch { /* legacy plain text */ }
          return { pro: raw, con: "" };
        };
        const c = parseDual(data.my_claim);
        const e = parseDual(data.my_evidence);
        setProClaim(c.pro); setConClaim(c.con);
        setProEvidence(e.pro); setConEvidence(e.con);
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
      my_claim: JSON.stringify({ pro: proClaim, con: conClaim }),
      my_evidence: JSON.stringify({ pro: proEvidence, con: conEvidence }),
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
      <main className="mx-auto max-w-[1400px] px-4 py-8">
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

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* LEFT: research + position */}
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
              <Label className="text-base font-semibold text-primary">나의 입장 정리</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                찬성·반대 양쪽 모두에 대한 나의 주장과 근거를 정리해 보세요. 최종적으로 더 가까운 입장을 아래에서 선택할 수 있습니다.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <div className="text-sm font-semibold text-primary">찬성 입장</div>
                  <Label htmlFor="pro-claim" className="mt-3 block text-xs">나의 주장 (한 문장)</Label>
                  <Textarea id="pro-claim" rows={2} value={proClaim}
                    onChange={(e) => setProClaim(e.target.value)} className="mt-1" />
                  <Label htmlFor="pro-ev" className="mt-3 block text-xs">나의 근거</Label>
                  <Textarea id="pro-ev" rows={4} value={proEvidence}
                    onChange={(e) => setProEvidence(e.target.value)} className="mt-1" />
                </div>
                <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
                  <div className="text-sm font-semibold text-accent">반대 입장</div>
                  <Label htmlFor="con-claim" className="mt-3 block text-xs">나의 주장 (한 문장)</Label>
                  <Textarea id="con-claim" rows={2} value={conClaim}
                    onChange={(e) => setConClaim(e.target.value)} className="mt-1" />
                  <Label htmlFor="con-ev" className="mt-3 block text-xs">나의 근거</Label>
                  <Textarea id="con-ev" rows={4} value={conEvidence}
                    onChange={(e) => setConEvidence(e.target.value)} className="mt-1" />
                </div>
              </div>

              <div className="mt-5">
                <Label className="text-sm font-semibold">최종적으로 더 가까운 입장</Label>
                <div className="mt-2 flex gap-2">
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
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => save(false)} disabled={saving}>저장만 하기</Button>
              <Button onClick={() => save(true)} disabled={saving}>저장하고 3단계로</Button>
            </div>
          </div>

          {/* RIGHT: research tools */}
          <div className="flex flex-col gap-5 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
            <div className="flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-2xl border bg-card">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <span className="text-sm font-semibold text-primary">ChatGPT</span>
                <a href="https://chatgpt.com/" target="_blank" rel="noreferrer"
                  className="text-xs text-muted-foreground hover:underline">새 창 열기 ↗</a>
              </div>
              <iframe
                src="https://chatgpt.com/"
                title="ChatGPT"
                className="h-full w-full flex-1"
              />
            </div>
            <div className="flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-2xl border bg-card">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <span className="text-sm font-semibold text-primary">Google 검색</span>
                <a href={`https://www.google.com/search?q=${encodeURIComponent(DEBATE_TOPIC)}`} target="_blank" rel="noreferrer"
                  className="text-xs text-muted-foreground hover:underline">새 창 열기 ↗</a>
              </div>
              <iframe
                src={`https://www.google.com/search?igu=1&q=${encodeURIComponent(DEBATE_TOPIC)}`}
                title="Google Search"
                className="h-full w-full flex-1"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}