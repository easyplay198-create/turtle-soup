import { NextRequest, NextResponse } from 'next/server'

const MEME_POOL: Record<string, string[]> = {
  否: [
    '你在想peach',
    '这个方向不对，重来',
    '离真相越来越远了',
    '别急，换个角度再问',
  ],
  无关: [
    '你是来找我聊天的吧？',
    '跑题了臭宝，拉回来',
    '这条线索和案子没关系',
    '别绕了，盯住案件本身',
  ],
}

export async function POST(req: NextRequest) {
  const { verdict } = await req.json()

  if (verdict === '否' || verdict === '无关') {
    const pool = MEME_POOL[verdict] || MEME_POOL['无关']
    const message = pool[Math.floor(Math.random() * pool.length)]
    return NextResponse.json({ message })
  }

  const fallback =
    verdict === '是'
      ? '哥们你嗅到了！继续往下挖🔍'
      : '臭宝差一口气，再推一把！'

  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ message: fallback })
  }

  const prompt = `你是海龟汤主持人，风格是抖音说案风 + 轻梗感。
当前判定结果是：${verdict}
请输出一句不超过25字的鼓励型回应。
要求：
1. 不能泄露案件细节
2. 语气要有戏剧感
3. 只输出一句话`

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.9,
        max_tokens: 50,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const raw = await response.text()
      throw new Error(`DeepSeek request failed: ${response.status} ${raw}`)
    }

    const data = await response.json()
    const message = data?.choices?.[0]?.message?.content?.trim() || fallback
    return NextResponse.json({ message: message.slice(0, 60) })
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : 'DeepSeek request failed: unknown error'
    return NextResponse.json({ message: fallback, error: detail }, { status: 502 })
  }
}