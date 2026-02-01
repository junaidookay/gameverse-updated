import type { NextApiRequest, NextApiResponse } from "next"
import type { Server as HttpServer } from "http"
import type { Socket as NetSocket } from "net"
import { Server as SocketIOServer } from "socket.io"
import type { Socket } from "socket.io"

type CardColor = "red" | "yellow" | "green" | "blue" | "black"
type CardType =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "block"
  | "reverse"
  | "buy-2"
  | "change-color"
  | "buy-4"

type Card = {
  id: string
  type: CardType
  color: CardColor
}

type GameOver = {
  winnerId: string
  points: number
}

type RoomState = {
  roomId: string
  createdAt: number
  players: string[]
  playerNames: Record<string, string>
  ready: Record<string, boolean>
  started: boolean
  deck: Card[]
  discard: Card[]
  hands: Record<string, Card[]>
  turnId: string
  activeColor: Exclude<CardColor, "black">
  pendingDraw: number
  skipNext: boolean
  over: GameOver | null
}

type ViewState = {
  roomId: string
  meId: string
  meName: string
  opponentName: string | null
  meReady: boolean
  opponentReady: boolean | null
  started: boolean
  yourHand: Card[]
  opponentCount: number
  deckCount: number
  topCard: Card | null
  turnId: string
  activeColor: Exclude<CardColor, "black">
  pendingDraw: number
  skipNext: boolean
  over: GameOver | null
}

type NextApiResponseServerIO = NextApiResponse & {
  socket: NetSocket & {
    server: HttpServer & {
      io?: SocketIOServer
      unoRooms?: Map<string, RoomState>
      unoSocketVersion?: number
    }
  }
}

type RoomSummary = {
  roomId: string
  playersCount: number
  started: boolean
  over: boolean
  createdAt: number
}

const COLORS: Exclude<CardColor, "black">[] = ["red", "yellow", "green", "blue"]
const isDigitType = (t: CardType) => /^[0-9]$/.test(t)

const clampRoomId = (value: unknown) => {
  const raw = typeof value === "string" ? value : ""
  const trimmed = raw.trim().slice(0, 40)
  const safe = trimmed.replace(/[^a-zA-Z0-9_-]/g, "")
  return safe.length > 0 ? safe : null
}

const clampPlayerName = (value: unknown) => {
  const raw = typeof value === "string" ? value : ""
  const trimmed = raw.trim().slice(0, 24)
  const safe = trimmed.replace(/[^\p{L}\p{N} _-]/gu, "")
  return safe.length > 0 ? safe : "Player"
}

const makeRoomCode = () => Math.random().toString(36).slice(2, 8).toUpperCase()

