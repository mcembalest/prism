import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { DraggableHeader } from './DraggableHeader'
import { Helper } from './helper'
import { SelectionBanner } from './SelectionBanner'
import { listen } from '@tauri-apps/api/event'

export function LighthouseContainer() {
    const [isSelectionMode, setIsSelectionMode] = useState(false)

    useEffect(() => {
        let unlisten: (() => void) | undefined

        const setupListener = async () => {
            // Check initial state
            try {
                const { invoke } = await import('@tauri-apps/api/core')
                const initialMode = await invoke<boolean>('get_focus_selection_mode')
                console.log('[LighthouseContainer] Initial selection mode:', initialMode)
                setIsSelectionMode(initialMode)
            } catch (err) {
                console.error('[LighthouseContainer] Failed to get initial selection mode:', err)
            }

            // Listen for changes
            unlisten = await listen<boolean>('selection-mode-changed', (event) => {
                console.log('[LighthouseContainer] Selection mode changed:', event.payload)
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
        <Card className="h-screen w-full bg-zinc-900 backdrop-blur-xl border-0 shadow-2xl overflow-hidden flex flex-col rounded-2xl p-0">
            {isSelectionMode && <SelectionBanner />}
            <DraggableHeader />
            <Helper />
        </Card>
    )
}
