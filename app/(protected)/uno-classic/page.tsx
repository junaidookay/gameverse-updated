"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const unoClassicUrl = process.env.NEXT_PUBLIC_UNO_CLASSIC_URL ?? "http://localhost:4000"

export default function UnoClassicPage() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [phase, setPhase] = useState<"start" | "playing">("start")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [serverStarting, setServerStarting] = useState(false)
  const [serverReady, setServerReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const setCookie = (key: string, value: string) => {
      const maxAgeSeconds = 60 * 60 * 24 * 14
      document.cookie = `${key}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`
    }

    const run = async () => {
      try {
        const res = await fetch("/api/user/profile", { cache: "no-store" })
        if (!res.ok) return
        const profile = (await res.json()) as any
        if (cancelled) return

        const userId = typeof profile?.id === "string" ? profile.id : ""
        const username = typeof profile?.username === "string" ? profile.username : ""
        const firstName = typeof profile?.first_name === "string" ? profile.first_name : ""
        const lastName = typeof profile?.last_name === "string" ? profile.last_name : ""
        const fullName = `${firstName} ${lastName}`.trim()
        const displayName = username || fullName

        if (userId) setCookie("gv_uid", userId)
        if (displayName) setCookie("gv_name", displayName)
      } catch {}
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const start = async () => {
      try {
        setServerStarting(true)
        const res = await fetch("/api/uno-classic/start", { method: "POST" })
        const data = (await res.json().catch(() => null)) as any
        if (cancelled) return
        setServerReady(Boolean(data?.ready))
      } catch {
        if (cancelled) return
        setServerReady(false)
      } finally {
        if (cancelled) return
        setServerStarting(false)
      }
    }

    start()
    return () => {
      cancelled = true
    }
  }, [])

  const startGame = () => {
    if (phase !== "start") return
    setPhase("playing")
  }

  const canFullscreen = useMemo(() => {
    if (typeof document === "undefined") return false
    return Boolean(document.documentElement.requestFullscreen)
  }, [])

  const enterFullscreen = async () => {
    const el = iframeRef.current
    if (!el) return
    await el.requestFullscreen()
  }

  const exitFullscreen = async () => {
    if (!document.fullscreenElement) return
    await document.exitFullscreen()
  }

  const toggleFullscreen = async () => {
    if (!canFullscreen) return
    if (document.fullscreenElement) {
      await exitFullscreen()
    } else {
      await enterFullscreen()
    }
  }

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  return (
    <div className="min-h-[calc(100svh-4rem)] bg-gradient-to-br from-background via-background to-primary/5 p-3 md:p-8 flex flex-col">
      <div className="max-w-6xl mx-auto flex flex-col gap-4 flex-1 min-h-0 w-full">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold glow-text">UNO (Classic)</h1>
            <p className="text-muted-foreground">Original multiplayer UNO lobby.</p>
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
                <h2 className="text-2xl font-semibold">Ready to play?</h2>
                <p className="text-muted-foreground">
                  {serverStarting ? "Starting UNO Classic..." : serverReady ? "UNO Classic is ready." : "UNO Classic is not ready yet."}
                </p>
                <Button size="lg" className="w-full" onClick={startGame} disabled={!serverReady}>
                  Open Game
                </Button>
              </div>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              title="UNO Classic"
              src={unoClassicUrl}
              className="w-full bg-transparent block"
              style={{ height: "100%", minHeight: 700, display: "block" }}
              allow="autoplay; clipboard-read; clipboard-write"
            />
          )}
        </Card>

        {phase === "playing" && (
          <div className="flex items-center justify-end">
            <Button variant="outline" className="border-border bg-transparent" onClick={toggleFullscreen} disabled={!canFullscreen}>
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
