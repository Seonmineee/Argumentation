import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function givenNameFrom(fullName: string): string {
  const n = (fullName ?? "").trim();
  if (n.length >= 2) return n.slice(1);
  return n;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, studentName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const given = givenNameFrom(studentName ?? "");
    const nameLine = given
      ? `학생 이름은 "${studentName}"이며, 호명할 때는 반드시 "${given}님" 형태로 부르세요. 첫 응답과 자연스러운 시점에 "${given}님"을 사용합니다.\n`
      : "";
    const systemPrompt = {
      role: "system" as const,
      content:
        `${nameLine}답변은 반드시 3줄 이내로 매우 짧고 간결하게 작성하세요. ` +
        `불필요한 서론·맺음말·예시 나열·번호 목록을 쓰지 말고 핵심만 말하세요. ` +
        `학생이 더 묻기 전까지는 부연 설명을 하지 않습니다.`,
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.5",
        messages: [systemPrompt, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429)
        return new Response(JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (response.status === 402)
        return new Response(JSON.stringify({ error: "AI 사용 크레딧이 부족합니다. 워크스페이스에 크레딧을 추가해 주세요." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI 게이트웨이 오류" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("research-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});