export type TEvidenceSlot = 'entity' | 'mechanism' | 'motive'

const lowSignalExactQuestions = new Set([
  '是的',
  '对',
  '嗯',
  '没错',
  '好像是',
  '然后呢',
  '为什么',
  '怎么回事',
  '为啥',
  '啥情况',
  '真的吗',
])

export function isValidClue(verdict: string) {
  return verdict.includes('是') || verdict.includes('接近')
}

export function normalizeQuestion(question: string) {
  return question
    .trim()
    .replace(/\s+/g, '')
    .replace(/[？?！!。.,，、]/g, '')
}

export function isLowSignalQuestion(question: string) {
  const q = normalizeQuestion(question)
  if (!q) return true
  if (lowSignalExactQuestions.has(q)) return true
  if (/^(为什么呢|为啥呢|怎么回事呢|然后呢|是吗|对吗)$/.test(q)) return true
  return false
}
