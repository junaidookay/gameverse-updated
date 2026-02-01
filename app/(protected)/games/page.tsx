"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GameCard, type GameCardProps } from "@/components/game-card"
import { Search, Filter } from "lucide-react"

const categories = ["All Games", "Card Games", "Casino", "Trivia", "Puzzle"]

export default function GamesPage() {
  const [selectedCategory, setSelectedCategory] = useState("All Games")
  const [searchTerm, setSearchTerm] = useState("")
  const [games, setGames] = useState<GameCardProps[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch("/api/games")
        const chessGame: GameCardProps = {
          id: "3d-chess",
          name: "3D Chess",
          category: "Puzzle",
          players: 42,
          difficulty: "Medium",
          thumbnail: "♟️",
          description: "Real-time multiplayer chess with in-game chat and points",
          isMultiplayer: true,
          href: "/chess",
        }
        const blackjackGame: GameCardProps = {
          id: "blackjack",
          name: "Simple Black Jack",
          category: "Casino",
          players: 45,
          difficulty: "Easy",
          thumbnail: "🂡",
          description: "Classic blackjack with points tracked on your profile",
          isMultiplayer: false,
          href: "/blackjack",
        }
        const snakeGame: GameCardProps = {
          id: "snake",
          name: "Snake",
          category: "Puzzle",
          players: 120,
          difficulty: "Easy",
          thumbnail: "🐍",
          description: "Classic arcade snake game in your browser",
          isMultiplayer: false,
          href: "/snake",
        }
        const unoClassicGame: GameCardProps = {
          id: "uno-classic",
          name: "UNO (Classic)",
          category: "Card Games",
          players: 156,
          difficulty: "Easy",
          thumbnail: "🃏",
          description: "Original multiplayer UNO lobby and matchmaking",
          isMultiplayer: true,
          href: "/uno-classic",
        }
        if (response.ok) {
          const data = await response.json()
          const mapped = data.map((game: any) => ({
            id: game.id,
            name: game.title,
            category: game.category,
            players: Math.floor(Math.random() * 500) + 100,
            difficulty: game.difficulty,
            thumbnail: "🎮",
            description: game.description,
            isMultiplayer: game.is_multiplayer,
          }))
          setGames([...mapped, chessGame, blackjackGame, snakeGame, unoClassicGame])
        } else {
          setGames([chessGame, blackjackGame, snakeGame, unoClassicGame])
        }
      } catch (error) {
        console.error("Error fetching games:", error)
        setGames([
          {
            id: "3d-chess",
            name: "3D Chess",
            category: "Puzzle",
            players: 42,
            difficulty: "Medium",
            thumbnail: "♟️",
            description: "Real-time multiplayer chess with in-game chat and points",
            isMultiplayer: true,
            href: "/chess",
          },
          {
            id: "blackjack",
            name: "Simple Black Jack",
            category: "Casino",
            players: 45,
            difficulty: "Easy",
            thumbnail: "🂡",
            description: "Classic blackjack with points tracked on your profile",
            isMultiplayer: false,
            href: "/blackjack",
          },
          {
            id: "snake",
            name: "Snake",
            category: "Puzzle",
            players: 120,
            difficulty: "Easy",
            thumbnail: "🐍",
            description: "Classic arcade snake game in your browser",
            isMultiplayer: false,
            href: "/snake",
          },
          {
            id: "uno-classic",
            name: "UNO (Classic)",
            category: "Card Games",
            players: 156,
            difficulty: "Easy",
            thumbnail: "🃏",
            description: "Original multiplayer UNO lobby and matchmaking",
            isMultiplayer: true,
            href: "/uno-classic",
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchGames()
  }, [])

  const filteredGames = games.filter((game) => {
    const categoryMatch = selectedCategory === "All Games" || game.category === selectedCategory
    const searchMatch = game.name.toLowerCase().includes(searchTerm.toLowerCase())
    return categoryMatch && searchMatch
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold glow-text">Game Library</h1>
          <p className="text-muted-foreground">Discover and play exciting games with family and friends</p>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search games..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Filter Button */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Category:</span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              onClick={() => setSelectedCategory(category)}
              variant={selectedCategory === category ? "default" : "outline"}
              className={`${
                selectedCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "border-border bg-transparent hover:bg-primary/10"
              }`}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Games Grid */}
        {loading ? (
          <p className="text-center text-muted-foreground">Loading games...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredGames.map((game) => (
              <GameCard key={game.id} {...game} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredGames.length === 0 && (
          <Card className="bg-card/50 border-border/50 backdrop-blur p-12 text-center">
            <p className="text-muted-foreground">No games found. Try adjusting your filters.</p>
          </Card>
        )}

        {/* Featured Section */}
        <div className="mt-12 space-y-4">
          <h2 className="text-2xl font-bold glow-accent">Featured Games</h2>
          <Card className="relative overflow-hidden bg-card/50 border-border/50 backdrop-blur p-8">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-transparent"></div>
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 md:flex-1">
                <h3 className="text-2xl font-bold">Monthly Tournament</h3>
                <p className="text-muted-foreground">Compete with players worldwide in our epic tournament event</p>
                <Button className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground">Join Now</Button>
              </div>
              <div className="text-6xl">🏆</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
