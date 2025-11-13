"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ChatPanel } from "@/components/ChatPanel"

export default function ChatPage() {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <main className="flex min-h-dvh items-stretch bg-background text-foreground">
      {/* Main content area (left) */}
      <section className="flex-1" />

      {/* Desktop right-side chat panel */}
      <aside className="hidden md:flex md:w-96 md:flex-shrink-0">
        <ChatPanel />
      </aside>

      {/* Mobile toggle button */}
      <div className="md:hidden">
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 rounded-full shadow-lg"
        >
          Chat
        </Button>
      </div>

      {/* Mobile slide-over */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed right-0 top-0 z-50 h-dvh w-96 bg-background shadow-xl">
            <ChatPanel onBack={() => setIsOpen(false)} />
          </div>
        </>
      )}
    </main>
  )
}