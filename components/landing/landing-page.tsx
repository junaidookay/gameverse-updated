"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, Calendar, Flame, Gamepad2, MessageCircle, Play, Rocket, Trophy, UserPlus, Users, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { getAvatarUrl } from "@/lib/utils"
import type { User } from "@supabase/supabase-js"
import parklanPaloozaLogo from "../../parklan-palooza.png"
import parklanPaloozaHeroLogo from "../../parklan-palooza-hero-logo.png"

export function LandingPage() {
  return <Landing />
}

const Landing = () => {
  return (
    <div className="landing-theme min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorks />
      <GamesShowcase />
      <StatsSection />
      <CommunitySection />
      <CTASection />
      <Footer />
    </div>
  )
}

const Navbar = () => {
  const [user, setUser] = useState<User | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState("")

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!active) return

        if (!user) {
          setUser(null)
          setAvatarUrl(null)
          setDisplayName("")
          return
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url, username, first_name, last_name")
          .eq("id", user.id)
          .maybeSingle()

        if (!active) return

        setUser(user)
        setAvatarUrl(getAvatarUrl(profile?.avatar_url || null))
        setDisplayName((profile?.username || profile?.first_name || user.email || "").trim())
      } catch {
        if (!active) return
        setUser(null)
        setAvatarUrl(null)
        setDisplayName("")
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border"
    >
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="relative h-10 w-[160px] sm:h-12 sm:w-[200px] overflow-hidden">
            <Image src={parklanPaloozaLogo} alt="Parklan" fill className="object-contain" priority />
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#games" className="text-muted-foreground hover:text-foreground transition-colors">
            Games
          </a>
          <a href="#community" className="text-muted-foreground hover:text-foreground transition-colors">
            Community
          </a>
          <a href="#stats" className="text-muted-foreground hover:text-foreground transition-colors">
            Stats
          </a>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <Button asChild variant="ghost" className="gap-2 px-2">
              <Link href="/dashboard">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={avatarUrl || undefined} alt={displayName || "Profile"} />
                  <AvatarFallback>{(displayName || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline max-w-[140px] truncate">{displayName || "Dashboard"}</span>
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild variant="outline" className="hidden sm:inline-flex">
                <Link href="/register">Sign Up</Link>
              </Button>
            </>
          )}
          <Button asChild variant="secondary" className="gap-2">
            <Link href="/app">
              <Gamepad2 className="w-4 h-4" />
              <span>Enter Parklan</span>
            </Link>
          </Button>
        </div>
      </div>
    </motion.nav>
  )
}

