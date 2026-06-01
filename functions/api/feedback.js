// Cloudflare Pages Functions API: /api/feedback
export async function onRequestPost(context) {
    const { request, env } = context;
    
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { 
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    const { type, content } = body;
    if (!type || !content || (type !== 'wish' && type !== 'bug')) {
        return new Response(JSON.stringify({ error: "Missing type, content or invalid feedback type" }), { 
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    // 限制內容長度為 200 字以內，防惡意爆破
    if (content.length > 200) {
        return new Response(JSON.stringify({ error: "Feedback content too long" }), { 
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    const feedbackItem = {
        type,
        content: content.trim(),
        timestamp: Date.now()
    };

    // 本地環境無 KV 時，直接回傳成功以利前端模擬
    if (!env.VOTES) {
        return new Response(JSON.stringify({ success: true, message: "Mock saved (No KV bound)" }), {
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });
    }

    try {
        // 從現有的 VOTES 命名空間讀取回饋列表
        const feedbacks = await env.VOTES.get("quiz_feedbacks", { type: "json" }) || [];
        
        // 將新資料放到最前面
        feedbacks.unshift(feedbackItem);
        
        // 僅保留最新 200 筆，避免 KV 值超出大小限制 (最大 25MB)
        const trimmedFeedbacks = feedbacks.slice(0, 200);
        
        // 寫入 KV
        await env.VOTES.put("quiz_feedbacks", JSON.stringify(trimmedFeedbacks));
        
        return new Response(JSON.stringify({ success: true }), {
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