const makeId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`

const shuffle = <T,>(arr: T[]) => {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

const createDeck = (): Card[] => {
  const deck: Card[] = []
  const push = (card: Omit<Card, "id">) => deck.push({ id: makeId(), ...card })

  for (const color of COLORS) {
    push({ type: "0", color })
    for (let n = 1; n <= 9; n++) {
      const type = String(n) as CardType
      push({ type, color })
      push({ type, color })
    }
    for (let i = 0; i < 2; i++) {
      push({ type: "block", color })
      push({ type: "reverse", color })
      push({ type: "buy-2", color })
    }
  }
  for (let i = 0; i < 4; i++) push({ type: "change-color", color: "black" })
  for (let i = 0; i < 4; i++) push({ type: "buy-4", color: "black" })

  return shuffle(deck)
}

const cardPoints = (card: Card) => {
  if (isDigitType(card.type)) return Number(card.type)
  if (card.type === "change-color" || card.type === "buy-4") return 50
  return 20
}

const isPlayable = (card: Card, top: Card, activeColor: Exclude<CardColor, "black">) => {
  if (card.type === "change-color" || card.type === "buy-4") return true
  if (card.color !== "black" && card.color === activeColor) return true
  if (card.type === top.type) return true
  return false
}

const otherPlayerId = (room: RoomState, playerId: string) => {
  const [a, b] = room.players
  return a === playerId ? b : a
}

const normalizePiles = (room: RoomState) => {
  if (room.deck.length > 0) return
  if (room.discard.length <= 1) return
  const keep = room.discard[room.discard.length - 1]!
  const rest = room.discard.slice(0, -1)
  room.deck = shuffle(rest)
  room.discard = [keep]
}

const takeFromDeck = (room: RoomState, count: number) => {
  normalizePiles(room)
  const drawn = room.deck.slice(0, count)
  room.deck = room.deck.slice(drawn.length)
  return drawn
}

const computeWinnerPoints = (room: RoomState, winnerId: string) => {
  const loserId = otherPlayerId(room, winnerId)
  const hand = room.hands[loserId] || []
  return hand.reduce((sum, c) => sum + cardPoints(c), 0)
}

const endGame = (room: RoomState, winnerId: string) => {
  if (room.over) return
  const points = computeWinnerPoints(room, winnerId)
  room.over = { winnerId, points }
}

const applyPending = (room: RoomState) => {
  if (room.over) return false

  if (room.skipNext) {
    room.skipNext = false
    room.turnId = otherPlayerId(room, room.turnId)
    return true
  }

  if (room.pendingDraw > 0) {
    const count = room.pendingDraw
    room.pendingDraw = 0
    const drawn = takeFromDeck(room, count)
    room.hands[room.turnId] = (room.hands[room.turnId] || []).concat(drawn)
    room.turnId = otherPlayerId(room, room.turnId)
    return true
  }

  return false
}

const pumpTurn = (room: RoomState) => {
  while (applyPending(room)) {}
}

const dealAndSeed = (room: RoomState) => {
  const deck = createDeck()
  const [p1, p2] = room.players
  room.hands[p1] = deck.slice(0, 7)
  room.hands[p2] = deck.slice(7, 14)
  room.deck = deck.slice(14)
  room.discard = []
  room.pendingDraw = 0
  room.skipNext = false
  room.over = null

  let seed: Card | null = null
  let guard = 0
  while (room.deck.length > 0 && guard < 500) {
    guard++
    const c = room.deck.shift()
    if (!c) break
    if (isDigitType(c.type) && c.color !== "black") {
      seed = c
      break
    }
    room.deck.push(c)
  }
  if (!seed) seed = { id: makeId(), type: "0", color: "red" }
  room.discard.push(seed)
  room.activeColor = (seed.color === "black" ? "red" : seed.color) as Exclude<CardColor, "black">
  room.turnId = room.players[0]!
}

const stateForPlayer = (room: RoomState, meId: string): ViewState => {
  const opponentId = room.players.find((p) => p !== meId) || ""
  const meName = room.playerNames[meId] || "Player"
  const opponentName = opponentId ? room.playerNames[opponentId] || "Player" : null
  return {
    roomId: room.roomId,
    meId,
    meName,
    opponentName,
    meReady: !!room.ready[meId],
    opponentReady: opponentId ? !!room.ready[opponentId] : null,
    started: room.started,
    yourHand: room.hands[meId] || [],
    opponentCount: opponentId ? (room.hands[opponentId] || []).length : 0,
    deckCount: room.deck.length,
    topCard: room.discard.length > 0 ? room.discard[room.discard.length - 1]! : null,
    turnId: room.turnId,
    activeColor: room.activeColor,
    pendingDraw: room.pendingDraw,
    skipNext: room.skipNext,
    over: room.over,
  }
}

const emitState = (io: SocketIOServer, room: RoomState) => {
  for (const playerId of room.players) {
    io.to(playerId).emit("state:update", stateForPlayer(room, playerId))
  }
}

const roomsSnapshot = (rooms: Map<string, RoomState>): RoomSummary[] => {
  return Array.from(rooms.values())
    .map((room) => ({
      roomId: room.roomId,
      playersCount: room.players.length,
      started: !!room.started,
      over: !!room.over,
      createdAt: typeof room.createdAt === "number" ? room.createdAt : 0,
    }))
    .sort((a, b) => b.createdAt - a.createdAt)
}

const emitRooms = (io: SocketIOServer, rooms: Map<string, RoomState>) => {
  io.emit("rooms:update", { rooms: roomsSnapshot(rooms) })
}

const onJoin = (io: SocketIOServer, rooms: Map<string, RoomState>, socket: Socket, payload: any) => {
  const roomId = clampRoomId(payload?.roomId)
  if (!roomId) {
    socket.emit("room:join:result", { ok: false, error: "Invalid roomId" })
    return
  }

  const playerName = clampPlayerName(payload?.playerName)
  const existing = rooms.get(roomId)
  if (existing && existing.players.length >= 2 && !existing.players.includes(socket.id)) {
    socket.emit("room:join:result", { ok: false, error: "Room is full" })
    return
  }

  const room =
    existing ||
    ({
      roomId,
      createdAt: Date.now(),
      players: [],
      playerNames: {},
      ready: {},
      started: false,
      deck: [],
      discard: [],
      hands: {},
      turnId: "",
      activeColor: "red",
      pendingDraw: 0,
      skipNext: false,
      over: null,
    } satisfies RoomState)

  if (!room.players.includes(socket.id)) room.players.push(socket.id)
  room.playerNames[socket.id] = playerName
  if (typeof room.ready[socket.id] !== "boolean") room.ready[socket.id] = false
  rooms.set(roomId, room)

  socket.join(roomId)
  socket.data.roomId = roomId
  socket.data.playerName = playerName

  socket.emit("room:join:result", { ok: true, roomId, meId: socket.id, started: room.started })
  emitState(io, room)
  emitRooms(io, rooms)
}

const onCreate = (io: SocketIOServer, rooms: Map<string, RoomState>, socket: Socket, payload: any) => {
  const playerName = clampPlayerName(payload?.playerName)

  let roomId: string | null = null
  let guard = 0
  while (!roomId && guard < 50) {
    guard++
    const candidate = makeRoomCode()
    if (!rooms.has(candidate)) roomId = candidate
  }

  if (!roomId) {
    socket.emit("room:create:result", { ok: false, error: "Failed to create room" })
    return
  }

  onJoin(io, rooms, socket, { roomId, playerName })
  socket.emit("room:create:result", { ok: true, roomId })
}

const onToggleReady = (io: SocketIOServer, rooms: Map<string, RoomState>, socket: Socket) => {
  const roomId = socket.data.roomId as string | undefined
  if (!roomId) return
  const room = rooms.get(roomId)
  if (!room) return
  if (!room.players.includes(socket.id)) return

  room.ready[socket.id] = !room.ready[socket.id]
  emitState(io, room)

  const canStart = room.players.length >= 2 && room.players.every((p) => room.ready[p])
  if (canStart && !room.started) {
    if (room.over) room.over = null
    room.started = true
    dealAndSeed(room)
    emitState(io, room)
    emitRooms(io, rooms)
  }
}

const onStart = (io: SocketIOServer, rooms: Map<string, RoomState>, socket: Socket) => {
  const roomId = socket.data.roomId as string | undefined
  if (!roomId) return
  const room = rooms.get(roomId)
  if (!room) return
  if (room.players.length < 2) {
    socket.emit("game:error", { error: "Waiting for an opponent" })
    return
  }
  if (room.over) {
    room.over = null
  }
  room.started = true
  for (const playerId of room.players) room.ready[playerId] = true
  dealAndSeed(room)
  emitState(io, room)
  emitRooms(io, rooms)
}

const onDraw = (io: SocketIOServer, rooms: Map<string, RoomState>, socket: Socket) => {
  const roomId = socket.data.roomId as string | undefined
  if (!roomId) return
  const room = rooms.get(roomId)
  if (!room || !room.started || room.over) return
  if (room.turnId !== socket.id) return

  const top = room.discard[room.discard.length - 1]
  if (!top) return

  const drawn = takeFromDeck(room, 1)[0]
  if (drawn) {
    room.hands[socket.id] = (room.hands[socket.id] || []).concat([drawn])
    if (!isPlayable(drawn, top, room.activeColor)) {
      room.turnId = otherPlayerId(room, socket.id)
      pumpTurn(room)
    }
  } else {
    room.turnId = otherPlayerId(room, socket.id)
    pumpTurn(room)
  }

  emitState(io, room)
}

const onPlay = (io: SocketIOServer, rooms: Map<string, RoomState>, socket: Socket, payload: any) => {
  const roomId = socket.data.roomId as string | undefined
  if (!roomId) return
  const room = rooms.get(roomId)
  if (!room || !room.started || room.over) return
  if (room.turnId !== socket.id) return

  const cardId = typeof payload?.cardId === "string" ? payload.cardId : ""
  const selectedColor = typeof payload?.selectedColor === "string" ? payload.selectedColor : null

  const hand = room.hands[socket.id] || []
  const card = hand.find((c) => c.id === cardId)
  if (!card) return

  const top = room.discard[room.discard.length - 1]
  if (!top) return

  if (!isPlayable(card, top, room.activeColor)) return

  if ((card.type === "change-color" || card.type === "buy-4") && !COLORS.includes(selectedColor as any)) {
    return
  }

  room.hands[socket.id] = hand.filter((c) => c.id !== card.id)
  room.discard.push(card)

  const nextColor =
    card.type === "change-color" || card.type === "buy-4"
      ? (selectedColor as Exclude<CardColor, "black">)
      : (card.color === "black" ? room.activeColor : (card.color as Exclude<CardColor, "black">))
  room.activeColor = nextColor

  if (card.type === "block" || card.type === "reverse") room.skipNext = true
  if (card.type === "buy-2") room.pendingDraw = 2
  if (card.type === "buy-4") room.pendingDraw = 4

  if ((room.hands[socket.id] || []).length === 0) {
    endGame(room, socket.id)
    emitState(io, room)
    emitRooms(io, rooms)
    return
  }

  room.turnId = otherPlayerId(room, socket.id)
  pumpTurn(room)
  emitState(io, room)
}

const onLeaveOrDisconnect = (io: SocketIOServer, rooms: Map<string, RoomState>, socket: Socket) => {
  const roomId = socket.data.roomId as string | undefined
  if (!roomId) return
  const room = rooms.get(roomId)
  if (!room) return

  room.players = room.players.filter((p) => p !== socket.id)
  delete room.hands[socket.id]
  delete room.playerNames[socket.id]
  delete room.ready[socket.id]

  if (room.players.length === 0) {
    rooms.delete(roomId)
    emitRooms(io, rooms)
    return
  }

  room.started = false
  room.over = null
  room.deck = []
  room.discard = []
  room.pendingDraw = 0
  room.skipNext = false
  room.turnId = room.players[0] || ""
  for (const playerId of room.players) room.ready[playerId] = false
  emitState(io, room)
  emitRooms(io, rooms)
}

const onLeave = (io: SocketIOServer, rooms: Map<string, RoomState>, socket: Socket, ack?: (data: any) => void) => {
  const roomId = socket.data.roomId as string | undefined
  if (!roomId) {
    ack?.({ ok: true })
    return
  }
  socket.leave(roomId)
  onLeaveOrDisconnect(io, rooms, socket)
  delete socket.data.roomId
  ack?.({ ok: true })
}

const isAck = (value: unknown): value is (...args: any[]) => void => typeof value === "function"

const setup = (io: SocketIOServer, rooms: Map<string, RoomState>) => {
  io.on("connection", (socket) => {
    socket.data.playerName = clampPlayerName(socket.data.playerName)
    socket.on("rooms:list", () => {
      socket.emit("rooms:list:result", { rooms: roomsSnapshot(rooms) })
    })
    socket.on("room:create", (payload) => onCreate(io, rooms, socket, payload))
    socket.on("room:join", (payload) => onJoin(io, rooms, socket, payload))
    socket.on("room:leave", (_payload, maybeAck) => onLeave(io, rooms, socket, isAck(maybeAck) ? maybeAck : undefined))
    socket.on("room:ready", () => onToggleReady(io, rooms, socket))
    socket.on("game:start", () => onStart(io, rooms, socket))
    socket.on("game:draw", () => onDraw(io, rooms, socket))
    socket.on("game:play", (payload) => onPlay(io, rooms, socket, payload))
    socket.on("SetPlayerData", (payload, maybeAck) => {
      const ack = isAck(maybeAck) ? maybeAck : undefined
      const playerName = clampPlayerName(payload?.player?.name ?? payload?.playerName)
      socket.data.playerName = playerName
      ack?.({ player: { name: playerName } })
    })
    socket.on("CreateGame", (_payload, maybeAck) => {
      const ack = isAck(maybeAck) ? maybeAck : undefined
      const playerName = clampPlayerName(_payload?.playerName ?? socket.data.playerName)
      socket.data.playerName = playerName
      onCreate(io, rooms, socket, { playerName })
      const roomId = socket.data.roomId as string | undefined
      if (roomId) ack?.({ gameId: roomId })
    })
    socket.on("JoinGame", (payload, maybeAck) => {
      const gameId = clampRoomId(payload?.gameId)
      const ack = isAck(maybeAck) ? maybeAck : undefined
      if (!gameId) {
        ack?.({ error: "Invalid gameId" })
        return
      }
      const playerName = clampPlayerName(payload?.playerName ?? socket.data.playerName)
      socket.data.playerName = playerName
      onJoin(io, rooms, socket, { roomId: gameId, playerName })
      ack?.({ ok: true, gameId })
    })
    socket.on("ToggleReady", () => onToggleReady(io, rooms, socket))
    socket.on("LeaveGame", (_payload, maybeAck) => {
      const ack = isAck(maybeAck) ? maybeAck : undefined
      onLeave(io, rooms, socket, ack)
    })
    socket.on("ForceSelfDisconnect", (_payload, maybeAck) => {
      const ack = isAck(maybeAck) ? maybeAck : undefined
      onLeave(io, rooms, socket)
      ack?.({ ok: true })
      socket.disconnect(true)
    })
    socket.on("disconnect", () => onLeaveOrDisconnect(io, rooms, socket))
  })
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
}

export default function handler(_req: NextApiRequest, res: NextApiResponseServerIO) {
  const socketVersion = 2
  if (!res.socket.server.io) {
    const io = new SocketIOServer(res.socket.server, {
      path: "/api/uno/socket",
      addTrailingSlash: false,
      cors: {
        origin: (_origin, callback) => callback(null, true),
        methods: ["GET", "POST"],
      },
      allowRequest: (_req, callback) => callback(null, true),
    })
    res.socket.server.io = io
    res.socket.server.unoRooms = new Map<string, RoomState>()
    setup(io, res.socket.server.unoRooms)
    res.socket.server.unoSocketVersion = socketVersion
  } else if (res.socket.server.unoSocketVersion !== socketVersion) {
    const io = res.socket.server.io
    const rooms = res.socket.server.unoRooms || new Map<string, RoomState>()
    res.socket.server.unoRooms = rooms
    io.removeAllListeners("connection")
    setup(io, rooms)
    res.socket.server.unoSocketVersion = socketVersion
  }

  res.end()
}
