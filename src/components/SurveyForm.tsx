import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  SURVEY_QUESTIONS,
  LIKERT_LABELS,
  SURVEY_SECTION_INFO,
  POST_SURVEY_QUESTIONS,
  POST_SURVEY_TEXT_QUESTIONS,
} from "@/lib/topic";

export function SurveyForm({
  initial,
  onSubmit,
  submitting,
  onSkip,
  includePostExtras = false,
}: {
  initial?: Record<string, number | string>;
  onSubmit: (responses: Record<string, number | string>) => Promise<void>;
  submitting?: boolean;
  onSkip?: () => void;
  includePostExtras?: boolean;
}) {
  const [responses, setResponses] = useState<Record<string, number | string>>(initial ?? {});
  const [error, setError] = useState<string | null>(null);

  const likertQuestions = includePostExtras
    ? [...SURVEY_QUESTIONS, ...POST_SURVEY_QUESTIONS]
    : SURVEY_QUESTIONS;
  const textQuestions = includePostExtras ? POST_SURVEY_TEXT_QUESTIONS : [];
  const sections = Array.from(
    new Set([...likertQuestions, ...textQuestions].map((q) => q.section)),
  );

  async function handle() {
    const missing = likertQuestions.find((q) => !(q.id in responses));
    if (missing) {
      setError(`아직 응답하지 않은 문항이 있어요 (${missing.id}).`);
      const el = document.getElementById(`q-${missing.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const missingText = textQuestions.find(
      (q) => !((responses[q.id] as string | undefined)?.trim?.()),
    );
    if (missingText) {
      setError(`아직 응답하지 않은 문항이 있어요 (${missingText.id}).`);
      const el = document.getElementById(`q-${missingText.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setError(null);
    await onSubmit(responses);
  }

  return (
    <div className="space-y-8">
      {sections.map((sec) => (
        <section key={sec} className="rounded-2xl border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-primary">{sec}</h3>
          {SURVEY_SECTION_INFO[sec] && (
            <div className="mb-5 whitespace-pre-line rounded-lg bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground text-slate-950">
              {SURVEY_SECTION_INFO[sec]}
            </div>
          )}
          <div className="space-y-5">
            {likertQuestions.filter((q) => q.section === sec).map((q) => (
              <div key={q.id} id={`q-${q.id}`} className="border-b pb-4 last:border-b-0 last:pb-0">
                <p className="mb-3 text-sm">
                  <span className="mr-2 font-semibold text-accent">{q.id}.</span>
                  {q.text}
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {LIKERT_LABELS.map((label, i) => {
                    const val = i + 1;
                    const sel = responses[q.id] === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setResponses((r) => ({ ...r, [q.id]: val }))}
                        className={`rounded-lg border px-2 py-2 text-xs transition-colors ${
                          sel
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-background hover:bg-muted"
                        }`}
                      >
                        <div className="font-bold">{val}</div>
                        <div className="mt-0.5 text-[10px] leading-tight">{label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {textQuestions.filter((q) => q.section === sec).map((q) => (
              <div key={q.id} id={`q-${q.id}`} className="border-b pb-4 last:border-b-0 last:pb-0">
                <p className="mb-3 text-sm">
                  <span className="mr-2 font-semibold text-accent">{q.id}.</span>
                  {q.text}
                </p>
                <Textarea
                  rows={4}
                  value={(responses[q.id] as string) ?? ""}
                  onChange={(e) =>
                    setResponses((r) => ({ ...r, [q.id]: e.target.value }))
                  }
                  placeholder="자유롭게 작성해 주세요."
                />
              </div>
            ))}
          </div>
        </section>
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onSkip && (
          <Button type="button" variant="outline" onClick={onSkip} disabled={submitting}>
            테스트용: 그냥 넘어가기
          </Button>
        )}
        <Button onClick={handle} disabled={submitting}>
          {submitting ? "저장 중..." : "설문 결과 저장하고 넘어가기"}
        </Button>
      </div>
    </div>
  );
}