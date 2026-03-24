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
import ResponsibleAIBadge from './ResponsibleAIBadge'

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
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:fixed ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full bg-white/5 backdrop-blur-xl border-r border-white/10">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Brain className="h-8 w-8 text-[var(--color-primary)]" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--color-primary)] rounded-full animate-pulse"></div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                SYNAPSE
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-blue-500/25'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white hover:backdrop-blur-sm'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Responsible AI Badge */}
          <div className="px-4 py-2">
            <ResponsibleAIBadge />
          </div>

          {/* User section */}
          <div className="px-4 py-6 border-t border-white/10">
            <div className="flex items-center space-x-3 mb-4 p-3 rounded-xl bg-white/5 backdrop-blur-sm">
              <div className="w-10 h-10 bg-[var(--color-primary)] rounded-xl flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-gray-400 text-xs truncate">
                  {user?.email || 'user@example.com'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-gray-300 hover:bg-white/5 hover:text-white rounded-xl transition-all duration-200 hover:backdrop-blur-sm"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="lg:hidden bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 py-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white transition-colors"
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