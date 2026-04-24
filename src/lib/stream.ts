export type ChatMsg = { role: "user" | "assistant"; content: string };

export async function streamChat({
  url,
  body,
  onDelta,
  onDone,
  onError,
}: {
  url: string;
  body: unknown;
  onDelta: (delta: string) => void;
  onDone: () => void;
  onError?: (err: { status: number; message: string }) => void;
}) {
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok || !resp.body) {
    let msg = "스트리밍 시작 실패";
    try {
      const j = await resp.json();
      msg = j?.error ?? msg;
    } catch { /* noop */ }
    onError?.({ status: resp.status, message: msg });
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;

  while (!done) {
    const { value, done: rDone } = await reader.read();
    if (rDone) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line || line.startsWith(":")) continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const p = JSON.parse(json);
        const c = p.choices?.[0]?.delta?.content as string | undefined;
        if (c) onDelta(c);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }

  onDone();
}