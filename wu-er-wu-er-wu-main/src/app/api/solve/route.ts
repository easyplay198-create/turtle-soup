// src/app/api/solve/route.ts
import { NextResponse } from 'next/server'
import { stories } from '@/data/stories'

if (!process.env.DEEPSEEK_API_KEY) throw new Error('[SECURITY] Key missing')

export async function POST(req: Request) {
  const body = (await req.json()) as { storyId?: unknown; answer?: unknown }
  
  if (typeof body.storyId !== 'string' || typeof body.answer !== 'string')
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const answer = body.answer.trim()
  if (!answer) {
    return NextResponse.json({
      correct: false,
      hint: '还差：请先提交完整的最终真相陈述',
    })
  }

  const story = stories.find((s) => s.id === body.storyId)
  if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 })

  const systemPrompt = `你是海龟汤游戏的结案裁判。

【完整真相（汤底）】：${story.bottom}
【玩家最终陈述】：${answer}

判定规则：
1. 玩家陈述是否在语义上覆盖了汤底的核心因果链
2. 不要求用词完全一致，语义接近即可通过
3. 核心覆盖三类：人物关系、死因机制、最终结局
4. 如果只差一类，在 hint 里精确指出缺的是哪一类

只输出 JSON：
{"correct": true}
或
{"correct": false, "hint": "还差：[一句话说明]"}`

  try {
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
        ],
      }),
    })
    
    if (!resp.ok) {
      const raw = await resp.text()
      throw new Error(`DeepSeek request failed: ${resp.status} ${raw}`)
    }

    const payload = await resp.json() as { choices?: { message?: { content?: string } }[] }
    const content = payload.choices?.[0]?.message?.content ?? ''
    const result = JSON.parse(content) as { correct?: boolean; hint?: string }
    
    return NextResponse.json({
      correct: result.correct === true,
      hint: result.hint ?? '还差：请补充死因机制这一环的关键细节',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Solve error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
