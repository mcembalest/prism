import * as React from "react"
import { Loader2, Search } from "lucide-react"

type ActivityPhase = "thinking" | "searching"

export function AssistantActivity({ phase }: { phase: ActivityPhase }) {
  return (
    <div className="mb-3 rounded-lg bg-muted/40 px-3 py-3 text-xs text-muted-foreground transition-colors">
      {phase === "thinking" && (
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Thinking…</span>
        </div>
      )}

      {phase === "searching" && (
        <div className="space-y-2 animate-in fade-in-0 duration-300">
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 opacity-70" />
            <span>Searching across pages…</span>
          </div>
          <ul className="ml-6 list-disc space-y-1">
            <li className="opacity-90">Checking recent changes</li>
            <li className="opacity-90">Scanning documentation</li>
            <li className="opacity-90">Summarizing relevant sections</li>
          </ul>
        </div>
      )}
    </div>
  )
}
