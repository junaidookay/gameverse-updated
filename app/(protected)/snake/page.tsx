"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function SnakePage() {
  const [phase, setPhase] = useState<"start" | "loading" | "playing">("start")
  const [srcDoc, setSrcDoc] = useState<string>("")

  const startGame = async () => {
    if (phase !== "start") return
    setPhase("loading")
    try {
      const res = await fetch("/api/snake", { method: "GET" })
      if (!res.ok) {
        setPhase("start")
        return
      }
      const html = await res.text()
      setSrcDoc(html)
      setPhase("playing")
    } catch {
      setPhase("start")
    }
  }

  return (
    <div className="min-h-[calc(100svh-4rem)] bg-gradient-to-br from-background via-background to-primary/5 p-3 md:p-8 flex flex-col">
      <div className="max-w-6xl mx-auto flex flex-col gap-4 flex-1 min-h-0 w-full">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold glow-text">Snake</h1>
            <p className="text-muted-foreground">Eat, grow, and avoid hitting yourself.</p>
          </div>
          <Link href="/games">
            <Button variant="outline" className="border-border bg-transparent">
              Back to Games
            </Button>
          </Link>
        </div>

        <Card className="bg-card/50 border-border/50 backdrop-blur overflow-hidden flex-1 min-h-[560px]">
          {phase === "start" ? (
            <div className="h-full min-h-[560px] flex items-center justify-center p-6">
              <div className="w-full max-w-md text-center space-y-4">
                <h2 className="text-2xl font-semibold">Ready?</h2>
                <p className="text-muted-foreground">Use arrow keys to move. Press R to reset.</p>
                <Button size="lg" className="w-full" onClick={startGame}>
                  Start Game
                </Button>
              </div>
            </div>
          ) : phase === "loading" ? (
            <div className="h-full min-h-[560px] flex items-center justify-center p-10 text-center text-muted-foreground">
              Loading Snake…
            </div>
          ) : (
            <iframe
              title="Snake"
              srcDoc={srcDoc}
              className="w-full bg-transparent block"
              style={{ height: "100%", minHeight: 560, display: "block" }}
              sandbox="allow-scripts"
            />
          )}
        </Card>
      </div>
    </div>
  )
}
