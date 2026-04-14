'use client'
import { stories } from '@/data/stories'
import Link from 'next/link'

/** 难度对应的样式映射 */
const difficultyStyle: Record<string, string> = {
  easy: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  hard: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  简单: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  中等: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  困难: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
}

const difficultyIcon: Record<string, string> = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴',
  简单: '🟢',
  中等: '🟡',
  困难: '🔴',
}

type TDifficultyBucket = 'easy' | 'medium' | 'hard'

const sectionMeta: Record<TDifficultyBucket, { title: string }> = {
  easy: { title: '🟢 入门案件 · EASY' },
  medium: { title: '🟡 进阶案件 · MEDIUM' },
  hard: { title: '🔴 困难案件 · HARD' },
}

function normalizeDifficulty(difficulty: string): TDifficultyBucket | null {
  if (difficulty === 'easy' || difficulty === '简单') return 'easy'
  if (difficulty === 'medium' || difficulty === '中等') return 'medium'
  if (difficulty === 'hard' || difficulty === '困难') return 'hard'
  return null
}

export default function Home() {
  const storiesWithIndex = stories.map((story, idx) => ({ story, idx }))
  const grouped: Record<TDifficultyBucket, typeof storiesWithIndex> = {
    easy: [],
    medium: [],
    hard: [],
  }

  for (const item of storiesWithIndex) {
    const bucket = normalizeDifficulty(item.story.difficulty)
    if (bucket) grouped[bucket].push(item)
  }

  const sectionOrder: TDifficultyBucket[] = ['easy', 'medium', 'hard']

  return (
    <div className="relative min-h-screen bg-neutral-950 text-neutral-200 overflow-hidden">
      {/* ===== 全局背景特效 ===== */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/60 to-transparent animate-scan" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-900/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-950/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />
      </div>

      {/* ===== 顶部标题区 ===== */}
      <header className="relative z-10 border-b border-red-900/20">
        <div className="max-w-5xl mx-auto px-6 py-14 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-blink" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-red-400/70 font-mono">
              案件调查系统 · AI Interrogation System
            </span>
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-blink" style={{ animationDelay: '0.5s' }} />
          </div>

          <h1 className="text-6xl font-black tracking-tighter text-neutral-100">
            呜尔呜尔呜
          </h1>
          <div className="mt-2 h-0.5 w-24 mx-auto bg-gradient-to-r from-transparent via-red-500 to-transparent" />

          <p className="mt-5 text-neutral-500 text-base max-w-lg mx-auto leading-relaxed">
            每一个荒诞故事的背后，都藏着一个令人窒息的真相。
            <br />
            <span className="text-red-400/80">选择案件，开始你的审讯。</span>
          </p>
          <p className="mt-2 text-muted text-sm text-neutral-500/80">
            每一个谜题背后，都藏着一个真相。
          </p>
        </div>
      </header>

      {/* ===== 案件列表 ===== */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-6 bg-red-500 rounded-full" />
          <h2 className="text-lg font-bold text-neutral-300 tracking-wide">
            未结案件
          </h2>
          <span className="text-xs text-neutral-600 font-mono">
            [{stories.length} CASES OPEN]
          </span>
        </div>

        <div className="space-y-12">
          {sectionOrder.map((bucket) => {
            const sectionStories = grouped[bucket]
            if (sectionStories.length === 0) return null

            return (
              <section key={bucket}>
                <div className="mb-5 flex items-center gap-3">
                  <div className="h-5 w-1 rounded-full bg-red-500" />
                  <h3 className="text-base font-bold tracking-wide text-neutral-200">
                    {sectionMeta[bucket].title} [{sectionStories.length} CASES]
                  </h3>
                  {bucket === 'hard' && (
                    <span className="text-xs font-semibold text-rose-300/90">⚠ 仅限高手挑战</span>
                  )}
                </div>

                <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${bucket === 'hard' ? 'lg:grid-cols-2' : 'lg:grid-cols-4'}`}>
                  {sectionStories.map(({ story, idx }) => (
                    <Link
                      key={story.id}
                      href={`/game/${story.id}`}
                      className={`group relative flex flex-col rounded-lg border border-neutral-800/80 bg-neutral-900/70 backdrop-blur-sm overflow-hidden transition-all duration-200 hover:border-red-400/70 hover:shadow-xl hover:shadow-red-500/5 hover:-translate-y-0.5 ${
                        bucket === 'hard' ? 'border-l border-l-rose-500/40' : ''
                      }`}
                    >
                      <div
                        className={`absolute top-0 left-0 right-0 h-0.5 ${
                          bucket === 'hard'
                            ? 'bg-gradient-to-r from-rose-500/30 via-rose-400/70 to-rose-500/30'
                            : 'bg-gradient-to-r from-red-500/0 via-red-500/0 to-red-500/0 group-hover:from-red-500/0 group-hover:via-red-500/80 group-hover:to-red-500/0'
                        } transition-all duration-700`}
                      />

                      <div className={bucket === 'hard' ? 'p-6' : 'p-5'}>
                        <div className="mb-4 flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium ${difficultyStyle[story.difficulty] ?? ''}`}
                          >
                            {difficultyIcon[story.difficulty]} {story.difficulty}
                          </span>
                          <span className="font-mono text-[10px] tracking-wider text-neutral-700">
                            CASE-{String(idx + 1).padStart(3, '0')}
                          </span>
                        </div>

                        <h3 className="text-2xl font-black text-neutral-100 transition-colors duration-300 group-hover:text-red-400">
                          {story.title}
                        </h3>

                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-neutral-500 transition-colors group-hover:text-neutral-400">
                          {story.surface}
                        </p>
                      </div>

                      <div className={`mt-auto flex items-center justify-between border-t border-neutral-800/50 bg-neutral-900/50 ${bucket === 'hard' ? 'px-6 py-4' : 'px-5 py-3'}`}>
                        <span className="font-mono text-xs text-neutral-600 transition-colors group-hover:text-red-400/60">
                          进入案件
                        </span>
                        <svg
                          className="h-4 w-4 text-neutral-700 transition-all duration-300 group-hover:translate-x-1 group-hover:text-red-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </main>

      <footer className="relative z-10 text-center py-10 border-t border-neutral-800/30">
        <p className="text-[11px] text-neutral-700 font-mono tracking-wider">
          呜尔呜尔呜 · AI 海龟汤推理游戏 · v1.0
        </p>
      </footer>

      <style jsx>{`
        @keyframes scan {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        .animate-scan {
          animation: scan 4s ease-in-out infinite;
        }
        .animate-blink {
          animation: blink 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}