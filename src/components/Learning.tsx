import { ScrollArea } from '@/components/ui/scroll-area'
import { BookOpen, GraduationCap, Lightbulb } from 'lucide-react'

export function Learning() {
    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="h-full">
                <div className="p-4 space-y-6">
                    <div className="text-center space-y-3 mb-8">
                        
                        <h1 className="text-2xl font-bold text-white">Learn Mode</h1>
                        <p className="text-sm text-zinc-400">Interactive tutorials</p>
                    </div>

                    <div className="grid gap-4 max-w-md mx-auto">
                        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 hover:border-purple-500/30 transition-all">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                                    <BookOpen className="h-5 w-5 text-purple-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-white mb-1">Tutorials</h3>
                                    <p className="text-xs text-zinc-400">Step-by-step guides and interactive lessons</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 hover:border-purple-500/30 transition-all">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                                    <Lightbulb className="h-5 w-5 text-purple-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-white mb-1">Examples</h3>
                                    <p className="text-xs text-zinc-400">Code samples and practical demonstrations</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 hover:border-purple-500/30 transition-all">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                                    <GraduationCap className="h-5 w-5 text-purple-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-white mb-1">Progress</h3>
                                    <p className="text-xs text-zinc-400">Track your learning journey</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}
