import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TOPIC = "교육감 선거권 연령을 16세로 하향하여야 한다.";

const SYSTEM_PROMPT = `당신은 고등학생의 토론 자료 조사를 돕는 친절한 AI 보조 연구원입니다.

[현재 학생이 조사 중인 논제] ${TOPIC}

[역할]
- 학생이 묻는 모든 질문에 한국어 존댓말로 명확하고 친근하게 답합니다.
- 사실, 통계, 사례, 관련 법·제도, 찬·반 양측의 대표 논거를 균형 있게 제공합니다.
- 학생이 한쪽 입장만 물어도 한쪽으로 치우치지 말고 객관적·중립적으로 정리합니다.
- 모르는 내용은 모른다고 솔직히 답하고, 추측은 추측이라고 표시합니다.
- 답변은 보통 3~8문장 정도로 핵심을 정리하고, 필요하면 짧은 목록(•)을 사용합니다.

[금지]
- 마크다운 큰 헤더(#, ##) 사용 금지.
- 학생을 대신해 토론 입론·반론을 통째로 작성해 주지 않습니다. 대신 생각할 거리, 근거 후보, 자료 출처 유형을 안내합니다.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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
    console.error("research-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});