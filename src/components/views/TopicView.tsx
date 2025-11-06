import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft } from 'lucide-react'
import type { Topic } from '@/types/app-mode'
import type { GuideDefinition } from '@/types/guide'

interface TopicViewProps {
    topic: Topic
    guides: GuideDefinition[]
    onBack: () => void
    onGuideStart: (guideId: string) => void
}

export function TopicView({ topic, guides, onBack, onGuideStart }: TopicViewProps) {
    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-zinc-800/50">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm">Back</span>
                </button>
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{topic.icon}</span>
                    <h1 className="text-2xl font-bold text-white">{topic.name}</h1>
                </div>
                {topic.description && (
                    <p className="text-sm text-zinc-400">{topic.description}</p>
                )}
            </div>

            <ScrollArea className="flex-1 h-0">
                <div className="p-6">
                    <div className="space-y-2">
                        {guides.map(guide => (
                            <button
                                key={guide.id}
                                onClick={() => onGuideStart(guide.id)}
                                className="w-full flex items-center gap-3 p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 transition-all text-left"
                            >
                                <span className="h-2 w-2 rounded-full bg-zinc-600"></span>
                                <span className="text-sm text-zinc-200">{guide.title}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}

