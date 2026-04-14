'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  isLowSignalQuestion,
  isValidClue,
  normalizeQuestion,
  type TEvidenceSlot,
} from '@/utils/progressRules'

type TChatItem = {
  question: string
  hostMessage: string
  verdict: string
  systemKind?: 'confirmed' | 'missing' | 'hint' | 'reward'
}

type Props = {
  storyId: string
  surface: string
  bottom: string
  title: string
}

function detectSolveMissingCategories(answer: string) {
  const missing: string[] = []
  if (!/(女朋友|妻子|男人|女子|男孩|他|她|两人|关系|情侣|夫妻|人物)/.test(answer)) {
    missing.push('人物关系')
  }
  if (!/(死|溺水|踩|误伤|窒息|癫痫|惊吓|跌倒|打嗝|止住|死因|机制)/.test(answer)) {
    missing.push('死因机制')
  }
  if (!/(最终|后来|结果|结局|因此|于是|所以|导致|自杀|离开|死亡)/.test(answer)) {
    missing.push('最终结局')
  }
  return missing
}

function buildDynamicTemplateHint(slots: Set<TEvidenceSlot>) {
  if (slots.size >= 3) {
    return '三段关键线索已齐，可进入结案。'
  }

  const templates: string[] = []
  if (!slots.has('entity')) templates.push('人物关系是谁')
  if (!slots.has('mechanism')) templates.push('死因机制是什么')
  if (!slots.has('motive')) templates.push('最终结局是什么')

  if (templates.length === 0) {
    return '三段关键线索已齐，可进入结案。'
  }
  return `可以试着问：${templates.join('？ / ')}？`
}


function bubbleClass(verdict: string): string {
  if (verdict.includes('是')) {
    return 'border-emerald-400/40 bg-emerald-500/12 shadow-[0_0_24px_rgba(16,185,129,0.12)]'
  }
  if (verdict.includes('接近')) {
    return 'border-amber-400/40 bg-amber-500/12 shadow-[0_0_24px_rgba(251,191,36,0.12)]'
  }
  if (verdict.includes('否')) {
    return 'border-rose-400/30 bg-rose-500/10 shadow-[0_0_18px_rgba(244,63,94,0.08)]'
  }
  return 'border-slate-700/80 bg-slate-800/55'
}

function verdictBadge(verdict: string) {
  if (verdict.includes('是')) {
    return {
      label: '关键命中',
      cls: 'text-emerald-300 bg-emerald-500/15 border border-emerald-400/30',
    }
  }
  if (verdict.includes('接近')) {
    return {
      label: '接近真相',
      cls: 'text-amber-300 bg-amber-500/15 border border-amber-400/30',
    }
  }
  if (verdict.includes('否')) {
    return {
      label: '方向错误',
      cls: 'text-rose-300 bg-rose-500/15 border border-rose-400/30',
    }
  }
  return {
    label: '无效线索',
    cls: 'text-slate-300 bg-slate-700/60 border border-slate-600/70',
  }
}

type THintBundle = {
  confirmedFacts: Record<TEvidenceSlot, string>
  missingRing: string
  directionHints: [string, string, string]
}

