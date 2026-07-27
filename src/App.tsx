import { useState, useEffect } from 'react'
import './App.css'
import AppConfig from './config/app.config'
import { useFreshId } from './features/fresh-id/context/FreshIdContext'
import { AuthForm } from './features/fresh-id/components/AuthForm'
import { AdminPanel } from './features/admin/AdminPanel'
import { FeedModule } from './features/feed/components/FeedModule'
import { ShortsModule } from './features/shorts/components/ShortsModule'
import { SavedModule } from './features/saved/components/SavedModule'
import {
  NotesIcon, TasksIcon, CalcIcon, LogIcon, HomeIcon,
  FilmIcon, BookmarkIcon, SettingsIcon, SearchIcon, BellIcon, ChevronDownIcon,
  PlusIcon, EditIcon, BackIcon,
} from './components/Icons'
import { ProfileNavProvider, useProfileNav } from './features/profile/context/ProfileNavContext'
import { ProfileView } from './features/profile/components/ProfileView'

type ModuleKey = 'notes' | 'tasks' | 'calculator' | 'log' | 'feed' | 'shorts' | 'saved' | 'admin'
type Theme = 'dark' | 'light'

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
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a note..."
          className="note-input"
        />
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
    <div className="top-bar">
      <div className="brand">
        <div className="brand-mark">F</div>
        <span className="brand-name">Fresh Web Lite</span>
      </div>
      <div className="top-bar-actions">
        <button className="icon-only-btn"><SearchIcon size={20} /></button>
        <button className="icon-only-btn"><BellIcon size={20} /></button>
        {user && (
          <button className="avatar-chip" onClick={onToggleAccount}>
            <span className="avatar-circle">{initial}</span>
            <ChevronDownIcon size={16} className={accountOpen ? 'chevron-open' : ''} />
          </button>
        )}
      </div>
    </div>
  )
}

function AccountPanel({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { user, isGuest, logout } = useFreshId()
  if (!user) return null

  const shortId = user.id.split('-')[0]

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
        <button className="icon-btn-outline" onClick={onToggleTheme}>
          {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
        </button>
      </div>
      <button className="logout-btn" onClick={logout}>Sign out</button>
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
            <button className="create-fab-option" onClick={() => { onNewPost(); setOpen(false) }}>
              <span className="create-fab-option-icon"><EditIcon size={16} /></span>
              New Post
            </button>
            <button className="create-fab-option" onClick={() => { onNewShort(); setOpen(false) }}>
              <span className="create-fab-option-icon"><FilmIcon size={16} /></span>
              New Short
            </button>
          </div>
        )}
        <button
          className={open ? 'create-fab-main open' : 'create-fab-main'}
          onClick={() => setOpen((v) => !v)}
        >
          <PlusIcon size={26} />
        </button>
      </div>
    </>
  )
}

function AppContent() {
  const { user, loading } = useFreshId()
  const { viewingUserId, closeProfile } = useProfileNav()
  const [active, setActive] = useState<ModuleKey>('notes')
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
    { key: 'notes', label: 'Notes', Icon: NotesIcon },
    { key: 'tasks', label: 'Tasks', Icon: TasksIcon },
    { key: 'calculator', label: 'Calc', Icon: CalcIcon },
    { key: 'log', label: 'Log', Icon: LogIcon },
    { key: 'feed', label: 'Feed', Icon: HomeIcon },
    ...(AppConfig.features.shorts ? [{ key: 'shorts' as ModuleKey, label: 'Shorts', Icon: FilmIcon }] : []),
    ...(AppConfig.features.saved ? [{ key: 'saved' as ModuleKey, label: 'Saved', Icon: BookmarkIcon }] : []),
    ...(user?.role === 'admin' ? [{ key: 'admin' as ModuleKey, label: 'Admin', Icon: SettingsIcon }] : []),
  ]

  const isImmersive = active === 'shorts'

  return (
    <div className="app-shell">
      {!loading && user && !isImmersive && (
        <TopBar onToggleAccount={() => setAccountOpen((v) => !v)} accountOpen={accountOpen} />
      )}

      {!loading && user && accountOpen && !isImmersive && (
        <AccountPanel theme={theme} onToggleTheme={toggleTheme} />
      )}

      {loading && (
        <header className="app-header">
          <h1>{AppConfig.app.name}</h1>
          <p className="app-slogan">Loading...</p>
        </header>
      )}

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
            {active === 'feed' && <FeedModule />}
            {active === 'shorts' && <ShortsModule openComposerSignal={shortsComposerSignal} onExit={() => setActive('feed')} />}
            {active === 'saved' && <SavedModule />}
          </main>

          {!isImmersive && (
            <nav className="app-nav">
              {modules.map((m) => (
                <button
                  key={m.key}
                  className={active === m.key ? 'nav-btn active' : 'nav-btn'}
                  onClick={() => setActive(m.key)}
                >
                  <m.Icon size={22} />
                  <span>{m.label}</span>
                </button>
              ))}
            </nav>
          )}

          {isImmersive && (
            <button className="immersive-back-btn" onClick={() => setActive('feed')}>
              <BackIcon size={22} />
            </button>
          )}

          {!isGuestCheck(user) && (
            <CreateFab
              onNewPost={() => setActive('feed')}
              onNewShort={() => {
                setActive('shorts')
                setShortsComposerSignal((n) => n + 1)
              }}
            />
          )}
        </>
      )}

      {viewingUserId && <ProfileView userId={viewingUserId} onClose={closeProfile} />}
    </div>
  )
}

function isGuestCheck(user: any) {
  return user?.isGuest === true
}

function App() {
  return (
    <ProfileNavProvider>
      <AppContent />
    </ProfileNavProvider>
  )
}

export default App
