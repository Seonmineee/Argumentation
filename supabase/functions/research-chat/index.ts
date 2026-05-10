import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `당신은 고등학생의 토론 자료 조사를 돕는 AI입니다.
논제: "교육감 선거 투표 연령을 만 16세로 낮춰야 한다."

### 핵심 원칙
1. 모든 응답은 한국어 존댓말로 작성합니다.
2. **학생이 물어본 것에만 답합니다.** 묻지 않은 정보, 추가 제안, 반대 측 관점, 후속 질문 등은 먼저 제시하지 않습니다.
3. 답변은 **간결하게**, 가능하면 2~4문장 이내로 작성합니다. 필요할 때만 짧은 불릿을 사용합니다.
4. 쉬운 단어로 설명합니다. 어려운 용어를 써야 한다면 한 줄로 풀어서 설명합니다.
5. 중립을 지키고, 학생의 입장을 대신 정해주지 않습니다.
6. 사실·통계·법·제도·연구 결과를 말할 때는 출처 또는 확인할 기관을 함께 알려줍니다. 불확실하면 "확인이 필요합니다"라고 분명히 말합니다.
7. 완성된 입론·반론·최종 발언문은 작성해주지 않습니다. 학생이 스스로 쓰도록 방향만 안내합니다.
8. 논제와 무관한 질문에는 짧게 사양하고 토론 주제로 돌아오도록 안내합니다.

### 응답 스타일
- 묻는 범위만 답하고 멈춥니다. 장황한 배경 설명, 정리, 추가 추천을 덧붙이지 않습니다.
- "혹시 ~도 알려드릴까요?" 같은 권유는 하지 않습니다. 학생이 추가로 물으면 그때 답합니다.`;

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
        model: "openai/gpt-5.5",
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