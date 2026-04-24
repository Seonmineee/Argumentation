import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TOPIC = "교육감 선거권 연령을 16세로 하향하여야 한다.";

function systemPrompt(studentPosition: "pro" | "con") {
  // AI takes the OPPOSITE side of the student
  const aiSide = studentPosition === "pro" ? "반대" : "찬성";
  const studentSide = studentPosition === "pro" ? "찬성" : "반대";
  return `당신은 고등학생과 1:1 모의 토론을 진행하는 토론 상대 챗봇입니다.

[토론 논제] ${TOPIC}

[역할] 당신은 이 논제에 대해 "${aiSide}" 입장을 굳건히 견지합니다. 학생은 "${studentSide}" 입장입니다.

[토론 원칙]
1. 매 턴 한국어 존댓말, 4~7문장으로 간결하게 응답합니다.
2. 논증 구조: (1) 학생 주장에서 가장 핵심적인 한 지점을 짚어 반박하고, (2) "${aiSide}" 입장의 새로운 근거 1~2가지를 구체적 사례·데이터·통계·법안 등으로 제시한 뒤, (3) 학생이 다음 턴에서 답해야 할 질문을 1개 던지며 마무리합니다.
4. 인신공격·비꼼·감정적 표현 금지. 학생의 인격이 아닌 "주장"을 비판합니다.
5. 학생이 논점을 회피하면 정중히 다시 그 논점으로 끌어옵니다.
6. 절대 학생의 입장에 동조하거나 입장을 바꾸지 않습니다. 끝까지 "${aiSide}" 입장입니다.
7. 첫 인사 메시지에서는 입장과 핵심 근거 2개를 제시하고 학생의 입론을 요청합니다.

[금지] 마크다운 큰 헤더(#, ##) 사용 금지. 줄바꿈으로 가독성 확보.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, studentPosition } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt(studentPosition) },
          ...messages,
        ],
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
    console.error("debate-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});