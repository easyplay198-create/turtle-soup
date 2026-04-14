# 呜尔呜尔呜 · 开发规约 (V4.2)

## 🔐 安全红线 (TOP PRIORITY)
所有 DeepSeek API 调用必须通过 `app/api/` 路由转发。
前端组件禁止引用 `process.env.DEEPSEEK_API_KEY`。
每个 API Route 文件顶部必须写：
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('[SECURITY] Key missing')

## 🏗️ 架构坐标
- Judge 层：`app/api/judge/route.ts`，temperature=0，只输出：是/否/接近/无关
- Host 层：`app/api/host/route.ts`，严禁持有汤底，输出 ≤25 字
- 静态资源：`public/data/vibe_assets.json`，禁改字段名，仅允许追加条目
  - meme_pool 结构：[{ id: string, verdict: "否"|"无关", text: string }]
  - flow_hints 结构：[{ id: string, text: string }]

## 🎤 Host 层 Few-Shot（必须内嵌进 System Prompt）
- 输入"是"   → "哥们你嗅到了！这个方向没问题，继续往下挖🔍"
- 输入"接近" → "臭宝差一口气，感觉到了吗？再推一把！"
- 输入"无关" → "你是来找我聊天的吧？案子在那儿等着呢😏"

## ⚡ 性能逻辑
Judge 返回"否"或"无关" → 从 meme_pool 按 verdict 过滤后随机抽取，禁止调用 Host AI

## 🌊 心流状态
游戏状态用 useState 维护 irrelevantCount: number（不持久化，刷新归零即重开一局）
- "无关" → +1；"是"或"接近" → 归零
- 达到 5 → Host 层强制从 flow_hints[] 抽取渣男话术

## 🏺 EvidenceCard 数据规范
Base64 只编码：{ story_id, rarity, step_count, timestamp }
严禁编码汤底或完整对话历史
稀有度计算（step_count 决定，禁止自行修改阈值）：
  ≤10 → 传说💎 | 11-20 → 史诗🔥 | 21-35 → 稀有⚔️ | >35 → 普通📜

## 🎨 UI 约束
Next.js 14 App Router + Tailwind CSS
深色调 bg-slate-950，金色强调 text-amber-400
严禁引入 Canvas / html-to-image，纯 CSS 实现物证卡片
物证卡掉落动画用 CSS @keyframes，禁止引入第三方动效库

## 📝 代码规范
TypeScript 严格模式，禁止 any
组件 PascalCase，函数 camelCase，类型以 T 开头（如 TStory）
关键逻辑写中文注释
单次生成 ≤200 行，不确定先问，不猜

## 🛡️ MVP 守门
以下功能在 MVP 上线前禁止实现：
弹幕系统 / 玻璃破碎特效 / 用户登录 / 排行榜 / 多人联机

## 🗣️ Cursor 回复格式
1. 一句话说做什么
2. 代码
3. 一句话说下一步
PRD 与技术文档冲突时，以 PRD.md 为准
新建文件前告知文件名和用途，不准偷偷创建
