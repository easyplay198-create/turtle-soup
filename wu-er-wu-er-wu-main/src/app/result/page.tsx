'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function getRank(attempts: number): { label: string; desc: string; color: string } {
  if (attempts <= 5) return { label: '👁 全知侦探', desc: '5步以内破案，恐怖如斯。', color: 'text-emerald-400' }
  if (attempts <= 10) return { label: '🕵️ 老练探员', desc: '10步破案，经验老道。', color: 'text-amber-400' }
  if (attempts <= 20) return { label: '🔍 普通侦探', desc: '20步破案，中规中矩。', color: 'text-blue-400' }
  return { label: '🐣 菜鸟实习生', desc: '下次再接再厉。', color: 'text-neutral-400' }
}

function ResultContent() {
  const params = useSearchParams()
  const title = params.get('title') ?? '未知案件'
  const attempts = parseInt(params.get('attempts') ?? '0', 10)
  const rank = getRank(attempts)

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-red-500/20 bg-neutral-900/80 overflow-hidden shadow-2xl shadow-red-500/5">
        <div className="px-6 py-5 border-b border-red-500/20 bg-gradient-to-r from-red-500/10 to-transparent">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-400 font-mono tracking-widest">CASE CLOSED</span>
          </div>
          <h1 className="text-2xl font-black text-neutral-100">案件告破</h1>
          <p className="text-sm text-neutral-500 mt-1">「{title}」</p>
        </div>

        <div className="px-6 py-8 flex flex-col items-center text-center gap-4">
          <div className="text-6xl font-black text-white">{attempts}</div>
          <p className="text-neutral-500 text-sm font-mono">次审讯后破案</p>

          <div className="mt-2 px-6 py-4 rounded-xl border border-neutral-800 bg-neutral-950/50 w-full">
            <p className={`text-xl font-black ${rank.color}`}>{rank.label}</p>
            <p className="text-neutral-500 text-sm mt-1">{rank.desc}</p>
          </div>
        </div>

        <div className="px-6 py-5 border-t border-neutral-800 flex gap-3">
          <Link
            href="/"
            className="flex-1 text-center px-4 py-3 rounded-xl border border-neutral-700 text-sm font-bold text-neutral-300 hover:border-red-500/40 hover:text-red-400 transition-all"
          >
            返回大厅
          </Link>
          <Link
            href={`/game/${params.get('storyId') ?? ''}`}
            className="flex-1 text-center px-4 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-all"
          >
            再玩一次
          </Link>
        </div>
      </div>

      <p className="mt-6 text-[10px] text-neutral-700 font-mono">呜尔呜尔呜 · AI 海龟汤推理游戏</p>
    </div>
  )
}

export default function ResultPage() {
  return (
    <Suspense>
      <ResultContent />
    </Suspense>
  )
}
