import { Link } from 'react-router-dom'
import { Brain, BookOpen, Mic, Camera, BarChart3, Timer, ArrowRight, Sparkles, Zap, Shield, Code2 } from 'lucide-react'

const TICKER_ITEMS = [
  { label: 'ACTIVE USERS', value: '12,847', color: 'text-white' },
  { label: 'NOTES PROCESSED', value: '2.4M', color: 'text-violet-400' },
  { label: 'QUIZZES GENERATED', value: '847K', color: 'text-cyan-400' },
  { label: 'AVG SCORE BOOST', value: '+23%', color: 'text-emerald-400' },
  { label: 'STUDY HOURS LOGGED', value: '1.8M', color: 'text-white' },
  { label: 'AI RESPONSES', value: '5.2M', color: 'text-violet-400' },
  { label: 'UPTIME', value: '99.99%', color: 'text-emerald-400' },
  { label: 'LANGUAGES', value: '7+', color: 'text-cyan-400' },
]

const FEATURES = [
  {
    icon: Camera,
    title: 'Multimodal Notes',
    description: 'Upload handwritten notes, record audio explanations, or type directly. Our AI extracts and organizes your content automatically.',
    gradient: 'from-violet-500/20 to-purple-600/20',
    iconBg: 'bg-violet-500/20',
    iconColor: 'text-violet-400',
  },
  {
    icon: Brain,
    title: 'AI Concept Engine',
    description: 'Get instant explanations, summaries, and custom quizzes generated from your notes using Google Gemini AI.',
    gradient: 'from-cyan-500/20 to-blue-600/20',
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
  },
  {
    icon: BookOpen,
    title: 'Adaptive Planning',
    description: 'Personalized study schedules that adapt based on your performance and exam dates. Never cram again.',
    gradient: 'from-emerald-500/20 to-teal-600/20',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    icon: Timer,
    title: 'Pomodoro Timer',
    description: 'Built-in focus timer with session tracking and productivity analytics. Stay focused and motivated.',
    gradient: 'from-violet-500/20 to-fuchsia-600/20',
    iconBg: 'bg-violet-500/20',
    iconColor: 'text-violet-300',
  },
  {
    icon: BarChart3,
    title: 'Performance Dashboard',
    description: 'Track your progress with detailed analytics, weak area identification, and study time insights.',
    gradient: 'from-cyan-500/20 to-indigo-600/20',
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-300',
  },
  {
    icon: Mic,
    title: 'Multilingual Support',
    description: 'Learn in your preferred language with Azure-powered translation and text-to-speech capabilities.',
    gradient: 'from-violet-500/20 to-pink-600/20',
    iconBg: 'bg-violet-500/20',
    iconColor: 'text-violet-300',
  },
]

