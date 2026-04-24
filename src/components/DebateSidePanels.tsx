import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { StudentSession } from "@/lib/student";

type Props = {
  student: StudentSession;
  stage: 3 | 4;
  /** Which side's pre-research notes to highlight at the top */
  side: "pro" | "con";
};

export function DebateSidePanels({ student, stage, side }: Props) {
  const [proNotes, setProNotes] = useState("");
  const [conNotes, setConNotes] = useState("");
  const [reflection3, setReflection3] = useState<string>("");
  const [newFacts, setNewFacts] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string>("");

  useEffect(() => {
    (async () => {
      const [{ data: research }, { data: noteRow }, refl] = await Promise.all([
        supabase.from("stage2_research").select("pro_arguments,con_arguments")
          .eq("student_id", student.id).maybeSingle(),
        supabase.from("debate_notes").select("content")
          .eq("student_id", student.id).eq("stage", stage).maybeSingle(),
        stage === 4
          ? supabase.from("reflection_notes").select("content")
              .eq("student_id", student.id).eq("stage", 3).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setProNotes(research?.pro_arguments ?? "");
      setConNotes(research?.con_arguments ?? "");
      if (noteRow?.content) setNewFacts(noteRow.content);
      // @ts-expect-error mixed promise type above
      if (refl?.data?.content) setReflection3(refl.data.content);
    })();
  }, [student.id, stage]);

  async function saveNewFacts() {
    setSaving(true);
    try {
      const { error } = await supabase.from("debate_notes").upsert({
        student_id: student.id, stage, content: newFacts, updated_at: new Date().toISOString(),
      }, { onConflict: "student_id,stage" });
      if (error) throw error;
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      toast.error("메모 저장 실패");
    } finally {
      setSaving(false);
    }
  }

  const primaryLabel = side === "pro" ? "찬성측 사전 조사 메모" : "반대측 사전 조사 메모";
  const secondaryLabel = side === "pro" ? "반대측 사전 조사 메모" : "찬성측 사전 조사 메모";
  const primary = side === "pro" ? proNotes : conNotes;
  const secondary = side === "pro" ? conNotes : proNotes;

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col gap-4">
      {/* Top: pre-research + (stage 4) reflection */}
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">사전 조사 메모{stage === 4 ? " · 1차 성찰 메모" : ""}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            2단계에서 정리한 자료{stage === 4 ? "와 3-2단계 성찰 메모를 함께" : "를"} 참고하세요.
          </p>
        </div>
        <ScrollArea className="flex-1 px-4 py-3">
          <div className="space-y-4 text-sm">
            <section>
              <div className="mb-1 text-xs font-semibold text-primary">{primaryLabel}</div>
              <div className="whitespace-pre-wrap rounded-lg border bg-background p-3 text-sm leading-relaxed text-foreground min-h-[3rem]">
                {primary || <span className="text-muted-foreground">아직 작성된 내용이 없습니다.</span>}
              </div>
            </section>
            <section>
              <div className="mb-1 text-xs font-semibold text-muted-foreground">{secondaryLabel}</div>
              <div className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed text-foreground min-h-[3rem]">
                {secondary || <span className="text-muted-foreground">아직 작성된 내용이 없습니다.</span>}
              </div>
            </section>
            {stage === 4 && (
              <section>
                <div className="mb-1 text-xs font-semibold text-accent">3-2단계 성찰 메모</div>
                <div className="whitespace-pre-wrap rounded-lg border bg-accent/10 p-3 text-sm leading-relaxed text-foreground min-h-[3rem]">
                  {reflection3 || <span className="text-muted-foreground">아직 작성된 성찰 메모가 없습니다.</span>}
                </div>
              </section>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Bottom: new facts learned */}
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">이번 토론으로 새로 알게 된 사실</h2>
            <p className="text-xs text-muted-foreground mt-0.5">토론 중 떠오른 새 근거·통계·반박 포인트를 적어두세요.</p>
          </div>
          <div className="flex items-center gap-2">
            {savedAt && <span className="text-xs text-muted-foreground">저장됨 {savedAt}</span>}
            <Button size="sm" onClick={saveNewFacts} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
        <div className="flex-1 p-3">
          <Textarea
            value={newFacts}
            onChange={(e) => setNewFacts(e.target.value)}
            placeholder="예) AI가 제시한 ___ 사례, 새로 떠오른 반박 ___, 추가로 찾아볼 ___"
            className="h-full resize-none"
          />
        </div>
      </div>
    </div>
  );
}