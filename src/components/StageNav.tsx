import { Link, useLocation } from "@tanstack/react-router";
import { useStudent, setStudent } from "@/lib/student";

const stages = [
  { to: "/stage1", label: "1. 사전 설문" },
  { to: "/stage2", label: "2. 자료 조사" },
  { to: "/stage3", label: "3-1. 찬성 토론" },
  { to: "/stage3/reflection", label: "3-2. 토론 성찰" },
  { to: "/stage4", label: "4-1. 반대 토론" },
  { to: "/stage4/reflection", label: "4-2. 토론 성찰" },
  { to: "/stage5/reflection", label: "5-1. 최종 성찰" },
  { to: "/stage5/survey", label: "5-2. 사후 설문" },
] as const;

export function StageNav() {
  const student = useStudent();
  const loc = useLocation();
  if (!student) return null;
  return (
    <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/dashboard" className="text-sm font-semibold text-primary">
          토론·성찰 학습
        </Link>
        <nav className="hidden flex-1 justify-center gap-1 md:flex">
          {stages.map((s) => {
            const active = loc.pathname.startsWith(s.to);
            return (
              <Link
                key={s.to}
                to={s.to}
                className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>학번 {student.student_number}</span>
          <button
            onClick={() => { setStudent(null); window.location.href = "/"; }}
            className="rounded-md border px-2 py-1 hover:bg-muted"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}