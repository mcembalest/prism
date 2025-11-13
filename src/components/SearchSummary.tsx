import * as React from "react"
import { Search, ChevronDown, ChevronRight } from "lucide-react"

export function SearchSummary({
  files,
  query,
}: {
  files: string[]
  query?: string
}) {
  const [open, setOpen] = React.useState(false)

  if (files.length === 0) return null

  const displayText = query
    ? `Searched ${query}`
    : `Searched ${files.length} file${files.length === 1 ? '' : 's'}`

  // Helper function to extract filename without path and .md extension
  const getDisplayName = (filePath: string) => {
    const fileName = filePath.split('/').pop() || filePath
    return fileName.replace(/\.md$/, '')
  }

  return (
    <div className="text-xs text-muted-foreground mb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-0 py-1 hover:text-foreground transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-1.5">
          <Search className="h-3 w-3 opacity-70" />
          {open ? (
            <ChevronDown className="h-3 w-3 opacity-70" />
          ) : (
            <ChevronRight className="h-3 w-3 opacity-70" />
          )}
          <span>{displayText}</span>
        </div>
      </button>

      {open && (
        <ul className="ml-6 mt-1 space-y-0.5 text-xs">
          {files.map((file, index) => (
            <li key={index} className="font-mono opacity-70">
              {getDisplayName(file)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
