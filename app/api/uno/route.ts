import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

type UnoOutcome = "win" | "loss"

type AchievementDefinition = {
  title: string
  description: string
  badge_icon: string
}

const ACHIEVEMENTS: AchievementDefinition[] = [
  { title: "First Win", description: "Win your first game", badge_icon: "🏆" },
  { title: "Hot Streak", description: "10-win streak", badge_icon: "🔥" },
  { title: "Top 10", description: "Rank in top 10", badge_icon: "🏅" },
  { title: "Star Player", description: "100 wins", badge_icon: "🌟" },
]

function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  return createSupabaseClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

async function ensureAchievementRows(
  session: Awaited<ReturnType<typeof createClient>>,
  admin: ReturnType<typeof createAdminClient>,
) {
  const titles = ACHIEVEMENTS.map((a) => a.title)
  const { data: existing } = await (admin || session).from("achievements").select("id, title").in("title", titles)
  const existingTitles = new Set<string>((existing || []).map((r: any) => r.title).filter(Boolean))
  const missing = ACHIEVEMENTS.filter((a) => !existingTitles.has(a.title))
  if (missing.length > 0 && admin) {
    await admin.from("achievements").insert(missing)
  }
  const { data: all } = await (admin || session).from("achievements").select("id, title").in("title", titles)
  return (all || []) as { id: string; title: string }[]
}

async function maybeUnlockAchievements(
  session: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  stats: { points: number; total_wins: number; total_losses: number; win_streak: number },
) {
  const admin = createAdminClient()
  const rows = await ensureAchievementRows(session, admin)

  const { data: top10Rows } = await (admin || session)
    .from("user_stats")
    .select("user_id")
    .order("points", { ascending: false })
    .limit(10)

  const top10Set = new Set<string>((top10Rows || []).map((r: any) => r.user_id).filter(Boolean))

  const shouldUnlock = new Set<string>()
  if (stats.total_wins >= 1) shouldUnlock.add("First Win")
  if (stats.win_streak >= 10) shouldUnlock.add("Hot Streak")
  if (top10Set.has(userId)) shouldUnlock.add("Top 10")
  if (stats.total_wins >= 100) shouldUnlock.add("Star Player")

  const byTitle = new Map<string, { id: string; title: string }>(rows.map((r) => [r.title, r]))
  const toUpsert = Array.from(shouldUnlock)
    .map((title) => byTitle.get(title))
    .filter(Boolean)
    .map((a) => ({ user_id: userId, achievement_id: (a as any).id, unlocked_at: new Date().toISOString() }))

  if (toUpsert.length > 0) {
    await (admin || session)
      .from("user_achievements")
      .upsert(toUpsert as any[], { onConflict: "user_id,achievement_id", ignoreDuplicates: true })
  }
}

function clampPoints(value: unknown) {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(500, Math.floor(n)))
}

