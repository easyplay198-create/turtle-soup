import { NextResponse } from 'next/server'
import { stories } from '@/data/stories'

if (!process.env.DEEPSEEK_API_KEY) throw new Error('[SECURITY] Key missing')

type TSlot = 'entity' | 'mechanism' | 'motive'

type THintBundle = {
  confirmedFacts: Record<TSlot, string>
  missingRing: string
  directionHints: [string, string, string]
}

const fallbackHints: THintBundle = {
  confirmedFacts: {
    entity: '人物关系方向已锁定，继续确认关键行为与因果链。',
    mechanism: '事件机制方向已锁定，继续追问关键触发细节。',
    motive: '结局与心理动因方向已锁定，已经接近完整真相。',
  },
  missingRing: '还缺的一环：把人物关系、死因机制、最终结局串成一句完整真相。',
  directionHints: [
    '侦查热度升温🔥 你已锁定关键区域，试试更具体的问法',
    '排除确认✂️ 方向正在收束，继续排除错误分支',
    '💡 试着把人物关系、机制、结局串成一句完整真相',
  ],
}

export async function POST(req: Request) {
  const body = (await req.json()) as { storyId?: unknown }
  if (typeof body.storyId !== 'string') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const story = stories.find((s) => s.id === body.storyId)
  if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 })

  const systemPrompt = `你是海龟汤游戏的提示文案生成器。
基于汤底生成“非剧透但方向明确”的提示。

汤底：${story.bottom}

请输出 JSON（不得输出其他文字）：
{
  "confirmedFacts": {
    "entity": "一句不剧透提示",
    "mechanism": "一句不剧透提示",
    "motive": "一句不剧透提示"
  },
  "missingRing": "一句还缺的一环提示",
  "directionHints": [
    "3分奖励文案",
    "6分奖励文案",
    "10分奖励文案"
  ]
}

要求：
1) 不要直接复述完整汤底
2) 每条不超过40字
3) directionHints 必须恰好3条`

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
        messages: [{ role: 'system', content: systemPrompt }],
      }),
    })

    if (!resp.ok) {
      const raw = await resp.text()
      throw new Error(`DeepSeek request failed: ${resp.status} ${raw}`)
    }

    const payload = (await resp.json()) as { choices?: { message?: { content?: string } }[] }
    const content = payload.choices?.[0]?.message?.content ?? ''
    const parsed = JSON.parse(content) as Partial<THintBundle>

    const directionHints = Array.isArray(parsed.directionHints) && parsed.directionHints.length === 3
      ? [String(parsed.directionHints[0]), String(parsed.directionHints[1]), String(parsed.directionHints[2])] as [string, string, string]
      : fallbackHints.directionHints

    const confirmedFacts = parsed.confirmedFacts
      ? {
          entity: String((parsed.confirmedFacts as Record<string, unknown>).entity ?? fallbackHints.confirmedFacts.entity),
          mechanism: String((parsed.confirmedFacts as Record<string, unknown>).mechanism ?? fallbackHints.confirmedFacts.mechanism),
          motive: String((parsed.confirmedFacts as Record<string, unknown>).motive ?? fallbackHints.confirmedFacts.motive),
        }
      : fallbackHints.confirmedFacts

    const result: THintBundle = {
      confirmedFacts,
      missingRing: typeof parsed.missingRing === 'string' ? parsed.missingRing : fallbackHints.missingRing,
      directionHints,
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(fallbackHints)
  }
}
