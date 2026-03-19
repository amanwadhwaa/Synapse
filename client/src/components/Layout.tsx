import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Brain,
  Home,
  BookOpen,
  Calendar,
  FileText,
  BarChart3,
  User,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useAuthStore } from '../stores/auth'
import { useState } from 'react'
import PomodoroTimer from './PomodoroTimer'

interface LayoutProps {
  children: React.ReactNode
}

function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Notes', href: '/notes', icon: FileText },
    { name: 'Study Planner', href: '/planner', icon: Calendar },
    { name: 'Quizzes', href: '/quizzes', icon: BookOpen },
    { name: 'Performance', href: '/performance', icon: BarChart3 },
    { name: 'Profile', href: '/profile', icon: User },
  ]

  return (
    <div className="min-h-screen bg-[#030303]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-500 ease-snappy lg:translate-x-0 lg:fixed ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full glass">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-violet-400 rounded-full animate-pulse"></div>
              </div>
              <span className="font-serif text-xl text-white tracking-tight">
                Synapse
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-neutral-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-violet-500/15 text-violet-300 shadow-[0_0_20px_-10px_rgba(139,92,246,0.4)] border border-violet-500/20'
                      : 'text-neutral-400 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="px-4 py-6 border-t border-white/10">
            <div className="flex items-center space-x-3 mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-cyan-400 rounded-xl flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-neutral-500 text-xs truncate">
                  {user?.email || 'user@example.com'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-neutral-400 hover:bg-white/5 hover:text-white rounded-xl transition-all duration-300 border border-transparent hover:border-white/5"
            >
              <LogOut className="h-4 w-4 mr-3" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="lg:hidden glass border-b border-white/10 px-4 py-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* Pomodoro Timer */}
      <PomodoroTimer />
    </div>
  )
}

export default Layout