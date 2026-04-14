export type TRarity = '传说' | '史诗' | '稀有' | '普通'

export type TDifficulty = '简单' | '中等' | '困难'

export type TStory = {
  id: string
  title: string
  difficulty: TDifficulty
  surface: string
  // [SECURITY] 禁止传给前端，仅限服务端使用
  bottom: string
}

export type TMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type TEvidence = {
  id: string
  storyId: string
  rarity: TRarity
  stepCount: number
  timestamp: number
}

