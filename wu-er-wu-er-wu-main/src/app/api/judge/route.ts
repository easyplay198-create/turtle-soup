import { NextResponse } from 'next/server'
import { stories } from '@/data/stories'

if (!process.env.DEEPSEEK_API_KEY) throw new Error('[SECURITY] Key missing')

type TJudgeBody = { storyId?: unknown; question?: unknown }
type TJudgeOutput = '是' | '否' | '无关' | '接近'
type TJudgeSlot = 'entity' | 'mechanism' | 'motive' | null

const deepseekEndpoint = 'https://api.deepseek.com/chat/completions'
const vagueExactQuestions = new Set([
  '是的',
  '对',
  '嗯',
  '没错',
  '好像是',
  '为什么',
  '为啥',
  '怎么回事',
  '然后呢',
  '真的吗',
  '啥情况',
  '什么情况',
  '咋回事',
])

function normalizeQuestion(question: string) {
  return question
    .trim()
    .replace(/\s+/g, '')
    .replace(/[？?！!。.,，]/g, '')
}

function hasConcreteSignal(question: string) {
  return /(谁|哪个|哪位|哪里|哪儿|是否|是不是|有没有|为何|因为|原因|关系|人物|行为|现场|物品|动机|死因|植物|水|人为|头发)/.test(
    question
  )
}

function isVagueQuestion(question: string) {
  const q = normalizeQuestion(question)
  if (!q) return true
  if (vagueExactQuestions.has(q)) return true
  if (/^(为什么呢|为啥呢|怎么回事呢|然后呢|是吗|对吗)$/.test(q)) return true

  const isShortInterrogative =
    q.length <= 6 && /^(为什么|为啥|怎么|然后|真的|啥|什么|咋)/.test(q)
  if (isShortInterrogative && !hasConcreteSignal(q)) return true

  return false
}

function parseJudgeResult(raw: string): { verdict: TJudgeOutput; slot: TJudgeSlot } {
  try {
    const json = JSON.parse(raw) as { verdict?: string; slot?: string | null }
    const v = json.verdict?.trim() ?? ''
    const slot =
      json.slot === 'entity' || json.slot === 'mechanism' || json.slot === 'motive'
        ? json.slot
        : null
    if (v === '是' || v === '否' || v === '接近' || v === '无关') {
      return { verdict: v, slot: v === '无关' ? null : slot }
    }
  } catch {
    const text = raw.trim()
    if (text.includes('接近')) return { verdict: '接近', slot: null }
    if (text.includes('无关')) return { verdict: '无关', slot: null }
    if (text.includes('否')) return { verdict: '否', slot: null }
    if (text.includes('是')) return { verdict: '是', slot: null }
  }
  return { verdict: '无关', slot: null }
}

function extractContent(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null
  const choices = (payload as Record<string, unknown>)['choices']
  if (!Array.isArray(choices) || choices.length === 0) return null
  const msg = (choices[0] as Record<string, unknown>)['message']
  const content = (msg as Record<string, unknown>)?.['content']
  return typeof content === 'string' ? content : null
}

export async function POST(req: Request) {
  const body = (await req.json()) as TJudgeBody

  if (typeof body.storyId !== 'string' || typeof body.question !== 'string') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const question = body.question.trim()
  if (isVagueQuestion(question)) {
    return NextResponse.json({ verdict: '无关', slot: null }, { status: 200 })
  }

  const story = stories.find((s) => s.id === body.storyId)
  if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 })

  const systemPrompt = `你是海龟汤游戏的判官，必须严格扮演主持人裁判角色。

## 拦截规则（最高优先级）
1. 只能做方向判定，不解释原因，不扩展，不透露任何故事细节。
2. 可接受的结果语义只有三类：是 / 否 / 和故事无关。
3. 玩家直接询问关键道具、人物、原因、结局（如“礼物是什么”“他为什么死”“发生了什么”）时，一律判为“和故事无关”。
4. 不是封闭式问题（无法用是/否回答）时，一律判为“和故事无关”。
5. 玩家套话、要求解释、直接问答案时，一律判为“和故事无关”。

## 槽位判断规则
- entity：涉及人物、身份、关系
- mechanism：涉及死亡方式、事件经过、关键物品
- motive：涉及动机、情绪、最终结局、心理状态
- null：无关、无法判断、或 verdict 为"无关"时

## 输出格式（严格遵守）
只能输出 JSON，不得包含任何其他文字：
{"verdict":"是|否|无关","slot":"entity|mechanism|motive|null"}
其中：
- verdict 为 "无关"（即“和故事无关”）时，slot 必须是 null
- verdict 为 "是/否" 时，slot 可为 entity/mechanism/motive 或 null（无法判断时）`

  const userPrompt = [
    `【汤面】：${story.surface}`,
    `【汤底（仅你可见）】：${story.bottom}`,
    `【玩家提问】：${question}`,
  ].join('\n')

  try {
    const resp = await fetch(deepseekEndpoint, {
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
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!resp.ok) {
      const raw = await resp.text()
      throw new Error(`DeepSeek request failed: ${resp.status} ${raw}`)
    }

    const payload: unknown = await resp.json()
    const content = extractContent(payload)
    const result = parseJudgeResult(content ?? '')

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Judge error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}