import { stories } from '@/data/stories'
import { notFound } from 'next/navigation'
import GameClient from '@/app/_components/GameClient'

export default function GamePage({ params }: { params: { storyId: string } }) {
  const story = stories.find((s) => s.id === params.storyId)

  if (!story) {
    notFound()
  }

  return (
    <GameClient
      storyId={story.id}
      title={story.title}
      surface={story.surface}
      bottom={story.bottom}
    />
  )
}