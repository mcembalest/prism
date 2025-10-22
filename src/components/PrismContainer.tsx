import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DraggableHeader } from './DraggableHeader'
import { Helper } from './helper'
import { Learning } from './Learning'
import { SelectionBanner } from './SelectionBanner'
import { listen } from '@tauri-apps/api/event'

export function PrismContainer() {
    const [activeTab, setActiveTab] = useState<'help' | 'learn'>('help')
    const [isSelectionMode, setIsSelectionMode] = useState(false)

    useEffect(() => {
        let unlisten: (() => void) | undefined

        const setupListener = async () => {
            // Check initial state
            try {
                const { invoke } = await import('@tauri-apps/api/core')
                const initialMode = await invoke<boolean>('get_focus_selection_mode')
                console.log('[PrismContainer] Initial selection mode:', initialMode)
                setIsSelectionMode(initialMode)
            } catch (err) {
                console.error('[PrismContainer] Failed to get initial selection mode:', err)
            }

            // Listen for changes
            unlisten = await listen<boolean>('selection-mode-changed', (event) => {
                console.log('[PrismContainer] Selection mode changed:', event.payload)
                setIsSelectionMode(event.payload)
            })
        }

        setupListener()

        return () => {
            if (unlisten) {
                unlisten()
            }
        }
    }, [])

    return (
        <Card className="h-screen w-full bg-gradient-to-br from-zinc-900 to-zinc-950 backdrop-blur-xl border-0 shadow-2xl overflow-hidden flex flex-col rounded-2xl p-0">
            {isSelectionMode && <SelectionBanner />}
            <DraggableHeader />

            <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as 'help' | 'learn')}
                className="flex-1 flex flex-col overflow-hidden"
            >
                <div className="px-4 pt-3 pb-2 bg-zinc-900/80 border-b border-zinc-800/50">
                    <TabsList className="grid w-full grid-cols-2 max-w-xs mx-auto bg-zinc-800/80 border border-zinc-700/50 rounded-xl">
                        <TabsTrigger
                            value="help"
                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg"
                        >
                            Help
                        </TabsTrigger>
                        <TabsTrigger
                            value="learn"
                            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-lg"
                        >
                            Learn
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="help" className="flex-1 flex flex-col overflow-hidden m-0">
                    <Helper />
                </TabsContent>

                <TabsContent value="learn" className="flex-1 flex flex-col overflow-hidden m-0">
                    <Learning />
                </TabsContent>
            </Tabs>
        </Card>
    )
}
