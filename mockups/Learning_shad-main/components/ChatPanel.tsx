"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, ArrowUp, Play, Command, CornerDownLeft, CheckCircle2 } from "lucide-react"
import { AssistantActivity } from "@/components/AssistantActivity"
import { AssistantSearchSummary } from "@/components/AssistantSearchSummary"

type LinkItem = { label: string; href: string }

type Message = {
  id: number
  role: "user" | "assistant"
  kind?: "text" | "searchSummary" | "guideStep" | "guideComplete"
  content?: string
  title?: string
  links?: LinkItem[]
}

// In-panel content definitions
type Topic = { id: string; label: string; prompt: string }
type Folder = { id: string; title: string; topics: Topic[] }
type Guide = { id: string; title: string; steps: string[] }

const folders: Folder[] = [
  {
    id: "examples",
    title: "See example projects",
    topics: [
      { id: "next-blog", label: "Next.js Blog", prompt: "Show me a simple Next.js blog example and how to set it up." },
      { id: "todo-app", label: "Todo App", prompt: "Walk me through building a basic todo app with React and TypeScript." },
    ],
  },
  {
    id: "homepage",
    title: "Editing Homepage",
    topics: [
      { id: "hero-copy", label: "Edit hero copy", prompt: "How do I edit the homepage hero text and subheading?" },
      { id: "hero-cta", label: "Change hero CTA", prompt: "Change the hero section button text and target route." },
    ],
  },
  {
    id: "profiles",
    title: "Editing Profiles",
    topics: [
      { id: "profile-fields", label: "Add fields", prompt: "Add a new field (bio) to the profile and display it." },
      { id: "avatar", label: "Update avatar", prompt: "Update the avatar component to support fallback initials." },
    ],
  },
  {
    id: "administrative",
    title: "Administrative",
    topics: [
      { id: "roles", label: "Manage roles", prompt: "Outline a role-based access control approach for this app." },
      { id: "env", label: "Configure env", prompt: "Set up environment variables for local and production securely." },
    ],
  },
]

const guides: Record<string, Guide> = {
  "getting-started": {
    id: "getting-started",
    title: "Getting started",
    steps: [
      "Step 1: Install dependencies (ensure pnpm is installed).",
      "Step 2: Run the dev server and verify the UI loads.",
      "Step 3: Make a small UI change and confirm hot reload.",
      "Step 4: Commit changes following conventional commits.",
    ],
  },
}

const initialMessages: Message[] = []