function buildSrcDoc(playerName: string, socketOrigin: string) {
  const css = `
    html, body { height: 100%; margin: 0; }
    body {
      background: radial-gradient(1200px 600px at 20% 10%, rgba(88,86,214,0.22), transparent 55%),
                  radial-gradient(1000px 520px at 85% 15%, rgba(167,107,207,0.18), transparent 60%),
                  radial-gradient(1000px 520px at 50% 85%, rgba(239,68,68,0.10), transparent 60%),
                  linear-gradient(rgba(7,10,18,0.78), rgba(7,10,18,0.88)),
                  url('/api/uno/assets/public/uno-wallpaper.png');
      background-size: cover;
      background-position: center;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
      color: rgba(255,255,255,0.92);
      overflow: hidden;
    }
    * { box-sizing: border-box; }
    button { font-family: inherit; }
    input { font-family: inherit; }
    .wrap {
      height: 100%;
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 12px;
      padding: 14px;
      max-width: 1100px;
      margin: 0 auto;
    }
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.18);
      backdrop-filter: blur(10px);
    }
    .title {
      display: flex;
      align-items: baseline;
      gap: 10px;
      font-weight: 800;
      letter-spacing: -0.02em;
      font-size: 18px;
    }
    .subtitle {
      font-size: 12px;
      opacity: 0.75;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.06);
      font-size: 12px;
      font-weight: 700;
    }
    .dot { width: 10px; height: 10px; border-radius: 999px; }
    .main {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 12px;
      min-height: 0;
    }
    .panel {
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.18);
      backdrop-filter: blur(10px);
      padding: 14px;
      min-height: 0;
    }
    .panel h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      letter-spacing: -0.01em;
    }
    .stats {
      display: grid;
      gap: 10px;
    }
    .stat {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      padding: 10px 12px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(255,255,255,0.04);
    }
    .stat span { opacity: 0.82; }
    .stat b { font-size: 15px; }
    .topcard {
      width: 100%;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.12);
      overflow: hidden;
      background: rgba(255,255,255,0.04);
    }
    .cardFace {
      height: 150px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.16);
      box-shadow: 0 18px 60px rgba(0,0,0,0.35);
      user-select: none;
      align-items: center;
      justify-content: center;
    }
    .actions { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
    .btn {
      cursor: pointer;
      padding: 10px 12px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.16);
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.92);
      font-weight: 800;
      font-size: 13px;
      transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
    }
    .btn:hover { transform: translateY(-1px); background: rgba(255,255,255,0.10); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .handWrap {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .handHeader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }
    .handHeader h3 { margin: 0; }
    .hand {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      overflow: auto;
      padding-right: 6px;
      padding-bottom: 6px;
      min-height: 0;
    }
    .miniCard {
      width: 96px;
      height: 138px;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.18);
      box-shadow: 0 18px 60px rgba(0,0,0,0.35);
      padding: 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      cursor: pointer;
      transition: transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
      user-select: none;
      align-items: center;
      justify-content: center;
    }
    .miniCard:hover { transform: translateY(-2px); }
    .miniCard[data-playable="false"] { opacity: 0.6; }
    .miniCard[data-disabled="true"] { opacity: 0.45; cursor: not-allowed; transform: none; }
    .cardImg { width: 100%; height: 100%; object-fit: contain; }
    .miniImg { width: 100%; height: 100%; object-fit: contain; }
    .red { background: rgba(239,68,68,0.08); }
    .green { background: rgba(34,197,94,0.08); }
    .blue { background: rgba(59,130,246,0.08); }
    .yellow { background: rgba(250,204,21,0.08); }
    .wild { background: rgba(148,163,184,0.08); }
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.70);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .modal {
      width: min(520px, 100%);
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(0,0,0,0.32);
      backdrop-filter: blur(12px);
      padding: 14px;
      box-shadow: 0 24px 100px rgba(0,0,0,0.55);
    }
    .modal h2 { margin: 0; font-size: 18px; letter-spacing: -0.02em; }
    .modal p { margin: 8px 0 0 0; opacity: 0.82; font-size: 13px; }
    .modalActions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
    .colorBtn { border-radius: 14px; border: 1px solid rgba(255,255,255,0.12); padding: 12px; font-weight: 900; cursor: pointer; }
    .colorBtn.red { color: white; }
    .colorBtn.green { color: white; }
    .colorBtn.blue { color: white; }
    .colorBtn.yellow { color: rgba(0,0,0,0.86); }
    @media (max-width: 900px) {
      .main { grid-template-columns: 1fr; }
    }
    .shell {
      height: 100%;
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 18px;
      padding: 18px;
    }
    @media (max-width: 980px) {
      .shell {
        grid-template-columns: 1fr;
        padding: 12px;
      }
    }
    .sidebar {
      border-radius: 22px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.26);
      backdrop-filter: blur(10px);
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      min-height: 0;
    }
    .profileRow { display: flex; gap: 12px; align-items: center; }
    .avatarCircle {
      width: 52px;
      height: 52px;
      border-radius: 999px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.14);
      display: grid;
      place-items: center;
      font-weight: 900;
      font-size: 20px;
    }
    .profileName { font-weight: 900; font-size: 16px; }
    .navTitle { opacity: 0.6; font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
    .navItem {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 12px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(255,255,255,0.04);
      color: rgba(255,255,255,0.92);
      font-weight: 800;
      cursor: default;
    }
    .sidebarSpacer { flex: 1; }
    .leaveBtn {
      cursor: pointer;
      padding: 12px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(239,68,68,0.14);
      color: rgba(255,255,255,0.92);
      font-weight: 900;
    }
    .content {
      min-height: 0;
    }
    .lobby {
      border-radius: 22px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.26);
      backdrop-filter: blur(10px);
      padding: 18px;
      min-height: 0;
    }
    .lobbyHeader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }
    .lobbyHeader h1 { margin: 0; font-size: 38px; letter-spacing: -0.03em; }
    .primaryBtn {
      cursor: pointer;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.16);
      background: rgba(99,102,241,0.18);
      color: rgba(255,255,255,0.96);
      font-weight: 900;
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .joinRow {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .joinInput {
      flex: 1;
      min-width: 200px;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.92);
      font-weight: 800;
      outline: none;
    }
    .joinBtn {
      cursor: pointer;
      padding: 12px 18px;
      border-radius: 14px;
      border: 1px solid rgba(0,0,0,0.35);
      background: rgba(250,204,21,0.92);
      color: rgba(0,0,0,0.88);
      font-weight: 900;
    }
    .roomsGrid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }
    @media (max-width: 1100px) { .roomsGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 680px) { .roomsGrid { grid-template-columns: 1fr; } }
    .roomCard {
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.04);
      padding: 16px;
      min-height: 120px;
      display: grid;
      gap: 10px;
    }
    .roomCardTop { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
    .roomName { font-weight: 900; font-size: 18px; letter-spacing: -0.02em; }
    .roomMeta { opacity: 0.62; font-weight: 800; font-size: 12px; }
    .roomBottom { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .roomSlots { opacity: 0.72; font-weight: 800; font-size: 12px; }
    .roomJoinBtn {
      cursor: pointer;
      padding: 10px 16px;
      border-radius: 14px;
      border: 1px solid rgba(0,0,0,0.35);
      background: rgba(250,204,21,0.92);
      color: rgba(0,0,0,0.88);
      font-weight: 900;
    }
    #tableView { display: none; }
  `.trim()

  const js = `
    const PLAYER_NAME = ${JSON.stringify(playerName)}
    const SOCKET_ORIGIN_FROM_SERVER = ${JSON.stringify(socketOrigin)}

    const resolveSocketOrigin = () => {
      const normalize = (value) => {
        if (typeof value !== 'string') return ''
        const trimmed = value.trim()
        if (!trimmed || trimmed === 'null') return ''
        return trimmed.replace(/\\/+$/, '')
      }

      const normalizeOrigin = (candidate) => {
        const c = normalize(candidate)
        if (!/^https?:\\/\\//.test(c)) return ''
        try {
          const u = new URL(c)
          if (u.hostname === '0.0.0.0' || u.hostname === '::' || u.hostname === '[::]') {
            u.hostname = 'localhost'
          }
          return u.origin
        } catch {
          return c
        }
      }

      const candidates = []
      candidates.push(normalize(SOCKET_ORIGIN_FROM_SERVER))
      try { candidates.push(normalize(window.parent && window.parent.location && window.parent.location.origin)) } catch {}
      try { candidates.push(normalize(document.referrer ? new URL(document.referrer).origin : '')) } catch {}
      candidates.push(normalize(window.location && window.location.origin))

      for (const candidate of candidates) {
        const origin = normalizeOrigin(candidate)
        if (origin) return origin
      }

      return normalizeOrigin(SOCKET_ORIGIN_FROM_SERVER) || normalize(SOCKET_ORIGIN_FROM_SERVER)
    }

    const SOCKET_ORIGIN = resolveSocketOrigin()

    const post = (payload) => {
      try { window.parent.postMessage({ source: 'gameverse_uno', ...payload }, '*') } catch {}
    }

    const COLORS = ['red','yellow','green','blue']
    const isDigit = (t) => typeof t === 'string' && /^[0-9]$/.test(t)

    const cardLabel = (card) => {
      if (!card) return ''
      if (isDigit(card.type)) return String(card.type)
      if (card.type === 'block') return 'SKIP'
      if (card.type === 'reverse') return 'REV'
      if (card.type === 'buy-2') return '+2'
      if (card.type === 'change-color') return 'WILD'
      if (card.type === 'buy-4') return '+4'
      return String(card.type || '')
    }

    const isPlayable = (card, top, activeColor) => {
      if (!card || !top) return false
      if (card.type === 'change-color' || card.type === 'buy-4') return true
      if (card.color === activeColor) return true
      if (card.type && top.type && card.type === top.type) return true
      return false
    }

    const cardImgSrc = (card) => {
      try {
        const type = String(card.type || '')
        const color = String(card.color || '')
        if (!type) return ''
        if (type === 'buy-4' || type === 'change-color') return '/api/uno/assets/cards/' + type + '/black.svg'
        if (!color) return ''
        return '/api/uno/assets/cards/' + type + '/' + color + '.svg'
      } catch {
        return ''
      }
    }

    const state = {
      connected: false,
      joined: false,
      roomId: '',
      meId: '',
      view: null,
      rooms: [],
      wildPending: null,
      reported: false,
      lastError: null
    }

    const el = {
      lobbyView: document.getElementById('lobbyView'),
      tableView: document.getElementById('tableView'),
      profileLetter: document.getElementById('profileLetter'),
      profileName: document.getElementById('profileName'),
      statusLobby: document.getElementById('statusLobby'),
      roomsGrid: document.getElementById('roomsGrid'),
      roomInputLobby: document.getElementById('roomInputLobby'),
      btnJoinLobby: document.getElementById('btnJoinLobby'),
      btnCreateRoom: document.getElementById('btnCreateRoom'),
      btnLeave: document.getElementById('btnLeave'),
      status: document.getElementById('status'),
      activeDot: document.getElementById('activeDot'),
      activeText: document.getElementById('activeText'),
      drawCount: document.getElementById('drawCount'),
      opponentCount: document.getElementById('opponentCount'),
      topCard: document.getElementById('topCard'),
      hand: document.getElementById('hand'),
      btnDraw: document.getElementById('btnDraw'),
      btnNew: document.getElementById('btnNew'),
      btnJoin: document.getElementById('btnJoin'),
      btnStart: document.getElementById('btnStart'),
      roomInput: document.getElementById('roomInput'),
      roomPill: document.getElementById('roomPill'),
      namePill: document.getElementById('namePill'),
      opponentPill: document.getElementById('opponentPill'),
      wildOverlay: document.getElementById('wildOverlay'),
      endOverlay: document.getElementById('endOverlay'),
      endTitle: document.getElementById('endTitle'),
      endText: document.getElementById('endText'),
      btnAgain: document.getElementById('btnAgain'),
    }

    let socket = null

    const ensureSocketServer = async () => {
      await new Promise((resolve) => {
        try {
          const img = new Image()
          img.onload = resolve
          img.onerror = resolve
          img.src = SOCKET_ORIGIN + '/api/uno/socket?warmup=' + Date.now()
        } catch {
          resolve()
        }
      })
    }

    const connectSocket = async () => {
      if (!window.io) return null
      await ensureSocketServer()
      return window.io(SOCKET_ORIGIN, {
        path: '/api/uno/socket',
        transports: ['websocket', 'polling'],
      })
    }

    const setStatus = (text) => {
      if (el.status) el.status.textContent = text || ''
      if (el.statusLobby) el.statusLobby.textContent = text || ''
    }

    const renderRooms = () => {
      if (!el.roomsGrid) return
      el.roomsGrid.innerHTML = ''
      const rooms = Array.isArray(state.rooms) ? state.rooms : []
      if (rooms.length === 0) {
        const empty = document.createElement('div')
        empty.className = 'roomCard'
        empty.innerHTML = '<div class="roomName">No active rooms</div><div class="roomMeta">Create a new game to start playing.</div>'
        el.roomsGrid.appendChild(empty)
        return
      }

      for (const room of rooms) {
        const roomId = room && room.roomId ? String(room.roomId) : ''
        const playersCount = room && typeof room.playersCount === 'number' ? room.playersCount : 0
        const started = !!(room && room.started)
        const over = !!(room && room.over)
        if (!roomId) continue

        const card = document.createElement('div')
        card.className = 'roomCard'
        const title = started ? 'In progress' : (over ? 'Ended' : 'Waiting')
        card.innerHTML =
          '<div class="roomCardTop">' +
            '<div class="roomName">' + roomId + '</div>' +
            '<div class="roomMeta">' + title + '</div>' +
          '</div>' +
          '<div class="roomBottom">' +
            '<div class="roomSlots">' + playersCount + '/2 players</div>' +
            '<button class="roomJoinBtn" type="button">JOIN</button>' +
          '</div>'

        const btn = card.querySelector('button')
        if (btn) {
          btn.addEventListener('click', () => {
            if (!socket) return
            state.lastError = null
            socket.emit('room:join', { roomId, playerName: PLAYER_NAME })
            render()
          })
        }
        el.roomsGrid.appendChild(card)
      }
    }

    const render = () => {
      const view = state.view
      const top = view ? view.topCard : null
      const activeColor = view ? view.activeColor : 'red'
      const myTurn = !!view && view.turnId === view.meId && !view.over

      if (!window.io) {
        setStatus('Socket client failed to load')
      } else if (!socket) {
        setStatus('Connecting…')
      } else if (!state.connected) {
        setStatus(state.lastError ? String(state.lastError) : 'Connecting…')
      } else if (!state.joined) {
        setStatus(state.lastError ? String(state.lastError) : 'Pick a room or create one')
      } else if (view && !view.started) {
        const opp = view.opponentName ? true : false
        const meReady = !!view.meReady
        const oppReady = opp ? !!view.opponentReady : false
        let msg = 'Click Get Ready'
        if (meReady && opp && !oppReady) msg = 'Waiting for opponent to get ready'
        if (!meReady && opp && oppReady) msg = 'Opponent is ready'
        if (meReady && opp && oppReady) msg = 'Starting…'
        if (!opp) msg = meReady ? 'Waiting for opponent to join' : 'Waiting for opponent'
        setStatus(state.lastError ? String(state.lastError) : msg)
      } else if (view && view.over) {
        const won = view.over.winnerId === view.meId
        setStatus(won ? ('You won +' + view.over.points + ' points') : 'You lost')
      } else if (view) {
        setStatus(myTurn ? 'Your turn' : 'Opponent\\'s turn')
      } else {
        setStatus('Waiting for state…')
      }

      if (el.profileLetter) el.profileLetter.textContent = (PLAYER_NAME || 'P').slice(0, 1).toUpperCase()
      if (el.profileName) el.profileName.textContent = PLAYER_NAME || 'Player'

      const showLobby = !state.joined
      if (el.lobbyView) el.lobbyView.style.display = showLobby ? 'block' : 'none'
      if (el.tableView) el.tableView.style.display = showLobby ? 'none' : 'block'
      if (showLobby) renderRooms()

      const youName = view && view.meName ? String(view.meName) : (PLAYER_NAME || 'Player')
      const oppName = view && view.opponentName ? String(view.opponentName) : '—'
      const youReady = view && view.meReady ? ' (READY)' : ''
      const oppReady = view && view.opponentReady ? ' (READY)' : ''
      el.namePill.textContent = 'YOU: ' + youName + youReady
      el.opponentPill.textContent = 'OPPONENT: ' + oppName + (oppName !== '—' ? oppReady : '')
      el.roomPill.textContent = state.roomId ? ('ROOM: ' + state.roomId) : 'ROOM: —'
      el.drawCount.textContent = view ? String(view.deckCount || 0) : '0'
      el.opponentCount.textContent = view ? String(view.opponentCount || 0) : '0'
      el.activeText.textContent = String(activeColor).toUpperCase()
      el.activeDot.className = 'dot ' + activeColor

      el.btnDraw.disabled = !myTurn || !view || !!view.over || !!state.wildPending
      el.btnNew.disabled = !state.joined
      el.btnStart.disabled = !state.joined || !view || view.started || view.over
      if (el.btnStart) el.btnStart.textContent = (view && view.meReady) ? 'Ready ✓' : 'Get Ready'

      el.topCard.className = 'cardFace ' + (top && (top.type === 'change-color' || top.type === 'buy-4') ? 'wild' : (top && top.color ? top.color : 'wild'))
      const src = top ? cardImgSrc(top) : ''
      const label = top ? cardLabel(top) : ''
      el.topCard.innerHTML = src ? '<img class="cardImg" src="' + src + '" alt="' + label + '" />' : ''

      el.hand.innerHTML = ''
      const canInteract = myTurn && view && !view.over && !state.wildPending
      const hand = view ? (view.yourHand || []) : []
      for (const card of hand) {
        const playable = top ? isPlayable(card, top, activeColor) : false
        const cls = (card.type === 'change-color' || card.type === 'buy-4') ? 'wild' : (card.color || 'wild')
        const node = document.createElement('button')
        node.type = 'button'
        node.className = 'miniCard ' + cls
        node.setAttribute('data-playable', playable ? 'true' : 'false')
        node.setAttribute('data-disabled', canInteract ? 'false' : 'true')
        const img = cardImgSrc(card)
        node.innerHTML = img ? '<img class="miniImg" src="' + img + '" alt="' + cardLabel(card) + '" />' : ''
        if (!canInteract || !playable) {
          node.disabled = true
        } else {
          node.addEventListener('click', () => onPlay(card))
        }
        el.hand.appendChild(node)
      }

      el.wildOverlay.style.display = state.wildPending ? 'flex' : 'none'

      if (view && view.over) {
        el.endOverlay.style.display = 'flex'
        const won = view.over.winnerId === view.meId
        el.endTitle.textContent = won ? 'You won' : 'You lost'
        el.endText.textContent = won ? ('Points earned: ' + view.over.points) : 'Try again to climb the leaderboard.'
        if (!state.reported) {
          state.reported = true
          post({ type: 'game_end', outcome: won ? 'win' : 'loss', pointsEarned: won ? (view.over.points || 0) : 0 })
        }
      } else {
        el.endOverlay.style.display = 'none'
      }
    }

    const onPlay = (card) => {
      const view = state.view
      if (!socket || !view || view.over) return
      if (view.turnId !== view.meId) return
      const top = view.topCard
      if (!top) return
      if (!isPlayable(card, top, view.activeColor)) return

      if (card.type === 'change-color' || card.type === 'buy-4') {
        state.wildPending = { cardId: card.id }
        render()
        return
      }

      socket.emit('game:play', { cardId: card.id })
    }

    const onDraw = () => {
      const view = state.view
      if (!socket || !view || view.over) return
      if (view.turnId !== view.meId) return
      if (state.wildPending) return
      socket.emit('game:draw')
    }

    const onPickColor = (color) => {
      if (!socket || !state.wildPending) return
      const view = state.view
      if (!view || view.over) return
      if (view.turnId !== view.meId) return
      const pending = state.wildPending
      state.wildPending = null
      socket.emit('game:play', { cardId: pending.cardId, selectedColor: color })
      render()
    }

    const onJoin = () => {
      if (!socket) return
      const roomId = String(el.roomInput.value || '').trim()
      socket.emit('JoinGame', { gameId: roomId, playerName: PLAYER_NAME })
    }

    const onStart = () => {
      if (!socket) return
      state.reported = false
      socket.emit('game:start')
    }

    const onToggleReady = () => {
      const view = state.view
      if (!socket || !view || view.over) return
      socket.emit('ToggleReady')
    }

    document.getElementById('pickRed').addEventListener('click', () => onPickColor('red'))
    document.getElementById('pickYellow').addEventListener('click', () => onPickColor('yellow'))
    document.getElementById('pickGreen').addEventListener('click', () => onPickColor('green'))
    document.getElementById('pickBlue').addEventListener('click', () => onPickColor('blue'))
    el.btnDraw.addEventListener('click', onDraw)
    el.btnNew.addEventListener('click', onStart)
    el.btnAgain.addEventListener('click', onStart)
    el.btnJoin.addEventListener('click', onJoin)
    el.btnStart.addEventListener('click', onToggleReady)

    if (el.btnJoinLobby) {
      el.btnJoinLobby.addEventListener('click', () => {
        if (!socket) return
        const roomId = String(el.roomInputLobby ? el.roomInputLobby.value : '').trim()
        state.lastError = null
        socket.emit('JoinGame', { gameId: roomId, playerName: PLAYER_NAME })
        render()
      })
    }

    if (el.btnCreateRoom) {
      el.btnCreateRoom.addEventListener('click', () => {
        if (!socket) return
        state.lastError = null
        socket.emit('CreateGame', { playerName: PLAYER_NAME }, (ack) => {
          if (ack && ack.gameId) {
            state.roomId = String(ack.gameId)
            if (el.roomInputLobby) el.roomInputLobby.value = state.roomId
            if (el.roomInput) el.roomInput.value = state.roomId
          }
          render()
        })
        render()
      })
    }

    if (el.btnLeave) {
      el.btnLeave.addEventListener('click', () => {
        if (!socket) return
        state.lastError = null
        state.joined = false
        state.roomId = ''
        state.view = null
        try {
          socket.emit('LeaveGame', {}, () => {})
        } catch {}
        try { socket.emit('rooms:list') } catch {}
        render()
      })
    }

    const wireSocket = (s) => {
      if (!s) return
      s.on('connect', () => {
        state.connected = true
        state.meId = s.id || ''
        state.lastError = null
        try { s.emit('SetPlayerData', { playerName: PLAYER_NAME }, () => {}) } catch {}
        s.emit('rooms:list')
        render()
      })
      s.on('connect_error', (err) => {
        state.connected = false
        state.joined = false
        state.view = null
        state.lastError = (err && err.message) ? String(err.message) : 'Failed to connect'
        render()
      })
      s.on('disconnect', () => {
        state.connected = false
        state.joined = false
        state.view = null
        render()
      })
      s.on('rooms:list:result', (msg) => {
        state.rooms = msg && Array.isArray(msg.rooms) ? msg.rooms : []
        render()
      })
      s.on('rooms:update', (msg) => {
        state.rooms = msg && Array.isArray(msg.rooms) ? msg.rooms : []
        render()
      })
      s.on('room:join:result', (result) => {
        if (!result || !result.ok) {
          state.lastError = (result && result.error) ? String(result.error) : 'Failed to join'
          render()
          return
        }
        state.joined = true
        state.roomId = String(result.roomId || '')
        if (el.roomInputLobby) el.roomInputLobby.value = state.roomId
        if (el.roomInput) el.roomInput.value = state.roomId
        render()
      })
      s.on('room:create:result', (result) => {
        if (!result || !result.ok) {
          state.lastError = (result && result.error) ? String(result.error) : 'Failed to create room'
          render()
          return
        }
        if (result && result.roomId) {
          state.roomId = String(result.roomId)
          if (el.roomInputLobby) el.roomInputLobby.value = state.roomId
          if (el.roomInput) el.roomInput.value = state.roomId
        }
        render()
      })
      s.on('game:error', (msg) => {
        state.lastError = msg && msg.error ? String(msg.error) : 'Game error'
        render()
      })
      s.on('state:update', (view) => {
        if (!view) return
        state.view = view
        if (!state.roomId && view.roomId) state.roomId = String(view.roomId)
        render()
      })
    }

    render()

    connectSocket()
      .then((s) => {
        socket = s
        wireSocket(socket)
        render()
      })
      .catch(() => {
        socket = null
        state.connected = false
        state.joined = false
        state.view = null
        state.lastError = 'Failed to connect'
        render()
      })
  `.trim()

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>UNO</title>
      <style>${css}</style>
    </head>
    <body>
      <div class="shell">
        <aside class="sidebar">
          <div class="profileRow">
            <div class="avatarCircle" id="profileLetter">P</div>
            <div>
              <div class="profileName" id="profileName">Player</div>
              <div class="navTitle" id="statusLobby"></div>
            </div>
          </div>
          <div>
            <div class="navTitle">Pages</div>
            <div style="height: 8px"></div>
            <div class="navItem"><span>Games</span><span>🎴</span></div>
          </div>
          <div class="sidebarSpacer"></div>
          <button class="leaveBtn" id="btnLeave" type="button">Leave game</button>
        </aside>

        <main class="content">
          <div class="lobby" id="lobbyView">
            <div class="lobbyHeader">
              <h1>Games</h1>
              <button class="primaryBtn" id="btnCreateRoom" type="button">+ Create new game</button>
            </div>
            <div class="joinRow">
              <input class="joinInput" id="roomInputLobby" placeholder="Enter room code" />
              <button class="joinBtn" id="btnJoinLobby" type="button">JOIN</button>
            </div>
            <div class="roomsGrid" id="roomsGrid"></div>
          </div>

          <div class="wrap" id="tableView">
            <div class="top">
              <div>
                <div class="title">UNO <span class="subtitle" id="status"></span></div>
              </div>
              <div class="pill">
                <span class="dot" id="activeDot"></span>
                <span>ACTIVE</span>
                <span id="activeText">RED</span>
              </div>
            </div>

            <div class="main">
              <div class="panel">
                <h3>Table</h3>
                <div class="stats">
                  <div class="stat"><span>Draw pile</span><b id="drawCount">0</b></div>
                  <div class="stat"><span>Opponent cards</span><b id="opponentCount">0</b></div>
                </div>
                <div style="height: 12px"></div>
                <div class="actions" style="margin-top: 0;">
                  <input id="roomInput" class="btn" placeholder="Room ID" style="flex: 1; min-width: 140px;" />
                  <button class="btn" id="btnJoin" type="button">Join</button>
                  <button class="btn" id="btnStart" type="button">Get Ready</button>
                </div>
                <div style="height: 8px"></div>
                <div class="subtitle" id="roomPill">ROOM: —</div>
                <div style="height: 4px"></div>
                <div class="subtitle" id="namePill">YOU: —</div>
                <div style="height: 4px"></div>
                <div class="subtitle" id="opponentPill">OPPONENT: —</div>
                <div style="height: 12px"></div>
                <div class="topcard">
                  <div class="cardFace" id="topCard"></div>
                </div>
                <div class="actions">
                  <button class="btn" id="btnDraw" type="button">Draw</button>
                  <button class="btn" id="btnNew" type="button">New game</button>
                </div>
              </div>

              <div class="panel handWrap">
                <div class="handHeader">
                  <h3>Your hand</h3>
                </div>
                <div class="hand" id="hand"></div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <div class="overlay" id="wildOverlay">
        <div class="modal">
          <h2>Choose a color</h2>
          <p>Your wild card needs an active color.</p>
          <div class="modalActions">
            <button class="colorBtn red" id="pickRed">Red</button>
            <button class="colorBtn yellow" id="pickYellow">Yellow</button>
            <button class="colorBtn green" id="pickGreen">Green</button>
            <button class="colorBtn blue" id="pickBlue">Blue</button>
          </div>
        </div>
      </div>

      <div class="overlay" id="endOverlay">
        <div class="modal">
          <h2 id="endTitle">Game over</h2>
          <p id="endText"></p>
          <div class="actions" style="justify-content: flex-end; margin-top: 14px;">
            <button class="btn" id="btnAgain">Play again</button>
          </div>
        </div>
      </div>

      <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
      <script>${js}</script>
    </body>
  </html>`
}

export async function GET(request: Request) {
  try {
    let playerName = "Player"
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, first_name, last_name")
          .eq("id", user.id)
          .maybeSingle()

        const username = (profile as any)?.username ? String((profile as any).username) : ""
        const firstName = (profile as any)?.first_name ? String((profile as any).first_name) : ""
        const lastName = (profile as any)?.last_name ? String((profile as any).last_name) : ""
        const fullName = `${firstName} ${lastName}`.trim()

        const meta = (user.user_metadata as any) || {}
        const metaUsername = meta?.username ? String(meta.username) : ""
        const emailPrefix = typeof user.email === "string" ? user.email.split("@")[0] || "" : ""

        playerName = username || fullName || metaUsername || emailPrefix || "Player"
      }
    } catch {}

    const url = new URL(request.url)
    const forwardedProto = request.headers.get("x-forwarded-proto")
    const proto = forwardedProto ? forwardedProto.split(",")[0]!.trim() : url.protocol.replace(":", "")
    const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host")
    let socketOrigin = url.origin
    if (hostHeader) {
      const host = hostHeader.split(",")[0]!.trim().replace(/^0\\.0\\.0\\.0(?=[:$])/, "localhost")
      socketOrigin = `${proto}://${host}`
    } else {
      socketOrigin = socketOrigin.replace("://0.0.0.0", "://localhost")
    }
    const srcDoc = buildSrcDoc(playerName, socketOrigin)
    return new NextResponse(srcDoc, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    })
  } catch (error) {
    console.error("Failed to serve UNO srcDoc:", error)
    return NextResponse.json({ error: "Failed to load game" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const internalKey = request.headers.get("x-uno-internal-key")
    const allowInternal =
      typeof process.env.UNO_CLASSIC_INTERNAL_KEY === "string" &&
      process.env.UNO_CLASSIC_INTERNAL_KEY.length > 0 &&
      internalKey === process.env.UNO_CLASSIC_INTERNAL_KEY

    if (!user && !allowInternal) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let outcome: UnoOutcome | null = null
    let pointsEarned = 0
    let userIdOverride: string | null = null
    let gameName = "UNO"
    try {
      const body = (await request.json()) as any
      outcome = body?.outcome ?? null
      pointsEarned = clampPoints(body?.pointsEarned)
      userIdOverride = typeof body?.userId === "string" ? body.userId : null
      gameName = typeof body?.game === "string" && body.game.trim() ? body.game.trim() : "UNO"
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    if (outcome !== "win" && outcome !== "loss") {
      return NextResponse.json({ error: "Invalid outcome" }, { status: 400 })
    }

    const targetUserId = allowInternal ? userIdOverride : user?.id
    if (!targetUserId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const admin = allowInternal ? createAdminClient() : null
    if (allowInternal && !admin) {
      return NextResponse.json({ error: "Server not configured for internal updates" }, { status: 500 })
    }

    const db = (admin || supabase) as any

    const pointsDelta = outcome === "win" ? pointsEarned : 0

    const { data: existing, error: existingError } = await db
      .from("user_stats")
      .select("points, total_wins, total_losses, win_streak")
      .eq("user_id", targetUserId)
      .maybeSingle()

    if (existingError) throw existingError

    const prevPoints = Number(existing?.points ?? 0) || 0
    const prevWins = Number(existing?.total_wins ?? 0) || 0
    const prevLosses = Number(existing?.total_losses ?? 0) || 0
    const prevStreak = Number(existing?.win_streak ?? 0) || 0

    const next = {
      user_id: targetUserId,
      points: prevPoints + pointsDelta,
      total_wins: prevWins + (outcome === "win" ? 1 : 0),
      total_losses: prevLosses + (outcome === "loss" ? 1 : 0),
      win_streak: outcome === "win" ? prevStreak + 1 : 0,
      updated_at: new Date().toISOString(),
    }

    const { error: upsertError } = await db.from("user_stats").upsert(next, { onConflict: "user_id" })
    if (upsertError) throw upsertError

    try {
      await db.from("activities").insert({
        user_id: targetUserId,
        activity_type: "game_played",
        description: `Played ${gameName} (${outcome})`,
        metadata: {
          game: gameName,
          outcome,
          score: pointsDelta,
          pointsDelta,
          totalPoints: next.points,
          pointsEarned,
        },
      })
    } catch (activityError) {
      console.error("Failed to insert uno activity:", activityError)
    }

    try {
      await maybeUnlockAchievements(supabase, targetUserId, {
        points: next.points,
        total_wins: next.total_wins,
        total_losses: next.total_losses,
        win_streak: next.win_streak,
      })
    } catch (unlockError) {
      console.error("Failed to unlock achievements:", unlockError)
    }

    return NextResponse.json({
      ok: true,
      points: next.points,
      pointsDelta,
      total_wins: next.total_wins,
      total_losses: next.total_losses,
      win_streak: next.win_streak,
    })
  } catch (error) {
    console.error("Failed to record UNO result:", error)
    return NextResponse.json({ error: "Failed to record result" }, { status: 500 })
  }
}
