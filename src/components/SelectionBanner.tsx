import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { X, Monitor } from 'lucide-react'
import { Button } from './ui/button'

interface FocusedWindowInfo {
    owner_name: string
    window_name: string
    window_id: number
    process_id: number
}

export function SelectionBanner() {
    const [windows, setWindows] = useState<FocusedWindowInfo[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadWindows()
    }, [])

    const loadWindows = async () => {
        try {
            setIsLoading(true)
            const availableWindows = await invoke<FocusedWindowInfo[]>('get_available_windows')
            setWindows(availableWindows)
        } catch (err) {
            console.error('Failed to get windows:', err)
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setIsLoading(false)
        }
    }

    const handleSelectWindow = async (window: FocusedWindowInfo) => {
        try {
            await invoke('arrange_windows', { windowInfo: window })
            await invoke('stop_focus_selection_mode')
        } catch (err) {
            console.error('Failed to arrange windows:', err)
            setError(err instanceof Error ? err.message : String(err))
        }
    }

    const handleCancel = async () => {
        try {
            await invoke('stop_focus_selection_mode')
        } catch (err) {
            console.error('Failed to stop selection mode:', err)
        }
    }

    if (isLoading) {
        return (
            <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-medium">Loading windows...</span>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-4 shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Error: {error}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-white/20"
                        onClick={handleCancel}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg">
            <div className="py-3 px-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        <span className="text-sm font-medium">Select a window to focus</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-white/20"
                        onClick={handleCancel}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                    {windows.map((window) => (
                        <button
                            key={`${window.process_id}-${window.window_id}`}
                            onClick={() => handleSelectWindow(window)}
                            className="flex items-center gap-3 p-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-left"
                        >
                            <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                                <Monitor className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{window.owner_name}</div>
                                {window.window_name && (
                                    <div className="text-xs text-white/70 truncate">{window.window_name}</div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                {windows.length === 0 && (
                    <div className="text-center py-4 text-sm text-white/70">
                        No windows available
                    </div>
                )}
            </div>
        </div>
    )
}
