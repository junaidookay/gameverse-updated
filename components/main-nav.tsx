"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAvatarUrl } from "@/lib/utils"
import type { User } from "@supabase/supabase-js"
import { Menu, X, LogOut, Shield, ChevronDown } from "lucide-react"
import { useState, useEffect } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { createClient } from "@/lib/supabase/client"
import parklanPaloozaLogo from "../parklan-palooza.png"

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: "🎮" },
  { href: "/games", label: "Games", icon: "🕹️" },
  { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
  { href: "/chat", label: "Chat", icon: "💬" },
]

const moreNavItems = [
  { href: "/friends", label: "Friends", icon: "👥" },
  { href: "/messages", label: "Messages", icon: "✉️" },
  { href: "/tournaments", label: "Tournaments", icon: "🏅" },
  { href: "/blog", label: "Blog", icon: "📝" },
  { href: "/events", label: "Events", icon: "📅" },
  { href: "/profile", label: "Profile", icon: "👤" },
]

export function MainNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string>("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const checkAdminStatus = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role, avatar_url, username, first_name, last_name")
          .eq("id", user.id)
          .maybeSingle()
        if (!error) {
          setIsAdmin(profile?.role === "admin")
          setAvatarUrl(getAvatarUrl(profile?.avatar_url || null))
          const name = (profile?.username || profile?.first_name || user.email || "").trim()
          setDisplayName(name)
        }
        setUser(user)
      } else {
        setUser(null)
        setAvatarUrl(null)
        setDisplayName("")
      }
    }

    checkAdminStatus()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden">
            <Image src={parklanPaloozaLogo} alt="Parklan" fill className="object-contain" priority />
          </div>
          <span className="font-bold text-lg glow-text hidden sm:inline">GameVerse</span>
        </Link>

        {/* Desktop Navigation - Main items + More dropdown */}
        <div className="hidden md:flex items-center gap-1">
          {mainNavItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={`${
                  pathname === item.href
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-primary/10"
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Button>
            </Link>
          ))}

          {/* More Menu Dropdown */}
          {mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-primary/10">
                  More
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {moreNavItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="cursor-pointer">
                      <span className="mr-2">{item.icon}</span>
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-primary/10" disabled>
              More
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          )}

          {isAdmin && (
            <Link href="/admin/dashboard">
              <Button variant="ghost" className="text-muted-foreground hover:text-accent hover:bg-accent/10">
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </Link>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full p-0">
                  <Avatar>
                    <AvatarImage src={avatarUrl || undefined} alt={displayName || "Profile"} />
                    <AvatarFallback>{(displayName || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    Profile
                  </Link>
                </DropdownMenuItem>
                {isAdmin ? (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/dashboard" className="cursor-pointer">
                      Admin
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button variant="outline" className="border-border bg-transparent">
                Login
              </Button>
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-background/95 backdrop-blur border-b border-border md:hidden">
            <div className="p-4 space-y-2">
              {[...mainNavItems, ...moreNavItems].map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${
                      pathname === item.href
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Button>
                </Link>
              ))}

              {isAdmin && (
                <Link href="/admin/dashboard">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-accent"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
