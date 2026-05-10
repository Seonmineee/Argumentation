import { useEffect, useState } from "react";

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