export function ChatPanel({ onBack }: { onBack?: () => void } = {}) {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages)
  const [input, setInput] = React.useState("")
  const streamIntervals = React.useRef<Record<number, number>>({})
  const isEmpty = messages.length === 0
  type Phase = "idle" | "thinking" | "searching" | "responding"
  const [phase, setPhase] = React.useState<Phase>("idle")
  const phaseTimers = React.useRef<number[]>([])
  const lastRole = messages.length ? messages[messages.length - 1].role : undefined
  const [panelView, setPanelView] = React.useState<"landing" | "folder">("landing")
  const [currentFolderId, setCurrentFolderId] = React.useState<string | undefined>(undefined)
  const [activeGuide, setActiveGuide] = React.useState<{ id: string; stepIndex: number } | undefined>(undefined)

  React.useEffect(() => {
    return () => {
      Object.values(streamIntervals.current).forEach((id) => window.clearInterval(id))
      streamIntervals.current = {}
      phaseTimers.current.forEach((id) => window.clearTimeout(id))
      phaseTimers.current = []
    }
  }, [])

  function streamAssistantMessage(messageId: number, fullText: string) {
    const tokens = fullText.split(" ")
    let i = 0
    const intervalId = window.setInterval(() => {
      i += 1
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: tokens.slice(0, i).join(" ") } : m))
      )
      if (i >= tokens.length) {
        window.clearInterval(intervalId)
        delete streamIntervals.current[messageId]
        setPhase("idle")
      }
    }, 25)
    streamIntervals.current[messageId] = intervalId
  }

  function getMockLinksForQuery(query: string): LinkItem[] {
    const q = query.toLowerCase()
    if (q.includes("getting started") || q.includes("setup") || q.includes("installation")) {
      return [
        { label: "E2B CLI", href: "https://docs.e2b.dev/cli" },
        { label: "Quickstart", href: "https://docs.e2b.dev/quickstart" },
        { label: "Overview", href: "https://docs.e2b.dev/" },
        { label: "Sandbox templates", href: "https://docs.e2b.dev/templates" },
      ]
    }
    return [
      { label: "Guide: Concepts", href: "https://example.com/concepts" },
      { label: "API Reference", href: "https://example.com/api" },
      { label: "How it works", href: "https://example.com/how-it-works" },
    ]
  }

  function handleBack() {
    // cancel streaming intervals and phase timers
    Object.values(streamIntervals.current).forEach((id) => window.clearInterval(id))
    streamIntervals.current = {}
    phaseTimers.current.forEach((id) => window.clearTimeout(id))
    phaseTimers.current = []

    // reset chat state to landing view
    setMessages([])
    setInput("")
    setPhase("idle")
    setPanelView("landing")
    setCurrentFolderId(undefined)
    setActiveGuide(undefined)

    // delegate to parent if provided (e.g., close mobile overlay)
    if (onBack) onBack()
  }

  function openFolder(folderId: string) {
    setPanelView("folder")
    setCurrentFolderId(folderId)
  }

  function closeFolder() {
    setPanelView("landing")
    setCurrentFolderId(undefined)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return

    startChatFlow(trimmed)
    setInput("")
  }

  function startChatFlow(userText: string) {
    // cancel any pending timers
    phaseTimers.current.forEach((id) => window.clearTimeout(id))
    phaseTimers.current = []

    const now = Date.now()
    const userMessage: Message = { id: now, role: "user", content: userText }
    setMessages((prev) => [...prev, userMessage])
    setPhase("thinking")

    const t1 = window.setTimeout(() => setPhase("searching"), 1200)
    const t2 = window.setTimeout(() => {
      setPhase("responding")
      const summary: Message = {
        id: now + 1,
        role: "assistant",
        kind: "searchSummary",
        title: `Searched ${userText}`,
        links: getMockLinksForQuery(userText),
      }
      const assistantDraft: Message = { id: now + 2, role: "assistant", kind: "text", content: "" }
      setMessages((prev) => [...prev, summary, assistantDraft])
      const replyText =
        "Thanks — I’m thinking this through. I’ll outline the steps, call out any missing data, and suggest concrete next actions so you can proceed quickly."
      streamAssistantMessage(assistantDraft.id, replyText)
    }, 2400)
    phaseTimers.current.push(t1, t2)
  }

  function sendTopic(prompt: string) {
    startChatFlow(prompt)
  }

  function appendAssistantText(text: string) {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setMessages((prev) => [...prev, { id, role: "assistant", kind: "text", content: text }])
  }

  function startGuide(guideId: string) {
    const guide = guides[guideId]
    if (!guide) return
    setPanelView("landing")
    setCurrentFolderId(undefined)
    setActiveGuide({ id: guideId, stepIndex: 0 })
    appendAssistantText(`I'll help you with ${guide.title}.`)
    const draft: Message = { id: Date.now() + 1, role: "assistant", kind: "guideStep", content: "" }
    setMessages((prev) => [...prev, draft])
    streamAssistantMessage(draft.id, guide.steps[0])
  }

  function advanceGuide() {
    if (!activeGuide) return
    const guide = guides[activeGuide.id]
    if (!guide) return
    const nextIndex = activeGuide.stepIndex + 1
    if (nextIndex < guide.steps.length) {
      setActiveGuide({ id: activeGuide.id, stepIndex: nextIndex })
      const draft: Message = { id: Date.now() + 1, role: "assistant", kind: "guideStep", content: "" }
      setMessages((prev) => [...prev, draft])
      streamAssistantMessage(draft.id, guide.steps[nextIndex])
    } else {
      const id = Date.now() + 1
      setMessages((prev) => [
        ...prev,
        { id, role: "assistant", kind: "guideComplete", content: "Done, good job!" },
      ])
      setActiveGuide(undefined)
    }
  }

  // Render both roles with distinct alignment and styles

  return (
    <section className="flex h-full w-full flex-col justify-between border-l border-border bg-background">
      {/* Header */}
      {/* Landing vs chat layout container */}
      <div className={isEmpty ? "grid flex-1 place-items-center transition-all duration-300" : "flex flex-1 flex-col transition-all duration-300"}>
        {isEmpty ? (
          <div className="w-full">
            <div className="px-4 py-6 md:py-8 transition-all duration-300">
              <h2 className="text-center text-2xl font-semibold md:text-3xl">
                {panelView === "folder"
                  ? (folders.find((f) => f.id === currentFolderId)?.title || "")
                  : "What can I help with?"}
              </h2>
              {panelView === "landing" && (
                <p className="mt-2 text-center text-sm text-muted-foreground md:text-base">Type a question or choose from existing guides</p>
              )}
            </div>
            <div className="px-6 pb-6 md:pb-8">
              {panelView === "landing" && (
                <>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Suggested for you</div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-full border-0 bg-muted/70 px-3 py-1.5 text-xs text-foreground shadow-none transition-colors hover:bg-muted"
                      onClick={() => openFolder("examples")}
                    >
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-foreground/60" />
                      See example projects
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-full border-0 bg-muted/70 px-3 py-1.5 text-xs text-foreground shadow-none transition-colors hover:bg-muted"
                      onClick={() => startGuide("getting-started")}
                    >
                      <Play className="mr-1.5 h-3 w-3 opacity-70" />
                      Getting started
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-full border-0 bg-muted/70 px-3 py-1.5 text-xs text-foreground shadow-none transition-colors hover:bg-muted"
                      onClick={() => openFolder("homepage")}
                    >
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-foreground/60" />
                      Editing Homepage
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-full border-0 bg-muted/70 px-3 py-1.5 text-xs text-foreground shadow-none transition-colors hover:bg-muted"
                      onClick={() => openFolder("profiles")}
                    >
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-foreground/60" />
                      Editing Profiles
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-full border-0 bg-muted/70 px-3 py-1.5 text-xs text-foreground shadow-none transition-colors hover:bg-muted"
                      onClick={() => openFolder("administrative")}
                    >
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-foreground/60" />
                      Administrative
                    </Button>
                  </div>
                </>
              )}

              {panelView === "folder" && (
                <>
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={closeFolder}
                      aria-label="Back to suggestions"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="uppercase tracking-wide">Topics</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {folders.find((f) => f.id === currentFolderId)?.topics.map((topic) => (
                      <Button
                        key={topic.id}
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="justify-start rounded-md border-0 bg-muted/70 px-3 py-1.5 text-xs text-foreground shadow-none transition-colors hover:bg-muted"
                        onClick={() => sendTopic(topic.prompt)}
                      >
                        {topic.label}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Chat top bar with back button */}
            <div className="flex items-center gap-1 px-2 py-2">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleBack}
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {/* <div className="flex-1 text-center text-sm font-medium text-muted-foreground">Assistant</div> */}
              {/* right spacer to balance the icon for centered title */}
              <div className="w-8" />
            </div>
            {/* Messages */}
            <div className="flex min-h-0 flex-1 flex-col">
              <ScrollArea className="h-full px-4 py-3 pr-5">
                <div className="flex flex-col gap-2">
                  {messages.map((message, index) => {
                    const isUser = message.role === "user"
                    const previousRole = index > 0 ? messages[index - 1].role : undefined
                    const isRoleChange = previousRole !== undefined && previousRole !== message.role
                    if (isUser) {
                      return (
                        <div key={message.id} className={`flex justify-end ${isRoleChange ? "mt-3" : ""}`}>
                          <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                            {message.content}
                          </div>
                        </div>
                      )
                    }
                    // assistant-side message
                    if (message.kind === "searchSummary") {
                      // minimal, unshaded summary row
                      return (
                        <div key={message.id} className={`px-1 ${isRoleChange ? "mt-3" : ""}`}>
                          <AssistantSearchSummary title={message.title ?? "Search results"} links={message.links ?? []} />
                        </div>
                      )
                    }
                    if (message.kind === "guideComplete") {
                      return (
                        <div key={message.id} className={`${isRoleChange ? "mt-3" : ""}`}>
                          <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-3 py-2 text-sm leading-7">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            <span className="font-medium">{message.content}</span>
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div key={message.id} className={`px-1 ${isRoleChange ? "mt-3" : ""}`}>
                        <div className="whitespace-pre-wrap text-sm leading-7">
                          {(() => {
                            const text = message.content || ""
                            if (message.kind === "guideStep") {
                              const m = text.match(/^(Step\s+\d+:)([\s\S]*)/)
                              if (m) {
                                return (
                                  <>
                                    <strong>{m[1]}</strong>
                                    {m[2]}
                                  </>
                                )
                              }
                            }
                            return text || <span className="opacity-70">Thinking…</span>
                          })()}
                        </div>
                      </div>
                    )
                  })}
                  {activeGuide && (
                    <div className="mt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 rounded-md px-2 text-xs gap-0.5"
                        onClick={advanceGuide}
                      >
                        <span>Next</span>
                        <span className="flex items-center">
                          <Command className="h-0.5 w-0.5 opacity-80" />
                          <CornerDownLeft className="-ml-0.5 h-0.5 w-0.5 opacity-80" />
                        </span>
                      </Button>
                    </div>
                  )}
                  {(phase === "thinking" || phase === "searching") && (
                    <div className={lastRole === "user" ? "mt-3" : ""}>
                      <AssistantActivity phase={phase === "thinking" ? "thinking" : "searching"} />
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </div>

      {/* Composer */}
      <div className="px-3 py-3">
        <form onSubmit={handleSubmit} className="w-full">
          <div className="flex w-full items-center gap-2 rounded-3xl border border-border bg-background px-3 py-2">
            <Input
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  if (activeGuide) {
                    e.preventDefault()
                    advanceGuide()
                  }
                }
              }}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              className="h-8 w-8 rounded-full"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </section>
  )
}


