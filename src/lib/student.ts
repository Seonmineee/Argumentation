import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "debate_student";

export type StudentSession = {
  id: string;
  student_number: string;
  phone_last4: string;
  name?: string | null;
};

export function getStudent(): StudentSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStudent(s: StudentSession | null) {
  if (typeof window === "undefined") return;
  if (s) localStorage.setItem(KEY, JSON.stringify(s));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("student-changed"));
}

export function useStudent() {
  const [student, setS] = useState<StudentSession | null>(null);
  useEffect(() => {
    setS(getStudent());
    const onChange = () => setS(getStudent());
    window.addEventListener("student-changed", onChange);
    return () => window.removeEventListener("student-changed", onChange);
  }, []);
  return student;
}

/** Korean given name heuristic: drop the first character (성).
 *  은선민 → 선민, 김민 → 민. For empty/short input falls back to original. */
export function getGivenName(name?: string | null): string {
  const n = (name ?? "").trim();
  if (n.length >= 2) return n.slice(1);
  return n;
}

export type ResumeRoute =
  | "/stage1"
  | "/stage2"
  | "/stage3"
  | "/stage3/reflection"
  | "/stage4"
  | "/stage4/reflection"
  | "/stage5"
  | "/stage5/reflection"
  | "/stage5/survey";

/**
 * Decide which stage a returning student should land on.
 * Walks progress from latest → earliest and returns the first incomplete step.
 */
export async function getResumeRoute(studentId: string): Promise<ResumeRoute> {
  const [postSurvey, finalReport, s5Sessions, s4Sessions, s3Sessions, memo, research, preSurvey] =
    await Promise.all([
      supabase.from("surveys").select("id").eq("student_id", studentId).eq("survey_type", "post").maybeSingle(),
      supabase.from("final_reports").select("id,content").eq("student_id", studentId).maybeSingle(),
      supabase.from("debate_sessions").select("status").eq("student_id", studentId).eq("stage", 5).maybeSingle(),
      supabase.from("debate_sessions").select("status").eq("student_id", studentId).eq("stage", 4).maybeSingle(),
      supabase.from("debate_sessions").select("status").eq("student_id", studentId).eq("stage", 3).maybeSingle(),
      supabase.from("research_memo").select("id").eq("student_id", studentId).maybeSingle(),
      supabase.from("research_chat").select("id").eq("student_id", studentId).limit(1).maybeSingle(),
      supabase.from("surveys").select("id").eq("student_id", studentId).eq("survey_type", "pre").maybeSingle(),
    ]);

  if (postSurvey.data) return "/stage5/survey";
  if (finalReport.data?.content && finalReport.data.content.trim().length > 0) return "/stage5/survey";
  if (s5Sessions.data?.status === "ended") return "/stage5"; // 보고서 작성으로
  if (s5Sessions.data) return "/stage5/reflection";
  if (s4Sessions.data?.status === "ended") return "/stage5/reflection";
  if (s4Sessions.data) return "/stage4/reflection";
  if (s3Sessions.data?.status === "ended") return "/stage4";
  if (s3Sessions.data) return "/stage3/reflection";
  if (memo.data || research.data) return "/stage3";
  if (preSurvey.data) return "/stage2";
  return "/stage1";
}