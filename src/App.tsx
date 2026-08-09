import { useState, useEffect } from 'react'
import './App.css'

import AppConfig from './config/app.config'

import { useFreshId } from './features/fresh-id/context/FreshIdContext'
import { AuthForm } from './features/fresh-id/components/AuthForm'

import { AdminPanel } from './features/admin/AdminPanel'
import { ShortsModule } from './features/shorts/components/ShortsModule'
import { SavedModule } from './features/saved/components/SavedModule'
import HomeDashboard from './features/home/HomeDashboard'
import {
  FilmIcon,
  SearchIcon,
  BellIcon,
  ChevronDownIcon,
  PlusIcon,
  EditIcon,
  BackIcon,
  HomeIcon,
  AIIcon,
  WalletIcon,
  ProfileIcon,
} from './components/Icons'

import {
  ProfileNavProvider,
  useProfileNav,
} from './features/profile/context/ProfileNavContext'

import { ProfileView } from './features/profile/components/ProfileView'
import FreshAIHome from './features/ai/components/FreshAIHome'

type ModuleKey =
  | 'notes'
  | 'tasks'
  | 'calculator'
  | 'log'
  | 'feed'
  | 'shorts'
  | 'saved'
  | 'profile'
  | 'wallet'
  | 'ai'
  | 'admin'

type Theme = 'dark' | 'light'

type PasskeySummary = {
  id: string
  friendly_name?: string
  created_at: string
  last_used_at?: string
}

interface Note {
  id: string
  text: string
  createdAt: number
}

