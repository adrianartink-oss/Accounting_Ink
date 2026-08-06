import { useEffect } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import {
  BarChart3,
  LayoutDashboard,
  ListChecks,
  ScanLine,
  PlusCircle,
  Store,
  Settings as SettingsIcon,
} from 'lucide-react'
import { useSettings } from './store/hooks'
import { updateSettings } from './db/schema'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import AddTransaction from './pages/AddTransaction'
import Scan from './pages/Scan'
import Reports from './pages/Reports'
import Categories from './pages/Categories'
import Recurring from './pages/Recurring'
import Studio from './pages/Studio'
import SettingsPage from './pages/SettingsPage'
import Disclaimer from './components/Disclaimer'

const NAV = [
  { to: '/', label: 'Übersicht', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Buchungen', icon: ListChecks, end: false },
  { to: '/add', label: 'Erfassen', icon: PlusCircle, end: false },
  { to: '/scan', label: 'Scan', icon: ScanLine, end: false },
  { to: '/reports', label: 'Berichte', icon: BarChart3, end: false },
  { to: '/studio', label: 'Studio', icon: Store, end: false },
  { to: '/settings', label: 'Einstellungen', icon: SettingsIcon, end: false },
] as const

function useThemeEffect() {
  const settings = useSettings()
  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', settings.theme)
  }, [settings.theme])
}

export default function App() {
  useThemeEffect()
  const settings = useSettings()

  if (!settings.disclaimerAccepted) {
    return <Disclaimer onAccept={() => updateSettings({ disclaimerAccepted: true })} />
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row" style={{ background: 'var(--bg)' }}>
      {/* Sidebar (ab lg) */}
      <aside
        className="safe-top hidden w-64 shrink-0 flex-col gap-1 border-r p-4 lg:flex"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-elev)' }}
      >
        <div className="mb-6 px-2">
          <div className="font-brand text-2xl" style={{ color: 'var(--accent)' }}>
            Buchhaltung
          </div>
          <div className="text-sm" style={{ color: 'var(--muted)' }}>
            EÜR · DE / ES
          </div>
        </div>
        {NAV.map((item) => (
          <SideNavItem key={item.to} {...item} />
        ))}
      </aside>

      {/* Inhalt */}
      <main className="safe-top flex-1 overflow-y-auto pb-28 lg:pb-8">
        <div className="mx-auto w-full max-w-4xl px-4 py-4 lg:px-8 lg:py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/add" element={<AddTransaction />} />
            <Route path="/add/:id" element={<AddTransaction />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/recurring" element={<Recurring />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>

      {/* Bottom-Tabbar (unter lg) */}
      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex justify-around border-t px-1 pt-1 lg:hidden"
        style={{
          borderColor: 'var(--border)',
          background: 'color-mix(in srgb, var(--bg-elev) 92%, transparent)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {NAV.map((item) => (
          <BottomNavItem key={item.to} {...item} />
        ))}
      </nav>
    </div>
  )
}

function SideNavItem({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-base font-medium transition"
      style={({ isActive }) => ({
        background: isActive ? 'var(--accent)' : 'transparent',
        color: isActive ? 'var(--accent-fg)' : 'var(--muted)',
      })}
    >
      <Icon size={20} />
      {label}
    </NavLink>
  )
}

function BottomNavItem({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-medium"
      style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--muted)' })}
    >
      <Icon size={22} />
      <span className="truncate">{label}</span>
    </NavLink>
  )
}
