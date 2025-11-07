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
            {/* Header */}
            <div className="px-8 pt-12 pb-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
                >
                    <ArrowLeft className="h-3 w-3" />
                    <span className="uppercase tracking-wide">Back</span>
                </button>
                <h1 className="text-3xl font-bold text-foreground">{topic.name}</h1>
            </div>

            {/* Guide list */}
            <ScrollArea className="flex-1 h-0">
                <div className="px-8 pb-6">
                    <div className="space-y-2">
                        {guides.map(guide => (
                            <button
                                key={guide.id}
                                onClick={() => onGuideStart(guide.id)}
                                className="w-full p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left"
                            >
                                <span className="text-sm text-foreground">{guide.title}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}