function NotesModule() {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('keystone_notes')
    return saved ? JSON.parse(saved) : []
  })
  const [draft, setDraft] = useState('')

  useEffect(() => {
    localStorage.setItem('keystone_notes', JSON.stringify(notes))
  }, [notes])

  function addNote() {
    if (!draft.trim()) return
    setNotes([{ id: crypto.randomUUID(), text: draft.trim(), createdAt: Date.now() }, ...notes])
    setDraft('')
  }

  function deleteNote(id: string) {
    setNotes(notes.filter((n) => n.id !== id))
  }

  return (
    <div className="module">
      <h2>Notes</h2>
      <div className="note-input-row">
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a note..." className="note-input" />
        <button className="add-note-btn" onClick={addNote}>Add Note</button>
      </div>
      {notes.length === 0 && <p className="empty-state">No notes yet.</p>}
      <ul className="notes-list">
        {notes.map((n) => (
          <li key={n.id} className="note-item">
            <span>{n.text}</span>
            <button onClick={() => deleteNote(n.id)} className="delete-note-btn">×</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Placeholder({ name }: { name: string }) {
  return (
    <div className="module">
      <h2>{name}</h2>
      <p className="empty-state">{name} module coming soon.</p>
    </div>
  )
}

function TopBar({ onToggleAccount, accountOpen }: { onToggleAccount: () => void; accountOpen: boolean }) {
  const { user } = useFreshId()
  const initial = user?.fullName?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="top-bar fresh-topbar">
      <div className="brand">
        <div className="brand-mark fresh-gradient">F</div>
        <div className="brand-text">
          <span className="brand-name">Fresh Web Lite</span>
          <span className="brand-tagline">One Account. Everything Connected.</span>
        </div>
      </div>
      <div className="top-bar-actions">
        <button className="icon-only-btn ai-btn"><AIIcon size={22} /></button>
        <button className="icon-only-btn search-btn"><SearchIcon size={20} /></button>
        <button className="icon-only-btn notify-btn"><BellIcon size={20} /></button>
        {user && (
          <button className="avatar-chip premium-avatar" onClick={onToggleAccount}>
            <span className="avatar-circle">{initial}</span>
            <ChevronDownIcon size={16} className={accountOpen ? 'chevron-open' : ''} />
          </button>
        )}
      </div>
    </div>
  )
}

function AccountPanel({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { user, isGuest, logout, registerPasskey, listPasskeys, removePasskey, message, error } = useFreshId()
  const [passkeys, setPasskeys] = useState<PasskeySummary[]>([])
  const [securityBusy, setSecurityBusy] = useState(false)

  useEffect(() => {
    if (!user || isGuest) {
      setPasskeys([])
      return
    }
    void listPasskeys().then(setPasskeys)
  }, [user, isGuest, listPasskeys])

  if (!user) return null

  const shortId = user.id.split('-')[0]

  async function setupBiometric() {
    setSecurityBusy(true)
    const passkey = await registerPasskey()
    if (passkey) setPasskeys((current) => [...current, passkey])
    setSecurityBusy(false)
  }

  async function revokeBiometric(id: string) {
    setSecurityBusy(true)
    await removePasskey(id)
    setPasskeys((current) => current.filter((passkey) => passkey.id !== id))
    setSecurityBusy(false)
  }

  return (
    <div className="account-panel">
      <div className="fresh-id-row">
        <span className="fresh-id-name">{user.fullName}</span>
        <span className="fresh-id-tier">{isGuest ? 'guest' : user.subscription.tier}</span>
      </div>
      <div className="fresh-id-row fresh-id-meta">
        <span>@{user.username}</span>
        <span className="fresh-id-key">ID: {shortId}</span>
        <span>{user.role}</span>
      </div>
      <div className="theme-toggle-row">
        <span>Theme</span>
        <button className="icon-btn-outline" onClick={onToggleTheme}>{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</button>
      </div>

      {!isGuest && (
        <div className="fresh-security-panel">
          <strong>Fresh ID Security</strong>
          <p>Use this device's biometric or secure screen lock to sign in without your password.</p>
          <button className="icon-btn-outline" onClick={() => void setupBiometric()} disabled={securityBusy}>
            {securityBusy ? 'Verifying…' : passkeys.length ? 'Add another biometric' : 'Enable biometric sign-in'}
          </button>
          {passkeys.length > 0 && (
            <div className="passkey-list">
              {passkeys.map((passkey) => (
                <div className="fresh-id-row" key={passkey.id}>
                  <span>{passkey.friendly_name || 'This device'}</span>
                  <button className="auth-tab" onClick={() => void revokeBiometric(passkey.id)} disabled={securityBusy}>Remove</button>
                </div>
              ))}
            </div>
          )}
          {message && <p className="auth-message">{message}</p>}
          {error && <p className="auth-error">{error}</p>}
        </div>
      )}

      <button className="logout-btn" onClick={() => void logout()}>Sign out</button>
    </div>
  )
}

function CreateFab({ onNewShort, onNewPost }: { onNewShort: () => void; onNewPost: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {open && <div className="create-fab-backdrop" onClick={() => setOpen(false)} />}
      <div className="create-fab-wrap">
        {open && (
          <div className="create-fab-options">
            <button className="create-fab-option" onClick={() => { onNewPost(); setOpen(false) }}><span className="create-fab-option-icon"><EditIcon size={16} /></span>New Post</button>
            <button className="create-fab-option" onClick={() => { onNewShort(); setOpen(false) }}><span className="create-fab-option-icon"><FilmIcon size={16} /></span>New Short</button>
          </div>
        )}
        <button className={open ? 'create-fab-main open' : 'create-fab-main'} onClick={() => setOpen((v) => !v)}><PlusIcon size={26} /></button>
      </div>
    </>
  )
}

function AppContent() {
  const { user, loading } = useFreshId()
  const { viewingUserId, closeProfile } = useProfileNav()
  const [active, setActive] = useState<ModuleKey>('ai')
  const [accountOpen, setAccountOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('fresh_theme') as Theme) || 'dark')
  const [shortsComposerSignal, setShortsComposerSignal] = useState(0)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('fresh_theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  const modules: { key: ModuleKey; label: string; Icon: React.FC<{ size?: number; className?: string }> }[] = [
    { key: 'feed', label: 'Home', Icon: HomeIcon },
    { key: 'shorts', label: 'Feed', Icon: FilmIcon },
    { key: 'ai', label: 'Fresh AI', Icon: AIIcon },
    { key: 'wallet', label: 'Wallet', Icon: WalletIcon },
    { key: 'profile', label: 'Profile', Icon: ProfileIcon },
  ]

  const isImmersive = active === 'shorts'

  return (
    <div className="app-shell">
      {!loading && user && !isImmersive && <TopBar onToggleAccount={() => setAccountOpen((v) => !v)} accountOpen={accountOpen} />}
      {!loading && user && accountOpen && !isImmersive && <AccountPanel theme={theme} onToggleTheme={toggleTheme} />}
      {loading && <header className="app-header"><h1>{AppConfig.app.name}</h1><p className="app-slogan">Loading...</p></header>}
      {!loading && !user && (
        <header className="app-header">
          <h1>{AppConfig.app.name}</h1>
          <p className="app-slogan">{AppConfig.app.slogan}</p>
          <AuthForm />
        </header>
      )}
      {user && (
        <>
          <main className={isImmersive ? 'app-main app-main-immersive' : 'app-main'}>
            {active === 'notes' && <NotesModule />}
            {active === 'admin' && <AdminPanel />}
            {active === 'tasks' && <Placeholder name="Tasks" />}
            {active === 'calculator' && <Placeholder name="Calculator" />}
            {active === 'log' && <Placeholder name="Log" />}
            {active === 'ai' && <FreshAIHome />}
            {active === 'feed' && <HomeDashboard />}
            {active === 'shorts' && <ShortsModule openComposerSignal={shortsComposerSignal} onExit={() => setActive('feed')} />}
            {active === 'saved' && <SavedModule />}
            {active === 'profile' && <ProfileView userId={user.id} onClose={() => undefined} />}
          </main>

          {!isImmersive && (
            <nav className="app-nav">
              {modules.map((m) => (
                <button key={m.key} className={active === m.key ? 'nav-btn active' : 'nav-btn'} onClick={() => setActive(m.key)}>
                  <m.Icon size={22} />
                  <span>{m.label}</span>
                </button>
              ))}
            </nav>
          )}

          {isImmersive && <button className="immersive-back-btn" onClick={() => setActive('feed')}><BackIcon size={22} /></button>}
          {!isGuestCheck(user) && <CreateFab onNewPost={() => setActive('feed')} onNewShort={() => { setActive('shorts'); setShortsComposerSignal((n) => n + 1) }} />}
        </>
      )}
      {viewingUserId && <ProfileView userId={viewingUserId} onClose={closeProfile} />}
    </div>
  )
}

function isGuestCheck(user: ReturnType<typeof useFreshId>['user']) {
  return user?.username === 'guest'
}

function App() {
  return (
    <ProfileNavProvider>
      <AppContent />
    </ProfileNavProvider>
  )
}

export default App