function Landing() {
  return (
    <div className="min-h-screen bg-[#030303] relative overflow-hidden">
      {/* ── Floating Orbs ────────────────────────────── */}
      <div className="orb orb-violet w-[500px] h-[500px] -top-32 left-1/2 -translate-x-1/2 opacity-40" style={{ animationDuration: '10s' }}></div>
      <div className="orb orb-cyan w-[400px] h-[400px] top-1/4 -left-20 opacity-20" style={{ animationDuration: '14s', animationDelay: '-3s' }}></div>
      <div className="orb orb-violet w-[350px] h-[350px] bottom-1/4 -right-20 opacity-20" style={{ animationDuration: '12s', animationDelay: '-5s' }}></div>

      {/* ── Fixed Navigation Pill ─────────────────────── */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-[672px]">
        <nav className="glass rounded-full px-5 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400"></div>
            <span className="font-serif text-lg text-white tracking-tight">Synapse</span>
          </Link>

          <div className="hidden sm:flex items-center space-x-6">
            <a href="#features" className="text-xs uppercase tracking-widest text-neutral-400 hover:text-white transition-colors">Features</a>
            <a href="#code" className="text-xs uppercase tracking-widest text-neutral-400 hover:text-white transition-colors">Integrate</a>
          </div>

          <Link
            to="/register"
            className="bg-white text-black px-5 py-1.5 rounded-full text-sm font-semibold hover:bg-neutral-200 transition-colors"
          >
            Get Started
          </Link>
        </nav>
      </header>

      {/* ── Hero Section ─────────────────────────────── */}
      <section className="relative px-6 pt-36 pb-16">
        <div className="max-w-5xl mx-auto text-center">
          <div className="stagger-in mb-8" style={{ animationDelay: '0.1s' }}>
            <div className="inline-flex items-center px-4 py-2 rounded-full glass mb-8">
              <Sparkles className="h-4 w-4 text-violet-400 mr-2" />
              <span className="text-xs uppercase tracking-widest text-neutral-400">The Future of Learning</span>
            </div>

            <h1 className="font-serif text-6xl sm:text-7xl md:text-8xl lg:text-9xl leading-[0.9] tracking-tightest mb-8">
              <span className="text-white">Cognitive</span>
              <br />
              <span className="text-white">Operating </span>
              <span className="text-shimmer">System</span>
            </h1>

            <p className="max-w-2xl mx-auto text-lg text-neutral-400 leading-relaxed font-light">
              Transform your learning with AI-powered note ingestion, adaptive study planning,
              and intelligent quiz generation. Study smarter, not harder.
            </p>
          </div>

          <div className="stagger-in flex flex-col sm:flex-row gap-5 justify-center items-center mb-16" style={{ animationDelay: '0.5s' }}>
            <Link to="/register" className="shiny-border-btn">
              <span className="px-10 py-4 text-white font-semibold text-base inline-flex items-center">
                Start Learning Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </span>
            </Link>
            <button className="group flex items-center text-neutral-400 hover:text-white transition-colors text-sm">
              <Zap className="mr-2 h-4 w-4" />
              Watch Demo
            </button>
          </div>

          {/* Trust indicators */}
          <div className="stagger-in flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-8 text-neutral-500 text-sm" style={{ animationDelay: '0.8s' }}>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>Enterprise Security</span>
            </div>
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-violet-400" />
              <span>AI-Powered</span>
            </div>
            <div className="flex items-center space-x-2">
              <Timer className="h-4 w-4 text-cyan-400" />
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Metrics Ticker ───────────────────────────── */}
      <section className="relative border-y border-white/5 bg-black/40 overflow-hidden py-4">
        <div className="ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <div key={i} className="flex items-center mx-8 shrink-0">
              <div className="mr-3">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 block">{item.label}</span>
              </div>
              <span className={`text-base font-mono font-semibold ${item.color}`}>{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────── */}
      <section id="features" className="relative px-6 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white mb-6 tracking-tight">
              Everything you need to
              <span className="block text-shimmer">excel in your studies</span>
            </h2>
            <p className="text-lg text-neutral-400 max-w-2xl mx-auto font-light">
              Powerful features designed by students, for students
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="group glass-card rounded-3xl p-10 hover:-translate-y-3 transition-all duration-500 hover:border-violet-500/40 hover:bg-white/[0.04] hover:shadow-[0_0_30px_-10px_rgba(139,92,246,0.3)]"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`w-12 h-12 ${feature.iconBg} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                    <Icon className={`h-6 w-6 ${feature.iconColor}`} />
                  </div>
                  <h3 className="font-serif text-xl text-white mb-3">{feature.title}</h3>
                  <p className="text-neutral-400 leading-relaxed text-sm font-light">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Code Integration Block ───────────────────── */}
      <section id="code" className="relative px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl md:text-5xl text-white mb-4 tracking-tight">
              Integrate in <span className="text-shimmer">seconds</span>
            </h2>
            <p className="text-neutral-400 text-lg font-light">Start building with SYNAPSE right away</p>
          </div>

          <div className="glass rounded-3xl overflow-hidden">
            {/* IDE Toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500/40"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/40"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/40"></div>
              </div>
              <span className="font-mono text-xs text-neutral-500">synapse.config.ts</span>
              <Code2 className="h-4 w-4 text-neutral-600" />
            </div>

            {/* Code Content */}
            <div className="p-6 font-mono text-sm leading-7">
              <div><span className="text-violet-400">import</span> <span className="text-white">{'{'} Synapse {'}'}</span> <span className="text-violet-400">from</span> <span className="text-emerald-400">'@synapse/core'</span></div>
              <div className="text-neutral-600">{'// Initialize the cognitive engine'}</div>
              <div className="mt-2"><span className="text-violet-400">const</span> <span className="text-cyan-400">engine</span> <span className="text-white">= </span><span className="text-violet-400">new</span> <span className="text-cyan-400">Synapse</span><span className="text-white">({'{'}</span></div>
              <div className="pl-6"><span className="text-white">model: </span><span className="text-emerald-400">'gemini-pro'</span><span className="text-white">,</span></div>
              <div className="pl-6"><span className="text-white">features: [</span><span className="text-emerald-400">'notes'</span><span className="text-white">, </span><span className="text-emerald-400">'quizzes'</span><span className="text-white">, </span><span className="text-emerald-400">'planner'</span><span className="text-white">],</span></div>
              <div className="pl-6"><span className="text-white">language: </span><span className="text-emerald-400">'multi'</span></div>
              <div><span className="text-white">{'}'})</span></div>
              <div className="mt-2"><span className="text-violet-400">await</span> <span className="text-cyan-400">engine</span><span className="text-white">.start()</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────── */}
      <section className="relative px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass rounded-3xl p-12 relative overflow-hidden">
            <div className="orb orb-violet w-48 h-48 -top-12 -left-12 opacity-30" style={{ animationDuration: '6s' }}></div>
            <div className="orb orb-cyan w-32 h-32 -bottom-8 -right-8 opacity-25" style={{ animationDuration: '8s' }}></div>

            <div className="relative z-10">
              <h2 className="font-serif text-4xl md:text-5xl text-white mb-6 tracking-tight">
                Ready to transform your learning?
              </h2>
              <p className="text-lg text-neutral-400 mb-8 max-w-2xl mx-auto font-light">
                Join thousands of students who are already studying smarter with SYNAPSE.
                Start your free trial today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link to="/register" className="shiny-border-btn">
                  <span className="px-8 py-3.5 text-white font-semibold inline-flex items-center">
                    Start Your Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </span>
                </Link>
                <span className="text-neutral-500 text-sm">No credit card required</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="bg-[#050505] border-t border-white/5 px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-2.5 mb-4">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400"></div>
                <span className="font-serif text-2xl text-white">Synapse</span>
              </div>
              <p className="text-neutral-500 text-sm font-light leading-relaxed">The Cognitive Operating System for Students.</p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-[10px] font-sans uppercase tracking-[0.2em] text-neutral-500 mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-neutral-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-sans uppercase tracking-[0.2em] text-neutral-500 mb-4">Resources</h4>
              <ul className="space-y-2.5 text-sm text-neutral-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-sans uppercase tracking-[0.2em] text-neutral-500 mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-neutral-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-neutral-500">
            <span>© 2026 SYNAPSE. All rights reserved.</span>
            <div className="flex items-center space-x-2 mt-2 sm:mt-0">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-emerald-400">All Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing