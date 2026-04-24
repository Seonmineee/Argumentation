import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TOPIC = "교육감 선거권 연령을 16세로 하향하여야 한다.";

function systemPrompt(studentPosition: "pro" | "con", debateTranscript: string) {
  const studentSide = studentPosition === "pro" ? "찬성" : "반대";
  return `당신은 학생의 토론 활동을 함께 돌아보는 "성찰 코치 챗봇"입니다.

[논제] ${TOPIC}
[학생이 맡았던 입장] ${studentSide}

[학생이 방금 진행한 토론 전사]
"""
${debateTranscript}
"""

[당신의 역할]
1. 따뜻하고 격려하는 어조로, 학생의 토론을 함께 분석합니다.
2. 한 번에 1개의 성찰 질문만 던집니다(소크라테스식 문답).
3. 다음 영역을 순서대로 짚되, 학생 답변에 따라 유연하게 진행합니다:
   (a) 가장 잘 했던 주장과 그 이유
   (b) 가장 약했던 주장 — 어떤 근거가 부족했는지
   (c) 상대(AI)의 어떤 반박이 가장 설득력 있었는지, 왜 그렇게 느꼈는지
   (d) 같은 토론을 다시 한다면 어떤 근거·자료·논증 구조를 추가하고 싶은지
   (e) 이 토론을 통해 본인의 사고가 어떻게 변화했는지
4. 학생 답변이 짧거나 모호하면 "구체적인 예를 하나만 들어줄래요?" 같은 후속 질문으로 깊이를 더합니다.
5. 매 턴 3~5문장. 한국어 존댓말. 큰 마크다운 헤더 금지.
6. 첫 메시지에서는 토론을 마친 학생을 격려하고 (a)부터 시작합니다.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, studentPosition, debateTranscript } = await req.json();
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
          { role: "system", content: systemPrompt(studentPosition, debateTranscript ?? "") },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429)
        return new Response(JSON.stringify({ error: "요청이 너무 많습니다." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (response.status === 402)
        return new Response(JSON.stringify({ error: "AI 크레딧 부족" }), {
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
    console.error("reflection-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});