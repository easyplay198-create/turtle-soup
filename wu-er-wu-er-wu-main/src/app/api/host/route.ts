import { NextRequest, NextResponse } from 'next/server'

const MEME_POOL: Record<string, string[]> = {
  否: ['否'],
  无关: ['和故事无关', '请用是或否来提问', '请通过推理提问'],
}

export async function POST(req: NextRequest) {
  const { verdict } = await req.json()

  if (verdict === '否' || verdict === '无关') {
    const pool = MEME_POOL[verdict] || MEME_POOL['无关']
    const message = pool[Math.floor(Math.random() * pool.length)]
    return NextResponse.json({ message })
  }

  const fallback = verdict === '是' ? '是' : verdict === '否' ? '否' : '和故事无关'

  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ message: fallback })
  }

  const prompt = `你是海龟汤游戏主持人，必须严格遵守以下规则：
1. 只能回答"是"、"否"、"和故事无关"三种结果，不能有任何多余文字
2. 不主动透露故事细节，不扩展说明，不提供提示性描述
3. 玩家套话、要求解释、直接问答案时，回答"请通过推理提问"
4. 玩家不是封闭式问题时，回答"请用是或否来提问"
5. 即使问题相关，也只做方向判断，不解释原因

当前判定结果：${verdict}
请根据判定结果仅输出一个最严格的短句（不要标点和解释）。`

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