const fallbackHintBundle: THintBundle = {
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

export default function GameClient({ storyId, surface, bottom, title }: Props) {
  const [history, setHistory] = useState<TChatItem[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isWon, setIsWon] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [evidenceSlots, setEvidenceSlots] = useState<Set<TEvidenceSlot>>(new Set())
  const [askedQuestionSet, setAskedQuestionSet] = useState<Set<string>>(new Set())
  const [lowQualityStreak, setLowQualityStreak] = useState(0)
  const [directionScore, setDirectionScore] = useState(0)
  const [eliminationScore, setEliminationScore] = useState(0)
  const [rewardTriggered, setRewardTriggered] = useState<Set<number>>(new Set())
  const [hintBundle, setHintBundle] = useState<THintBundle>(fallbackHintBundle)
  const [hasFetchedHintBundle, setHasFetchedHintBundle] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const clueCount = evidenceSlots.size

  const latestValidQuestion = useMemo(() => {
    const hit = [...history].reverse().find(item => item.verdict === '是' || item.verdict === '接近')
    return hit?.question ?? ''
  }, [history])

  const storySummary = useMemo(() => {
    return [
      {
        label: '案件背景',
        text: surface || '当前案件摘要缺失，请检查案件数据是否正确传入。',
      },
      {
        label: '当前进展',
        text:
          clueCount === 0
            ? '尚未锁定有效线索，先从人物关系、死因、异常行为切入。'
            : latestValidQuestion
            ? `已锁定 ${clueCount}/3 条有效线索，最近命中问题：${latestValidQuestion}`
            : `已锁定 ${clueCount}/3 条有效线索。`,
      },
      {
        label: '下一步建议',
        text:
          clueCount === 0
            ? '先问“谁出了事、怎么出的事、现场有什么异常”。'
            : clueCount === 1
            ? '继续确认关键人物行为是否与死因直接相关。'
            : clueCount === 2
            ? '最后追问触发原因、隐藏动机或关键因果链。'
            : '线索已齐，真相已经可以揭开。',
      },
    ]
  }, [surface, clueCount, latestValidQuestion])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, isLoading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function triggerFlash(verdict: string) {
    setFlash(verdict)
    window.setTimeout(() => setFlash(null), 520)
  }

  async function ensureHintBundle() {
    if (hasFetchedHintBundle) return
    setHasFetchedHintBundle(true)
    try {
      const res = await fetch('/api/game-hints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data) return
      if (
        data.confirmedFacts &&
        typeof data.confirmedFacts.entity === 'string' &&
        typeof data.confirmedFacts.mechanism === 'string' &&
        typeof data.confirmedFacts.motive === 'string' &&
        Array.isArray(data.directionHints) &&
        data.directionHints.length === 3
      ) {
        setHintBundle({
          confirmedFacts: {
            entity: data.confirmedFacts.entity,
            mechanism: data.confirmedFacts.mechanism,
            motive: data.confirmedFacts.motive,
          },
          missingRing:
            typeof data.missingRing === 'string' ? data.missingRing : fallbackHintBundle.missingRing,
          directionHints: [
            String(data.directionHints[0]),
            String(data.directionHints[1]),
            String(data.directionHints[2]),
          ],
        })
      }
    } catch {
      // keep fallback hints in current session
    }
  }

  async function handleAsk() {
    if (!input.trim() || isLoading || isWon) return

    const question = input.trim()
    setInput('')
    setIsLoading(true)

    try {
      const judgeRes = await fetch('/api/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, question }),
      })

      const judgeData = await judgeRes.json().catch(() => ({}))

      if (!judgeRes.ok) {
        throw new Error(
          typeof judgeData.error === 'string' ? judgeData.error : 'Judge request failed'
        )
      }

      const verdict =
        typeof judgeData.verdict === 'string' ? judgeData.verdict : '无关'
      const slot: TEvidenceSlot | null =
        judgeData.slot === 'entity' || judgeData.slot === 'mechanism' || judgeData.slot === 'motive'
          ? judgeData.slot
          : null

      triggerFlash(verdict)

      const hostRes = await fetch('/api/host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verdict }),
      })

      const hostData = await hostRes.json().catch(() => ({}))

      if (!hostRes.ok) {
        throw new Error(
          typeof hostData.error === 'string' ? hostData.error : 'Host request failed'
        )
      }

      const message =
        typeof hostData.message === 'string' ? hostData.message : verdict

      const normalizedQuestion = normalizeQuestion(question)
      const isDuplicateQuestion = askedQuestionSet.has(normalizedQuestion)
      const isLowSignal = isLowSignalQuestion(question)
      const isEffectiveQuestion = !isLowSignal && !isDuplicateQuestion && slot !== null

      let progressed = false
      let nextSlots = evidenceSlots

      if (
        !isLowSignal &&
        !isDuplicateQuestion &&
        isValidClue(verdict) &&
        slot &&
        !evidenceSlots.has(slot)
      ) {
        await ensureHintBundle()
        nextSlots = new Set(evidenceSlots)
        nextSlots.add(slot)
        setEvidenceSlots(nextSlots)
        progressed = true
      }

      if (!isDuplicateQuestion) {
        const nextAsked = new Set(askedQuestionSet)
        nextAsked.add(normalizedQuestion)
        setAskedQuestionSet(nextAsked)
      }

      let patchedVerdict = verdict
      if (isLowSignal) {
        patchedVerdict = '无关'
      }

      let nextDirectionScore = directionScore
      if (patchedVerdict === '接近' && !progressed && isEffectiveQuestion) {
        nextDirectionScore = Math.min(10, directionScore + 1)
        setDirectionScore(nextDirectionScore)
      }

      let nextEliminationScore = eliminationScore
      if (patchedVerdict === '否' && isEffectiveQuestion) {
        nextEliminationScore = Math.min(5, eliminationScore + 1)
        setEliminationScore(nextEliminationScore)
      }

      const feedbackTag = progressed
        ? `解锁关键线索 ${nextSlots.size}/3`
        : patchedVerdict === '无关'
        ? '跑题了，拉回案件本身'
        : patchedVerdict === '否'
        ? `排除了一条错误方向（排除值 ${nextEliminationScore}/5）`
        : `方向对了，再具体一点（方向值 ${nextDirectionScore}/10）`

      const newItem: TChatItem = {
        question,
        hostMessage: `${message}（${feedbackTag}）`,
        verdict: patchedVerdict,
      }
      const nextStreak = progressed ? 0 : lowQualityStreak + 1
      setLowQualityStreak(nextStreak)

      const shouldPushTemplateHint = !progressed && (nextStreak === 2 || nextStreak === 3)
      let nextHistory: TChatItem[] = shouldPushTemplateHint
        ? [
            ...history,
            newItem,
            {
              question: '系统提示',
              hostMessage: buildDynamicTemplateHint(nextSlots),
              verdict: '无关',
              systemKind: 'hint' as const,
            },
          ]
        : [...history, newItem]

      const nextRewardTriggered = new Set(rewardTriggered)
      const rewardMilestones: Array<{ score: number; hintIdx: number }> = [
        { score: 3, hintIdx: 0 },
        { score: 6, hintIdx: 1 },
        { score: 10, hintIdx: 2 },
      ]
      const rewardCards: TChatItem[] = []
      for (const milestone of rewardMilestones) {
        if (nextDirectionScore >= milestone.score && !nextRewardTriggered.has(milestone.score)) {
          const hint = hintBundle.directionHints[milestone.hintIdx]
          if (typeof hint === 'string' && hint.trim()) {
            rewardCards.push({
              question: '系统提示',
              hostMessage: hint,
              verdict: '接近',
              systemKind: 'reward' as const,
            })
          }
          nextRewardTriggered.add(milestone.score)
        }
      }
      if (nextRewardTriggered.size !== rewardTriggered.size) {
        setRewardTriggered(nextRewardTriggered)
      }
      if (rewardCards.length > 0) {
        nextHistory = [...nextHistory, ...rewardCards]
      }

      if (progressed) {
        if (slot) {
          nextHistory = [
            ...nextHistory,
            {
              question: '系统提示',
              hostMessage: hintBundle.confirmedFacts[slot],
              verdict: '接近',
              systemKind: 'confirmed' as const,
            },
          ]
        }
        if (nextSlots.size === 3) {
          const finalCards: TChatItem[] = []
          finalCards.push({
            question: '系统提示',
            hostMessage: hintBundle.missingRing,
            verdict: '无关',
            systemKind: 'missing' as const,
          })
          if (finalCards.length > 0) {
            nextHistory = [...nextHistory, ...finalCards]
          }
        }
      }
      setHistory(nextHistory)

      // 通关必须是“证据槽位满足 + 最终结案校验通过”，不能只靠正向 verdict 次数
      if (nextSlots.size >= 3) {
        const solveRes = await fetch('/api/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storyId, answer: question }),
        })
        const solveData = await solveRes.json().catch(() => ({}))
        if (solveRes.ok && solveData?.correct === true) {
          window.setTimeout(() => setIsWon(true), 480)
        } else {
          const hintFromSolve =
            typeof solveData?.hint === 'string' && solveData.hint.trim().length > 0
              ? solveData.hint
              : null
          const missingParts = detectSolveMissingCategories(question)
          const missingText =
            missingParts.length > 0 ? missingParts.join(' / ') : '人物关系 / 死因机制 / 最终结局'
          setHistory(prev => [
            ...prev,
            {
              question: '系统提示',
              hostMessage: hintFromSolve ?? `真相还差一环，请补充：${missingText} 中缺失的部分`,
              verdict: '无关',
              systemKind: 'missing' as const,
            },
          ])
        }
      }
    } catch (error) {
      console.error('ask failed =>', error)

      const msg =
        error instanceof Error ? error.message : 'unknown error'

      setHistory(prev => [
        ...prev,
        {
          question,
          hostMessage: `请求失败：${msg}`,
          verdict: '无关',
        },
      ])
    } finally {
      setIsLoading(false)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }

  const overlayClass = flash
    ? flash.includes('是')
      ? 'opacity-100'
      : flash.includes('接近')
      ? 'opacity-90'
      : flash.includes('否')
      ? 'opacity-80'
      : 'opacity-60'
    : 'opacity-0'

  const overlayStyle = flash
    ? flash.includes('是')
      ? 'radial-gradient(circle at 50% 22%, rgba(16,185,129,.25), transparent 38%)'
      : flash.includes('接近')
      ? 'radial-gradient(circle at 50% 22%, rgba(251,191,36,.22), transparent 40%)'
      : flash.includes('否')
      ? 'radial-gradient(circle at 50% 22%, rgba(244,63,94,.18), transparent 42%)'
      : 'radial-gradient(circle at 50% 22%, rgba(148,163,184,.12), transparent 40%)'
    : 'none'

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_28%),linear-gradient(to_bottom,rgba(15,23,42,0.15),rgba(2,6,23,0.92))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(90deg,transparent,rgba(251,191,36,0.12),transparent)] blur-2xl" />
      <div
        className={`pointer-events-none fixed inset-0 z-40 transition-opacity duration-500 ${overlayClass}`}
        style={{ background: overlayStyle }}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-6 pt-4 md:px-6">
        <header className="mb-4 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 backdrop-blur md:px-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Link href="/" className="inline-flex items-center text-sm text-slate-400 transition hover:text-white">
                ← 返回大厅
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300">
                  Case {storyId}
                </span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium tracking-[0.18em] text-cyan-200">
                  Investigation in Progress
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">已锁定线索</div>
              <div className="mt-1 text-2xl font-black text-white md:text-3xl">{clueCount}/3</div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.4fr_0.9fr]">
            <div className="rounded-2xl border border-rose-400/20 bg-[linear-gradient(135deg,rgba(127,29,29,0.22),rgba(30,41,59,0.42))] px-4 py-4 md:px-5">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-rose-300">
                案件卡示
              </div>

              <h1 className="mb-3 text-2xl font-black leading-tight text-white md:text-3xl">
                {title || '未命名案件'}
              </h1>

              <p className="mb-4 whitespace-pre-line text-sm leading-7 text-slate-100 md:text-base">
                {surface || '这里应该显示本关的汤面摘要。如果这里是空白，说明父页面没有把案件 surface 正常传进来。'}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">
                    关卡定位
                  </div>
                  <div className="text-sm leading-6 text-slate-200">
                    这是一个围绕异常行为、隐藏因果与人物关系展开的推理关卡。
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                    建议切口
                  </div>
                  <div className="text-sm leading-6 text-slate-200">
                    先问谁出事了、怎么出的事、现场有什么异常，再追问动机和关键物品。
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-4">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">
                侦查故事线
              </div>
              <div className="space-y-3 text-sm text-slate-200 md:text-[15px]">
                {storySummary.map(item => (
                  <div key={item.label} className="rounded-xl border border-white/8 bg-white/5 px-3 py-3">
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                      {item.label}
                    </div>
                    <div className="leading-6 text-slate-100">{item.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/55 px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">破案进度</div>
              <div className="text-sm text-slate-300">命中 3 段线索后还需结案校验</div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map(step => {
                const active = clueCount >= step
                return (
                  <div
                    key={step}
                    className={`rounded-2xl border px-3 py-3 transition-all duration-300 ${
                      active
                        ? 'border-amber-400/40 bg-amber-500/12 shadow-[0_0_24px_rgba(251,191,36,0.12)]'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-black ${
                          active ? 'bg-amber-400 text-black' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {step}
                      </div>
                      <div className="text-sm font-semibold text-white">关键线索 {step}</div>
                    </div>
                    <div className="text-xs leading-5 text-slate-400">
                      {active ? '已锁定，继续逼近真相。' : '等待一次有效提问命中。'}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">方向判断</div>
                <div className="mt-1 text-sm text-cyan-100">{directionScore}/10</div>
              </div>
              <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-300">排除错误方向</div>
                <div className="mt-1 text-sm text-rose-100">{eliminationScore}/5</div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-slate-950/65 backdrop-blur">
          <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
              {history.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-center">
                  <div className="mb-2 text-sm font-semibold text-amber-300">开局建议</div>
                  <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-300 md:text-[15px]">
                    先从人物关系、死亡方式、作案动机切入，不要用“发生了什么”这种过宽问题。
                  </p>
                </div>
              )}

              {history.map((item, i) => {
                if (item.systemKind) {
                  const isMissing = item.systemKind === 'missing'
                  const isReward = item.systemKind === 'reward'
                  const title = isMissing
                    ? '还缺的一环 ⚠️'
                    : isReward
                    ? '阶段奖励 🎯'
                    : '已确认事实 🔍'
                  return (
                    <div key={i} className="flex justify-start">
                      <div
                        className={`max-w-[90%] rounded-2xl border px-4 py-3 md:max-w-[76%] ${
                          isMissing
                            ? 'border-rose-400/35 bg-rose-500/10'
                            : isReward
                            ? 'border-amber-400/35 bg-amber-500/10'
                            : 'border-cyan-400/30 bg-cyan-500/10'
                        }`}
                      >
                        <div
                          className={`mb-2 text-[11px] font-bold uppercase tracking-[0.18em] ${
                            isMissing ? 'text-rose-300' : isReward ? 'text-amber-300' : 'text-cyan-300'
                          }`}
                        >
                          {title}
                        </div>
                        <div className="text-sm leading-7 text-slate-100 md:text-[15px]">{item.hostMessage}</div>
                      </div>
                    </div>
                  )
                }

                const badge = verdictBadge(item.verdict)
                return (
                  <div key={i} className="animate-[msgIn_.32s_ease] space-y-2">
                    <div className="flex justify-end">
                      <div className="max-w-[82%] rounded-2xl border border-indigo-400/25 bg-indigo-500/14 px-4 py-3 text-sm leading-7 text-indigo-50 md:max-w-[70%] md:text-[15px]">
                        {item.question}
                      </div>
                    </div>

                    <div className="flex justify-start">
                      <div className={`max-w-[86%] rounded-2xl border px-4 py-3 md:max-w-[72%] ${bubbleClass(item.verdict)}`}>
                        <span className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.18em] ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <div className="text-sm leading-7 text-slate-100 md:text-[15px]">{item.hostMessage}</div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/8 px-4 py-3 text-sm text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.08)]">
                    正在推理中...
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-white/10 bg-slate-950/90 px-4 py-4 md:px-6">
            <div className="mx-auto mb-2 w-full max-w-4xl text-xs text-slate-400 md:text-sm">
              可以试着问：人物关系 / 死因机制 / 现场环境
            </div>
            <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
              <input
                ref={inputRef}
                className="h-12 flex-1 rounded-xl border border-white/10 bg-slate-900/90 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10 md:text-[15px]"
                placeholder={isWon ? '案件已破解' : '输入你的问题，尽量具体一些…'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAsk()}
                readOnly={isLoading}
                disabled={isWon}
              />
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={handleAsk}
                disabled={isLoading || !input.trim() || isWon}
                className="h-12 rounded-xl bg-amber-400 px-5 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40 md:px-6"
              >
                发送
              </button>
            </div>
          </div>
        </main>
      </div>

      {isWon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-[winIn_.35s_ease] rounded-3xl border border-amber-400/35 bg-slate-950/95 p-6 text-center shadow-[0_0_60px_rgba(251,191,36,0.12)]">
            <div className="mb-3 text-5xl">🏆</div>
            <h2 className="mb-2 text-3xl font-black text-amber-300">真相大白</h2>
            <p className="mb-5 text-sm leading-7 text-slate-300 md:text-[15px]">
              你已锁定 3 条有效线索，案件破解成功。
            </p>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">完整汤底</div>
              <p className="text-sm leading-7 text-slate-100 md:text-[15px]">{bottom}</p>
            </div>

            <div className="mt-5 flex gap-3">
              <Link
                href="/"
                className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:text-white"
              >
                返回大厅
              </Link>
              <button
                onClick={() => {
                  setHistory([])
                  setIsWon(false)
                  setInput('')
                  setEvidenceSlots(new Set())
                  setAskedQuestionSet(new Set())
                  setLowQualityStreak(0)
                  setDirectionScore(0)
                  setEliminationScore(0)
                  setRewardTriggered(new Set())
                  requestAnimationFrame(() => {
                    inputRef.current?.focus()
                  })
                }}
                className="flex-1 rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-black transition hover:bg-amber-300"
              >
                再玩一次
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes winIn {
          from { opacity: 0; transform: translateY(18px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}