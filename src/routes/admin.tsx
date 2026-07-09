import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Download, Trash2 } from "lucide-react";

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

type ChatRow = {
  student_number: string;
  name: string;
  chatbot:
    | "research_chat"
    | "debate_chat_1"
    | "debate_chat_2"
    | "reflection_chat_1"
    | "reflection_chat_2";
  stage: number | "";
  turn_index: number;
  created_at: string;
  sender?: "user" | "ai" | "";
  message?: string;
  user_message: string;
  assistant_message: string;
};

function csvEscape(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCSV(rows: ChatRow[]): string {
  const headers = [
    "student_number",
    "name",
    "chatbot",
    "stage",
    "turn_index",
    "created_at",
    "sender",
    "message",
    "user_message",
    "assistant_message",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.student_number,
        r.name,
        r.chatbot,
        r.stage,
        r.turn_index,
        r.created_at,
        r.sender ?? "",
        r.message ?? "",
        r.user_message,
        r.assistant_message,
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return "\uFEFF" + lines.join("\n");
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function fetchAllChatRows(): Promise<ChatRow[]> {
  const [studentsRes, researchRes, debate1Res, debate2Res, refl1Res, refl2Res] =
    await Promise.all([
      supabase.from("students").select("id,student_number,name"),
      supabase
        .from("research_chat")
        .select("student_id,student_number,name,created_at,user_message,assistant_message")
        .order("created_at", { ascending: true }),
      supabase
        .from("debate_1_chat")
        .select("student_id,student_number,name,created_at,sender,message")
        .order("created_at", { ascending: true }),
      supabase
        .from("debate_2_chat")
        .select("student_id,student_number,name,created_at,sender,message")
        .order("created_at", { ascending: true }),
      supabase
        .from("reflection_1_chat")
        .select("student_id,student_number,name,created_at,user_message,assistant_message")
        .order("created_at", { ascending: true }),
      supabase
        .from("reflection_2_chat")
        .select("student_id,student_number,name,created_at,user_message,assistant_message")
        .order("created_at", { ascending: true }),
    ]);

  const studentMap = new Map<string, { student_number: string; name: string }>();
  for (const s of (studentsRes.data ?? []) as Student[]) {
    studentMap.set(s.id, {
      student_number: s.student_number ?? "",
      name: s.name ?? "",
    });
  }

  const rows: ChatRow[] = [];
  const turnCounter = new Map<string, number>();

  function nextTurn(key: string): number {
    const n = (turnCounter.get(key) ?? 0) + 1;
    turnCounter.set(key, n);
    return n;
  }

  for (const r of researchRes.data ?? []) {
    const st = studentMap.get(r.student_id) ?? {
      student_number: r.student_number ?? "",
      name: r.name ?? "",
    };
    rows.push({
      student_number: st.student_number,
      name: st.name,
      chatbot: "research_chat",
      stage: "",
      turn_index: nextTurn(`${r.student_id}::research`),
      created_at: r.created_at,
      user_message: r.user_message ?? "",
      assistant_message: r.assistant_message ?? "",
    });
  }

  const pushPairedStageRows = (
    data: Array<{
      student_id: string;
      student_number: string | null;
      name: string | null;
      created_at: string;
      user_message: string | null;
      assistant_message: string | null;
    }> | null | undefined,
    chatbot: ChatRow["chatbot"],
    stage: number,
    turnKey: string,
  ) => {
    for (const r of data ?? []) {
      const st = studentMap.get(r.student_id) ?? {
        student_number: r.student_number ?? "",
        name: r.name ?? "",
      };
      rows.push({
        student_number: st.student_number,
        name: st.name,
        chatbot,
        stage,
        turn_index: nextTurn(`${r.student_id}::${turnKey}`),
        created_at: r.created_at,
        user_message: r.user_message ?? "",
        assistant_message: r.assistant_message ?? "",
      });
    }
  };

  const pushSenderStageRows = (
    data: Array<{
      student_id: string;
      student_number: string | null;
      name: string | null;
      created_at: string;
      sender: string | null;
      message: string | null;
    }> | null | undefined,
    chatbot: ChatRow["chatbot"],
    stage: number,
    turnKey: string,
  ) => {
    for (const r of data ?? []) {
      const st = studentMap.get(r.student_id) ?? {
        student_number: r.student_number ?? "",
        name: r.name ?? "",
      };
      const isUser = r.sender === "user";
      rows.push({
        student_number: st.student_number,
        name: st.name,
        chatbot,
        stage,
        turn_index: nextTurn(`${r.student_id}::${turnKey}`),
        created_at: r.created_at,
        sender: (r.sender ?? "") as "user" | "ai" | "",
        message: r.message ?? "",
        user_message: isUser ? (r.message ?? "") : "",
        assistant_message: !isUser ? (r.message ?? "") : "",
      });
    }
  };

  pushSenderStageRows(debate1Res.data as any, "debate_chat_1", 3, "debate::3");
  pushSenderStageRows(debate2Res.data as any, "debate_chat_2", 4, "debate::4");
  pushPairedStageRows(refl1Res.data as any, "reflection_chat_1", 3, "reflection::3");
  pushPairedStageRows(refl2Res.data as any, "reflection_chat_2", 4, "reflection::4");

  const chatOrder: Record<ChatRow["chatbot"], number> = {
    research_chat: 0,
    debate_chat_1: 1,
    reflection_chat_1: 2,
    debate_chat_2: 3,
    reflection_chat_2: 4,
  };
  rows.sort((a, b) => {
    if (a.student_number !== b.student_number)
      return a.student_number.localeCompare(b.student_number, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    if (a.chatbot !== b.chatbot) return chatOrder[a.chatbot] - chatOrder[b.chatbot];
    const sa = a.stage === "" ? -1 : a.stage;
    const sb = b.stage === "" ? -1 : b.stage;
    if (sa !== sb) return sa - sb;
    return a.created_at.localeCompare(b.created_at);
  });

  return rows;
}

async function loadAll(): Promise<Row[]> {
  const [
    studentsRes,
    surveysRes,
    memosRes,
    researchChatRes,
    sessionsRes,
    debate1ChatRes,
    debate2ChatRes,
    reflNotesRes,
    refl1ChatRes,
    refl2ChatRes,
    reportsRes,
  ] = await Promise.all([
    supabase.from("students").select("id,student_number,name"),
    supabase.from("surveys").select("student_id,survey_type"),
    supabase.from("research_memo").select("student_id"),
    supabase.from("research_chat").select("student_id,user_message"),
    supabase.from("debate_sessions").select("id,student_id,stage,status"),
    supabase.from("debate_1_chat").select("student_id,sender"),
    supabase.from("debate_2_chat").select("student_id,sender"),
    supabase.from("reflection_notes").select("student_id,stage"),
    supabase.from("reflection_1_chat").select("student_id,user_message"),
    supabase.from("reflection_2_chat").select("student_id,user_message"),
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
  for (const m of (debate1ChatRes.data ?? []) as Array<{ student_id: string; sender: string | null }>) {
    if (m.sender !== "user") continue;
    const k = `${m.student_id}::3`;
    debateTurnMap.set(k, (debateTurnMap.get(k) ?? 0) + 1);
  }
  for (const m of (debate2ChatRes.data ?? []) as Array<{ student_id: string; sender: string | null }>) {
    if (m.sender !== "user") continue;
    const k = `${m.student_id}::4`;
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
  for (const r of (refl1ChatRes.data ?? []) as Array<{ student_id: string; user_message: string | null }>) {
    if (!r.user_message || !r.user_message.trim()) continue;
    const k = `${r.student_id}::3`;
    reflTurnMap.set(k, (reflTurnMap.get(k) ?? 0) + 1);
  }
  for (const r of (refl2ChatRes.data ?? []) as Array<{ student_id: string; user_message: string | null }>) {
    if (!r.user_message || !r.user_message.trim()) continue;
    const k = `${r.student_id}::4`;
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
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(ids: string[], checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return next;
    });
  }

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

  async function exportAll() {
    setExporting(true);
    try {
      const all = await fetchAllChatRows();
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      downloadCSV(`chat-all-by-student-${ts}.csv`, toCSV(all));
    } finally {
      setExporting(false);
    }
  }

  async function exportStudent(studentNumber: string, name: string | null) {
    const all = await fetchAllChatRows();
    const filtered = all.filter((r) => r.student_number === studentNumber);
    const safe = `${studentNumber}_${(name ?? "").replace(/[^\w가-힣]+/g, "")}`;
    downloadCSV(`chat-${safe}.csv`, toCSV(filtered));
  }

  async function deleteStudent(studentId: string, label: string) {
    const ok = window.confirm(
      `정말로 [${label}] 학생의 모든 기록(설문/메모/챗/세션/보고서)을 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`
    );
    if (!ok) return;
    const ok2 = window.confirm("마지막 확인: 정말 삭제하시겠습니까?");
    if (!ok2) return;
    await deleteStudentRecords([studentId]);
    await refresh();
  }

  async function deleteStudentRecords(studentIds: string[]) {
    if (studentIds.length === 0) return;
    await Promise.all([
      supabase.from("debate_1_chat").delete().in("student_id", studentIds),
      supabase.from("debate_2_chat").delete().in("student_id", studentIds),
      supabase.from("debate_sessions").delete().in("student_id", studentIds),
      supabase.from("research_chat").delete().in("student_id", studentIds),
      supabase.from("reflection_1_chat").delete().in("student_id", studentIds),
      supabase.from("reflection_2_chat").delete().in("student_id", studentIds),
      supabase.from("research_memo").delete().in("student_id", studentIds),
      supabase.from("debate_notes").delete().in("student_id", studentIds),
      supabase.from("reflection_notes").delete().in("student_id", studentIds),
      supabase.from("final_reports").delete().in("student_id", studentIds),
      supabase.from("surveys").delete().in("student_id", studentIds),
    ]);
    await supabase.from("students").delete().in("id", studentIds);
  }

  async function deleteSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const ok = window.confirm(
      `선택한 학생 ${ids.length}명의 모든 기록(설문/메모/챗/세션/보고서)을 삭제합니다.\n이 작업은 되돌릴 수 없습니다.`
    );
    if (!ok) return;
    const ok2 = window.confirm(`마지막 확인: ${ids.length}명을 정말 삭제하시겠습니까?`);
    if (!ok2) return;
    setBulkDeleting(true);
    try {
      await deleteStudentRecords(ids);
      setSelected(new Set());
      await refresh();
    } finally {
      setBulkDeleting(false);
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
            <Button size="sm" variant="outline" onClick={exportAll} disabled={exporting}>
              <Download className={`h-4 w-4 ${exporting ? "animate-pulse" : ""}`} />
              <span className="ml-1">전체 챗 CSV</span>
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={deleteSelected}
              disabled={selected.size === 0 || bulkDeleting}
            >
              <Trash2 className={`h-4 w-4 ${bulkDeleting ? "animate-pulse" : ""}`} />
              <span className="ml-1">선택 삭제 ({selected.size})</span>
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
                      <th rowSpan={2} className="px-2 py-2">
                        <Checkbox
                          checked={list.every((r) => selected.has(r.student.id)) && list.length > 0}
                          onCheckedChange={(c) =>
                            toggleGroup(list.map((r) => r.student.id), c === true)
                          }
                          aria-label="이 반 전체 선택"
                        />
                      </th>
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
                      <th rowSpan={2} className="px-2 py-2">내보내기</th>
                      <th rowSpan={2} className="px-2 py-2">삭제</th>
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
                        <td className="px-2 py-2 text-center">
                          <Checkbox
                            checked={selected.has(r.student.id)}
                            onCheckedChange={() => toggleOne(r.student.id)}
                            aria-label={`${r.student.student_number} 선택`}
                          />
                        </td>
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
                        <td className="px-2 py-2 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => exportStudent(r.student.student_number, r.student.name)}
                            title="이 학생의 모든 챗 대화 CSV 다운로드"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              deleteStudent(
                                r.student.id,
                                `${r.student.student_number} ${r.student.name ?? ""}`.trim()
                              )
                            }
                            title="이 학생의 모든 기록 삭제"
                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
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