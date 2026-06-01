// Cloudflare Pages Functions API: /api/votes
export async function onRequestGet(context) {
    const { env } = context;
    
    // 如果沒有綁定 KV (例如在本地開發調試環境)，回傳初始虛擬讚數
    if (!env.VOTES) {
        return new Response(JSON.stringify(getMockVotes()), {
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*" 
            }
        });
    }

    try {
        const votesData = await env.VOTES.get("quiz_votes", { type: "json" }) || getMockVotes();
        return new Response(JSON.stringify(votesData), {
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

    const { quizId, type } = body;
    if (!quizId || (type !== 'up' && type !== 'down')) {
        return new Response(JSON.stringify({ error: "Missing quizId or invalid vote type" }), { 
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    // 本地環境無 KV 時，直接回傳成功以利前端模擬
    if (!env.VOTES) {
        const mockVotes = getMockVotes();
        mockVotes[quizId][type] += 1;
        return new Response(JSON.stringify(mockVotes), {
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });
    }

    try {
        // 讀取目前的讚數 (防空機制)
        const votesData = await env.VOTES.get("quiz_votes", { type: "json" }) || getMockVotes();
        
        // 防禦確保該 quizId 有資料結構
        if (!votesData[quizId]) {
            votesData[quizId] = { up: 0, down: 0 };
        }
        
        // 票數累加
        votesData[quizId][type] = (votesData[quizId][type] || 0) + 1;
        
        // 寫入 KV 儲存庫
        await env.VOTES.put("quiz_votes", JSON.stringify(votesData));
        
        return new Response(JSON.stringify(votesData), {
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

// 預設初始票數，用於冷啟動或本地測試
function getMockVotes() {
    return {
        "monster": { up: 512, down: 24 },
        "split-self": { up: 432, down: 45 },
        "deity": { up: 388, down: 18 },
        "chat": { up: 120, down: 10 },
        "love": { up: 280, down: 15 },
        "art": { up: 95, down: 8 },
        "fish": { up: 310, down: 12 },
        "rich": { up: 240, down: 22 },
        "health": { up: 185, down: 30 }
    };
}
