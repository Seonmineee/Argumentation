import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Student = {
  id: string;
  student_number: string;
  name: string | null;
};

type Row = {
  student: Student;
  pre: boolean;
  post: boolean;
  researchMemo: boolean;
  researchTurns: number;
  debate3Turns: number;
  debate3Ended: boolean;
  reflect3Memo: boolean;
  reflect3Turns: number;
  debate4Turns: number;
  debate4Ended: boolean;
  reflect4Memo: boolean;
  reflect4Turns: number;
  reportWords: number;
};

function countWords(s: string | null | undefined): number {
  const t = (s ?? "").trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function classKey(num: string): string {
  return (num ?? "").trim().slice(0, 3) || "기타";
}

async function loadAll(): Promise<Row[]> {
  const [
    studentsRes,
    surveysRes,
    memosRes,
    researchChatRes,
    sessionsRes,
    debateChatRes,
    reflNotesRes,
    reflChatRes,
    reportsRes,
  ] = await Promise.all([
    supabase.from("students").select("id,student_number,name"),
    supabase.from("surveys").select("student_id,survey_type"),
    supabase.from("research_memo").select("student_id"),
    supabase.from("research_chat").select("student_id,user_message"),
    supabase.from("debate_sessions").select("id,student_id,stage,status"),
    supabase.from("debate_chat").select("session_id,user_message"),
    supabase.from("reflection_notes").select("student_id,stage"),
    supabase.from("reflection_chat").select("student_id,stage,user_message"),
    supabase.from("final_reports").select("student_id,content"),
  ]);

  const students = (studentsRes.data ?? []) as Student[];

  const preSet = new Set<string>();
  const postSet = new Set<string>();
  for (const s of surveysRes.data ?? []) {
    if (s.survey_type === "pre") preSet.add(s.student_id);
    if (s.survey_type === "post") postSet.add(s.student_id);
  }

  const memoSet = new Set<string>((memosRes.data ?? []).map((m: any) => m.student_id));

  const researchTurnMap = new Map<string, number>();
  for (const r of researchChatRes.data ?? []) {
    if (!r.user_message || !r.user_message.trim()) continue;
    researchTurnMap.set(r.student_id, (researchTurnMap.get(r.student_id) ?? 0) + 1);
  }

  // session_id -> {student_id, stage, ended}
  const sessionMeta = new Map<string, { student_id: string; stage: number; ended: boolean }>();
  for (const s of sessionsRes.data ?? []) {
    sessionMeta.set(s.id, {
      student_id: s.student_id,
      stage: s.stage,
      ended: s.status === "ended",
    });
  }

  // (student_id, stage) -> turn count
  const debateTurnMap = new Map<string, number>();
  for (const m of debateChatRes.data ?? []) {
    if (!m.user_message || !m.user_message.trim()) continue;
    const meta = sessionMeta.get(m.session_id);
    if (!meta) continue;
    const k = `${meta.student_id}::${meta.stage}`;
    debateTurnMap.set(k, (debateTurnMap.get(k) ?? 0) + 1);
  }
  const debateEndedMap = new Map<string, boolean>();
  for (const meta of sessionMeta.values()) {
    const k = `${meta.student_id}::${meta.stage}`;
    if (meta.ended) debateEndedMap.set(k, true);
  }

  const reflNoteMap = new Set<string>();
  for (const n of reflNotesRes.data ?? []) {
    reflNoteMap.add(`${n.student_id}::${n.stage}`);
  }

  const reflTurnMap = new Map<string, number>();
  for (const r of reflChatRes.data ?? []) {
    if (!r.user_message || !r.user_message.trim()) continue;
    const k = `${r.student_id}::${r.stage}`;
    reflTurnMap.set(k, (reflTurnMap.get(k) ?? 0) + 1);
  }

  const reportMap = new Map<string, number>();
  for (const r of reportsRes.data ?? []) {
    reportMap.set(r.student_id, countWords(r.content));
  }

  return students.map<Row>((st) => ({
    student: st,
    pre: preSet.has(st.id),
    post: postSet.has(st.id),
    researchMemo: memoSet.has(st.id),
    researchTurns: researchTurnMap.get(st.id) ?? 0,
    debate3Turns: debateTurnMap.get(`${st.id}::3`) ?? 0,
    debate3Ended: debateEndedMap.get(`${st.id}::3`) ?? false,
    reflect3Memo: reflNoteMap.has(`${st.id}::3`),
    reflect3Turns: reflTurnMap.get(`${st.id}::3`) ?? 0,
    debate4Turns: debateTurnMap.get(`${st.id}::4`) ?? 0,
    debate4Ended: debateEndedMap.get(`${st.id}::4`) ?? false,
    reflect4Memo: reflNoteMap.has(`${st.id}::4`),
    reflect4Turns: reflTurnMap.get(`${st.id}::4`) ?? 0,
    reportWords: reportMap.get(st.id) ?? 0,
  }));
}

function Mark({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="font-bold text-emerald-600">O</span>
  ) : (
    <span className="font-bold text-rose-500">X</span>
  );
}

function TurnCell({ n, min = 5 }: { n: number; min?: number }) {
  const ok = n >= min;
  return (
    <span className={ok ? "font-medium text-emerald-600" : "font-medium text-amber-600"}>
      {n}
    </span>
  );
}

function AdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const data = await loadAll();
      setRows(data);
      setRefreshedAt(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const k = classKey(r.student.student_number);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    for (const list of map.values()) {
      list.sort((a, b) =>
        (a.student.student_number ?? "").localeCompare(b.student.student_number ?? "")
      );
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-bold text-primary">관리자 · 학생 진행 현황</h1>
            <p className="text-xs text-muted-foreground">
              학번 앞 3자리를 같은 반(분단)으로 묶어 표시합니다. · 새로고침으로 최신 상태를 다시 불러옵니다.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {refreshedAt && (
              <span className="text-xs text-muted-foreground">
                업데이트: {refreshedAt.toLocaleTimeString("ko-KR")}
              </span>
            )}
            <Button size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="ml-1">새로고침</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6">
        {grouped.length === 0 && !loading && (
          <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            등록된 학생이 없습니다.
          </div>
        )}

        <div className="space-y-8">
          {grouped.map(([cls, list]) => (
            <section key={cls}>
              <div className="mb-2 flex items-baseline gap-2">
                <h2 className="text-lg font-bold">반 {cls}</h2>
                <span className="text-xs text-muted-foreground">{list.length}명</span>
              </div>
              <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs">
                    <tr className="border-b">
                      <th rowSpan={2} className="px-3 py-2 text-left">학번</th>
                      <th rowSpan={2} className="px-3 py-2 text-left">이름</th>
                      <th rowSpan={2} className="px-2 py-2">사전설문</th>
                      <th colSpan={2} className="border-x px-2 py-1">자료조사</th>
                      <th colSpan={2} className="border-x px-2 py-1">3단계 토론(찬성)</th>
                      <th colSpan={2} className="border-x px-2 py-1">3-2 성찰</th>
                      <th colSpan={2} className="border-x px-2 py-1">4단계 토론(반대)</th>
                      <th colSpan={2} className="border-x px-2 py-1">4-2 성찰</th>
                      <th rowSpan={2} className="px-2 py-2">보고서<br />(단어수)</th>
                      <th rowSpan={2} className="px-2 py-2">사후설문</th>
                    </tr>
                    <tr className="border-b text-[11px] text-muted-foreground">
                      <th className="border-x px-2 py-1">메모</th>
                      <th className="px-2 py-1">턴</th>
                      <th className="border-x px-2 py-1">턴</th>
                      <th className="px-2 py-1">종료</th>
                      <th className="border-x px-2 py-1">메모</th>
                      <th className="px-2 py-1">턴</th>
                      <th className="border-x px-2 py-1">턴</th>
                      <th className="px-2 py-1">종료</th>
                      <th className="border-x px-2 py-1">메모</th>
                      <th className="px-2 py-1">턴</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.student.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono text-xs">{r.student.student_number}</td>
                        <td className="px-3 py-2">{r.student.name ?? "-"}</td>
                        <td className="px-2 py-2 text-center"><Mark ok={r.pre} /></td>
                        <td className="border-x px-2 py-2 text-center"><Mark ok={r.researchMemo} /></td>
                        <td className="px-2 py-2 text-center"><TurnCell n={r.researchTurns} /></td>
                        <td className="border-x px-2 py-2 text-center"><TurnCell n={r.debate3Turns} /></td>
                        <td className="px-2 py-2 text-center"><Mark ok={r.debate3Ended} /></td>
                        <td className="border-x px-2 py-2 text-center"><Mark ok={r.reflect3Memo} /></td>
                        <td className="px-2 py-2 text-center"><TurnCell n={r.reflect3Turns} /></td>
                        <td className="border-x px-2 py-2 text-center"><TurnCell n={r.debate4Turns} /></td>
                        <td className="px-2 py-2 text-center"><Mark ok={r.debate4Ended} /></td>
                        <td className="border-x px-2 py-2 text-center"><Mark ok={r.reflect4Memo} /></td>
                        <td className="px-2 py-2 text-center"><TurnCell n={r.reflect4Turns} /></td>
                        <td className="px-2 py-2 text-center">
                          <span className={r.reportWords >= 50 ? "font-medium text-emerald-600" : "font-medium text-amber-600"}>
                            {r.reportWords}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center"><Mark ok={r.post} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          색상 안내: O/초록 = 완료/충족, X/빨강 = 미완료, 호박색 숫자 = 최소 기준 미달(턴 5회·보고서 50단어).
        </p>
      </main>
    </div>
  );
}