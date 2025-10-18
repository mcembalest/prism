import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { BookOpenCheck } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'

export function Learning() {
    const handleOpenSkillGraph = async () => {
        try {
            await invoke('open_skill_graph_viewer')
        } catch (error) {
            console.error('Failed to open skill graph viewer:', error)
        }
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="h-full">
                <div className="p-4 space-y-6">
                    <div className="text-center space-y-3 mb-8">
                        <p className="text-sm text-zinc-400">Guided walkthroughs for learning skills</p>
                    </div>

                    <div className="max-w-md mx-auto mb-4">
                        <Button
                            onClick={handleOpenSkillGraph}
                            className="w-full bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800/70 hover:border-purple-500/50 text-white rounded-xl py-6 transition-all"
                        >
                            <span className="text-base font-semibold">Open Skill Graph Browser</span>
                        </Button>
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}
