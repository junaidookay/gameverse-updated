import path from "path"
import { readFile } from "fs/promises"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

function contentTypeForPath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === ".svg") return "image/svg+xml"
  if (ext === ".png") return "image/png"
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg"
  if (ext === ".gif") return "image/gif"
  if (ext === ".webp") return "image/webp"
  return "application/octet-stream"
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: parts } = await context.params

  const incoming = (parts || []).filter(Boolean)
  const prefix = incoming[0]

  const baseDir =
    prefix === "client"
      ? path.join(process.cwd(), "vendor", "uno-game", "packages", "unoenty", "src", "assets")
      : prefix === "public"
        ? path.join(process.cwd(), "vendor", "uno-game", "packages", "unoenty", "public")
        : path.join(process.cwd(), "vendor", "uno-game", "packages", "unapy", "src", "Assets")

  const effectiveParts = prefix === "client" || prefix === "public" ? incoming.slice(1) : incoming
  const safeParts = effectiveParts.filter((p) => !p.includes("..") && !p.includes("\\") && !p.includes(":"))
  const candidate = path.join(baseDir, ...safeParts)

  if (!candidate.startsWith(baseDir)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 })
  }

  try {
    const file = await readFile(candidate)
    return new NextResponse(file, {
      headers: {
        "content-type": contentTypeForPath(candidate),
        "cache-control": "public, max-age=2592000, immutable",
      },
    })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
