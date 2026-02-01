import { NextResponse } from "next/server"
import { spawn, type ChildProcess } from "child_process"
import path from "path"
import fs from "fs"
import http from "http"

export const runtime = "nodejs"

type UnoClassicProcesses = {
  unapy?: ChildProcess
  unoenty?: ChildProcess
  unapyLog?: string
  unoentyLog?: string
}

function readEnvFile(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) return {}
    const raw = fs.readFileSync(filePath, "utf8")
    const lines = String(raw).split(/\r?\n/)
    const out: Record<string, string> = {}
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const normalized = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed
      const eq = normalized.indexOf("=")
      if (eq < 0) continue
      const key = normalized.slice(0, eq).trim()
      const val = normalized.slice(eq + 1).trim()
      if (!key) continue
      out[key] = val
    }
    return out
  } catch {
    return {}
  }
}

function fetchOk(urlString: string, timeoutMs: number) {
  return new Promise<boolean>((resolve) => {
    try {
      const url = new URL(urlString)
      const req = http.request(
        {
          method: "GET",
          hostname: url.hostname,
          port: url.port ? Number(url.port) : 80,
          path: url.pathname + url.search,
          timeout: timeoutMs,
        },
        (res) => {
          res.on("data", () => {})
          res.on("end", () => resolve(res.statusCode != null && res.statusCode >= 200 && res.statusCode < 500))
        },
      )
      req.on("timeout", () => {
        req.destroy()
        resolve(false)
      })
      req.on("error", () => resolve(false))
      req.end()
    } catch {
      resolve(false)
    }
  })
}

async function waitFor(urlString: string, maxMs: number) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    const ok = await fetchOk(urlString, 800)
    if (ok) return true
    await new Promise((r) => setTimeout(r, 300))
  }
  return false
}

function getState(): UnoClassicProcesses {
  const g = globalThis as any
  if (!g.__unoClassicProcs) g.__unoClassicProcs = {} as UnoClassicProcesses
  return g.__unoClassicProcs as UnoClassicProcesses
}

function isRunning(proc: ChildProcess | undefined) {
  return Boolean(proc && proc.exitCode == null && !proc.killed)
}

function cmd(name: string) {
  return process.platform === "win32" ? `${name}.cmd` : name
}

function spawnProc(label: string, cwd: string, command: string, args: string[], env: Record<string, string>) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["pipe", "pipe", "pipe"],
    shell: process.platform === "win32",
  })

  const state = getState()
  const append = (chunk: unknown) => {
    const text = typeof chunk === "string" ? chunk : Buffer.isBuffer(chunk) ? chunk.toString("utf8") : ""
    if (!text) return
    const key = label === "unapy" ? "unapyLog" : "unoentyLog"
    const cur = (state as any)[key] ? String((state as any)[key]) : ""
    const next = (cur + text).slice(-12000)
    ;(state as any)[key] = next
  }
  child.stdout?.on("data", append)
  child.stderr?.on("data", append)

  child.on("exit", () => {
    const state = getState()
    if (label === "unapy" && state.unapy === child) state.unapy = undefined
    if (label === "unoenty" && state.unoenty === child) state.unoenty = undefined
  })
  return child
}

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ ok: false, error: "UNO Classic auto-start is only enabled in development." }, { status: 400 })
  }

  const root = process.cwd()
  const envFromFiles = {
    ...readEnvFile(path.join(root, ".env")),
    ...readEnvFile(path.join(root, ".env.local")),
  }

  const state = getState()
  const unapyCwd = path.join(root, "vendor", "uno-game", "packages", "unapy")
  const unoentyCwd = path.join(root, "vendor", "uno-game", "packages", "unoenty")

  if (!isRunning(state.unapy)) {
    state.unapy = spawnProc("unapy", unapyCwd, cmd("npm"), ["run", "dev"], {
      ...envFromFiles,
      PORT: "5000",
      NODE_ENV: "development",
      STATIC_FILES_BASE_URL: "http://localhost:5000/assets",
    })
  }

  if (!isRunning(state.unoenty)) {
    state.unoenty = spawnProc("unoenty", unoentyCwd, cmd("npm"), ["run", "start"], {
      ...envFromFiles,
      PORT: "4000",
      HOST: "127.0.0.1",
      NODE_ENV: "development",
      REACT_APP_API_URL: "http://localhost:5000",
      BROWSER: "none",
      SKIP_PREFLIGHT_CHECK: "true",
      NODE_OPTIONS: "--openssl-legacy-provider",
    })
  }

  const ready = await waitFor("http://localhost:4000/", 20000)

  return NextResponse.json({
    ok: true,
    running: {
      unapy: isRunning(state.unapy),
      unoenty: isRunning(state.unoenty),
    },
    ready,
    logs: {
      unapy: typeof state.unapyLog === "string" ? state.unapyLog.slice(-12000) : "",
      unoenty: typeof state.unoentyLog === "string" ? state.unoentyLog.slice(-12000) : "",
    },
    urls: {
      game: "http://localhost:4000",
      api: "http://localhost:5000",
    },
  })
}

export async function GET() {
  return POST()
}
