'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  Briefcase,
  CalendarDays,
  Zap,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Bot,
  Scale,
  LogOut,
  User,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Contracts', href: '/contracts', icon: FileText },
  { label: 'Compliance', href: '/compliance', icon: ShieldCheck },
  { label: 'M&A & Regulatory', href: '/ma-regulatory', icon: Briefcase },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays },
  { label: 'Execution', href: '/execution', icon: Zap },
  { label: 'Clause Library', href: '/clause-library', icon: BookOpen },
  { label: 'Settings', href: '/settings', icon: Settings },
]

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [rightRailOpen, setRightRailOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error(error.message)
    } else {
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
      <aside
        className={`
          relative flex flex-col bg-white border-r border-gray-200 transition-all duration-200 shrink-0
          ${sidebarCollapsed ? 'w-16' : 'w-60'}
        `}
      >
        {/* Brand */}
        <div className="flex items-center h-14 px-4 border-b border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-brand-teal flex items-center justify-center">
              <Scale className="w-4 h-4 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-teal leading-none">
                  Para Systems AI
                </p>
                <p className="text-xs font-bold text-brand-teal-dark truncate">LexGuard Legal</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                title={sidebarCollapsed ? label : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150
                  ${
                    isActive
                      ? 'bg-brand-teal-light text-brand-teal'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                  ${sidebarCollapsed ? 'justify-center' : ''}
                `}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed((v) => !v)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-gray-500" />
          )}
        </button>
      </aside>

      {/* ── MAIN AREA ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP BAR */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center gap-4 px-4 shrink-0">
          {/* Global search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search contracts, clauses, matters…"
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Language toggle */}
            <button className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <span>EN</span>
              <span className="text-gray-300">/</span>
              <span className="font-devanagari">हिं</span>
            </button>

            {/* Notifications */}
            <button className="relative p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-gold rounded-full" />
            </button>

            {/* AI Assistant toggle */}
            <button
              onClick={() => setRightRailOpen((v) => !v)}
              className={`p-2 rounded-lg transition-colors ${
                rightRailOpen
                  ? 'bg-brand-teal text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
              title="AI Assistant"
            >
              <Bot className="w-4 h-4" />
            </button>

            {/* User avatar */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="w-8 h-8 rounded-full bg-brand-teal flex items-center justify-center text-white text-xs font-bold hover:bg-brand-teal-dark transition-colors"
              >
                A
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-900">Admin User</p>
                    <p className="text-xs text-gray-500 truncate">admin@democorp.com</p>
                  </div>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTENT + RIGHT RAIL */}
        <div className="flex flex-1 min-h-0">
          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-6">{children}</main>

          {/* RIGHT RAIL — AI Assistant */}
          {rightRailOpen && (
            <aside className="w-80 shrink-0 bg-white border-l border-gray-200 flex flex-col animate-slide-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-brand-teal" />
                  <span className="text-sm font-semibold text-gray-900">AI Assistant</span>
                </div>
                <button
                  onClick={() => setRightRailOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center p-6 text-center">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-teal-light flex items-center justify-center mx-auto">
                    <Bot className="w-6 h-6 text-brand-teal" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">Claude AI Assistant</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    AI-powered legal assistance will be available once modules are activated.
                  </p>
                  <span className="inline-block px-2.5 py-1 bg-brand-teal-light text-brand-teal text-xs font-medium rounded-full">
                    Coming in Phase 1
                  </span>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Click-away for user menu */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </div>
  )
}
