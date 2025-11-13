import { useEffect } from 'react'

export interface ToastProps {
    message: string
    type?: 'error' | 'info' | 'success'
    duration?: number
    onDismiss?: () => void
}

/**
 * Toast notification component
 * Displays temporary notifications in the top-right corner
 */
export function Toast({ message, type = 'error', duration = 5000, onDismiss }: ToastProps) {
    useEffect(() => {
        if (duration > 0 && onDismiss) {
            const timer = setTimeout(() => {
                onDismiss()
            }, duration)
            return () => clearTimeout(timer)
        }
    }, [duration, onDismiss])

    const typeStyles = {
        error: 'border-red-500/50 bg-red-900/20',
        info: 'border-zinc-700/50 bg-zinc-900/95',
        success: 'border-green-500/50 bg-green-900/20'
    }

    return (
        <div className="fixed top-8 right-8 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className={`backdrop-blur-xl border rounded-2xl px-6 py-3 shadow-2xl ${typeStyles[type]}`}>
                <div className="flex items-center gap-3">
                    {type === 'error' && (
                        <span className="text-red-400 text-lg">⚠️</span>
                    )}
                    {type === 'success' && (
                        <span className="text-green-400 text-lg">✓</span>
                    )}
                    {type === 'info' && (
                        <span className="text-zinc-400 text-lg">ℹ</span>
                    )}
                    <span className="text-sm text-zinc-300 font-medium">{message}</span>
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="ml-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                            aria-label="Dismiss"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