const HeroSection = () => {
  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-20">
      <div className="absolute inset-0 z-0">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-40">
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-background/50" />
      </div>

      <div
        className="absolute inset-0 opacity-5 z-[1]"
        style={{
          backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px),
                            linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative mb-6">
            <div className="h-10 md:h-12 mb-8" aria-hidden />
            <div className="absolute left-1/2 -top-32 -translate-x-1/2 z-10">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Image
                  src={parklanPaloozaHeroLogo}
                  alt="Parklan Palooza"
                  width={220}
                  height={60}
                  className="h-10 md:h-12 w-auto mx-auto select-none pointer-events-none"
                  priority
                />
              </motion.div>
            </div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                2,500+ Players Online Now
              </span>
            </motion.div>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight"
          >
            Your Ultimate <span className="gv-gradient-text">Virtual</span>
            <br />
            Hangout Awaits
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            Play games, chat and hang out virtually with your friends & family
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Button asChild size="lg" variant="default" className="text-lg px-8 gv-glow-purple mx-auto">
              <Link href="/register">
                <Gamepad2 className="w-5 h-5 mr-2" />
                Start Playing Free
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-4"
          >
            {[
              { icon: Users, label: "Multiplayer" },
              { icon: Trophy, label: "Tournaments" },
              { icon: MessageCircle, label: "Live Chat" },
            ].map((item) => (
              <motion.div
                key={item.label}
                whileHover={{ scale: 1.05, y: -2 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border border-border hover:border-primary/50 transition-colors"
              >
                <item.icon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
        >
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  )
}

const FeaturesSection = () => {
  const features = [
    {
      icon: Gamepad2,
      title: "Game Library",
      description: "Access games including Card Games, Casino, Trivia, and Puzzles. New games added regularly.",
      gradient: "from-primary to-primary/50",
    },
    {
      icon: Trophy,
      title: "Leaderboards",
      description: "Compete for the top spots. Track your global rank, win streaks, and earn achievement badges.",
      gradient: "from-secondary to-secondary/50",
    },
    {
      icon: MessageCircle,
      title: "Looza Chat",
      description: "Join channels, chat with friends, and connect with the gaming community in real-time.",
      gradient: "from-primary to-secondary",
    },
    {
      icon: Users,
      title: "Multiplayer Games",
      description: "Challenge friends or match with players worldwide. Real-time multiplayer experience.",
      gradient: "from-secondary to-primary",
    },
    {
      icon: Calendar,
      title: "Tournaments & Events",
      description: "Participate in weekly tournaments and special events. Win prizes and glory.",
      gradient: "from-primary to-primary/50",
    },
    {
      icon: UserPlus,
      title: "Player Profiles",
      description: "Customize your profile, track stats, manage friends, and showcase your achievements.",
      gradient: "from-secondary to-secondary/50",
    },
  ]

  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Everything You Need to <span className="gv-gradient-text">Play & Connect</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A complete gaming ecosystem designed for fun, competition, and community.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group gv-card p-6 hover:border-primary/50 transition-all duration-300"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

const HowItWorks = () => {
  const steps = [
    {
      number: "01",
      icon: UserPlus,
      title: "Sign Up Free",
      description: "Create your account in seconds. No credit card required, just your email and you're ready to go.",
      color: "from-primary to-primary/50",
    },
    {
      number: "02",
      icon: Gamepad2,
      title: "Choose a Game",
      description: "Access games including Card Games, Casino, Trivia, Puzzles and More. New games added regularly.",
      color: "from-secondary to-secondary/50",
    },
    {
      number: "03",
      icon: Rocket,
      title: "Start Playing",
      description: "Jump into games, climb the leaderboards, make friends, and become part of the GameVerse community.",
      color: "from-primary to-secondary",
    },
  ]

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 right-0 w-72 h-72 bg-secondary/10 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            Getting Started
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            How It <span className="gv-gradient-text">Works</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Join thousands of players in just three simple steps</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-24 left-1/4 right-1/4 h-0.5">
            <div className="w-full h-full bg-gradient-to-r from-primary via-secondary to-primary opacity-30" />
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.5 }}
              className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary origin-left"
            />
          </div>

          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="relative"
            >
              <div className="gv-card p-8 h-full group hover:border-primary/50 transition-all duration-300">
                <div className="absolute -top-4 -left-2 font-display text-6xl font-black text-muted/20 group-hover:text-primary/20 transition-colors">
                  {step.number}
                </div>

                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 relative z-10`}
                >
                  <step.icon className="w-8 h-8 text-foreground" />
                </motion.div>

                <h3 className="font-display text-2xl font-bold mb-3 relative z-10">{step.title}</h3>
                <p className="text-muted-foreground relative z-10">{step.description}</p>

                {index < steps.length - 1 ? (
                  <div className="md:hidden flex justify-center mt-6">
                    <ArrowRight className="w-6 h-6 text-primary animate-pulse" />
                  </div>
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground">
            Ready to begin your adventure?{" "}
            <Link href="/register" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              Create your free account →
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  )
}

const GamesShowcase = () => {
  const games = [
    {
      title: "Simple Black Jack",
      category: "Casino",
      players: 45,
      difficulty: "Easy",
      gradient: "from-secondary/30 to-primary/30",
    },
    {
      title: "Chess Masters",
      category: "Strategy",
      players: 128,
      difficulty: "Hard",
      gradient: "from-primary/30 to-secondary/30",
    },
    {
      title: "Trivia Rush",
      category: "Trivia",
      players: 256,
      difficulty: "Medium",
      gradient: "from-secondary/30 to-primary/30",
    },
    {
      title: "Puzzle Quest",
      category: "Puzzle",
      players: 89,
      difficulty: "Medium",
      gradient: "from-primary/30 to-secondary/30",
    },
  ]

  return (
    <section id="games" className="py-24 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12"
        >
          <div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              <span className="gv-gradient-text">Popular Games</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-xl">
              Discover our most played games. From casual card games to competitive trivia.
            </p>
          </div>
          <Button asChild variant="outline" className="mt-4 md:mt-0">
            <Link href="/games">View All Games</Link>
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {games.map((game, index) => (
            <motion.div
              key={game.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group gv-card overflow-hidden hover:border-primary/50 transition-all duration-300"
            >
              <div className={`h-32 bg-gradient-to-br ${game.gradient} flex items-center justify-center relative overflow-hidden`}>
                <div className="absolute inset-0 bg-card/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <Button asChild size="sm" variant="secondary" className="gap-2">
                    <Link href="/games">
                      <Play className="w-4 h-4" />
                      Play Now
                    </Link>
                  </Button>
                </div>
                <span className="text-4xl opacity-50 group-hover:opacity-0 transition-opacity">🎮</span>
              </div>
              <div className="p-4">
                <div className="text-xs text-primary mb-1">{game.category}</div>
                <h3 className="font-display font-semibold mb-2">{game.title}</h3>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>{game.players} playing</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-muted text-xs">{game.difficulty}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

const StatsSection = () => {
  const stats = [
    { icon: Users, value: "25K+", label: "Active Players", color: "text-primary" },
    { icon: Gamepad2, value: "48.2K", label: "Games Played", color: "text-secondary" },
    { icon: Trophy, value: "150+", label: "Tournaments", color: "text-primary" },
    { icon: Zap, value: "42.3%", label: "Avg Win Rate", color: "text-secondary" },
  ]

  return (
    <section id="stats" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Join the <span className="gv-gradient-text">Growing Community</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Thousands of players are already competing, connecting, and having fun.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="gv-card p-6 text-center"
            >
              <stat.icon className={`w-8 h-8 mx-auto mb-3 ${stat.color}`} />
              <div className="font-display text-3xl md:text-4xl font-bold mb-1">{stat.value}</div>
              <div className="text-muted-foreground text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

const CommunitySection = () => {
  const achievements = [
    { icon: Flame, title: "Hot Streak", description: "5-win streak", color: "text-secondary" },
    { icon: Trophy, title: "Top 100", description: "Rank in top 100", color: "text-primary" },
    { icon: Users, title: "Social Butterfly", description: "50+ friends", color: "text-secondary" },
  ]

  const chatMessages = [
    { user: "ShadowKnight", message: "GG everyone! That was intense 🔥", online: true },
    { user: "NeonGamer", message: "Who's up for another round?", online: true },
    { user: "PhantomEcho", message: "Count me in!", online: true },
  ]

  return (
    <section id="community" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            A Thriving <span className="gv-gradient-text">Community</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect with players, earn achievements, and be part of something special.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="gv-card p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h3 className="font-display font-semibold">Live Chat</h3>
              <span className="ml-auto px-2 py-0.5 rounded-full bg-secondary/20 text-secondary text-xs">#General</span>
            </div>

            <div className="space-y-4">
              {chatMessages.map((msg, index) => (
                <motion.div
                  key={msg.user}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold">
                      {msg.user[0]}
                    </div>
                    {msg.online ? (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                    ) : null}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{msg.user}</div>
                    <div className="text-muted-foreground text-sm">{msg.message}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground text-sm">Message #General...</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="gv-card p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="w-5 h-5 text-secondary" />
              <h3 className="font-display font-semibold">Achievements & Badges</h3>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              {achievements.map((achievement, index) => (
                <motion.div
                  key={achievement.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="text-center p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <achievement.icon className={`w-8 h-8 mx-auto mb-2 ${achievement.color}`} />
                  <div className="font-medium text-sm">{achievement.title}</div>
                  <div className="text-muted-foreground text-xs">{achievement.description}</div>
                </motion.div>
              ))}
            </div>

            <div className="rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Your Current Rank</span>
                <span className="text-sm text-muted-foreground">Next Rank In</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-2xl font-bold">#3</span>
                  <span className="text-primary font-semibold">3,220 points</span>
                </div>
                <span className="text-secondary font-semibold">630 points</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-secondary/20 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="font-display text-4xl md:text-6xl font-bold mb-6">
            Ready to <span className="gv-gradient-text">Level Up</span>?
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            Join thousands of players already on GameVerse. Free to play, easy to start, impossible to put down.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="default" className="text-lg px-8 gv-glow-purple group">
              <Link href="/register">
                <Gamepad2 className="w-5 h-5 mr-2" />
                Create Free Account
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="text-lg px-8 gv-glow-coral">
              <Link href="/games">Explore Games</Link>
            </Button>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">No credit card required • Instant access • Free forever</p>
        </motion.div>
      </div>
    </section>
  )
}

const Footer = () => {
  const footerLinks: Record<string, { label: string; href: string }[]> = {
    Platform: [
      { label: "Games", href: "/games" },
      { label: "Leaderboard", href: "/leaderboard" },
      { label: "Tournaments", href: "/tournaments" },
      { label: "Events", href: "/events" },
    ],
    Community: [
      { label: "Chat", href: "/chat" },
      { label: "Friends", href: "/friends" },
      { label: "Blog", href: "/blog" },
      { label: "Discord", href: "#" },
    ],
    Company: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Press", href: "#" },
      { label: "Contact", href: "#" },
    ],
    Legal: [
      { label: "Terms", href: "#" },
      { label: "Privacy", href: "#" },
      { label: "Cookies", href: "#" },
      { label: "Guidelines", href: "#" },
    ],
  }

  return (
    <footer className="py-16 border-t border-border">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="font-display font-bold text-foreground">GV</span>
              </div>
              <span className="font-display text-xl font-bold text-secondary">GameVerse</span>
            </div>
            <p className="text-muted-foreground text-sm">Your ultimate gaming community. Play, compete, and connect.</p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-display font-semibold mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href === "#" ? (
                      <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">© 2026 GameVerse. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              Twitter
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              Discord
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              YouTube
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
