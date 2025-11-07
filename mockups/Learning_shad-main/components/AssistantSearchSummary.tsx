"use client"

import * as React from "react"
import { Search, ChevronDown } from "lucide-react"

type LinkItem = { label: string; href: string }

export function AssistantSearchSummary({
  title,
  links,
}: {
  title: string
  links: LinkItem[]
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="text-xs text-muted-foreground">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-0 py-0"
        aria-expanded={open}
      >
        <div className="flex items-center gap-1.5">
          {open ? (
            <ChevronDown className="h-3 w-3 opacity-70" />
          ) : (
            <Search className="h-3 w-3 opacity-70" />
          )}
          <span>{title}</span>
        </div>
      </button>

      {open && links.length > 0 && (
        <ul className="ml-5 mt-1 space-y-0.5">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}


