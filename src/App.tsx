import { useState, useEffect } from 'react'
import './App.css'
import AppConfig from './config/app.config'
import { useFreshId } from './features/fresh-id/context/FreshIdContext'
import { AuthForm } from './features/fresh-id/components/AuthForm'
import { AdminPanel } from './features/admin/AdminPanel'
import { FeedModule } from './features/feed/components/FeedModule'

type ModuleKey = 'notes' | 'tasks' | 'calculator' | 'log' | 'feed' | 'admin'

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

function FreshIdBadge() {
  const { user, isGuest, logout } = useFreshId()
  if (!user) return null

  const shortId = user.id.split('-')[0]

  return (
    <div className="fresh-id-badge">
      <div className="fresh-id-row">
        <span className="fresh-id-name">{user.fullName}</span>
        <span className="fresh-id-tier">{isGuest ? 'guest' : user.subscription.tier}</span>
      </div>
      <div className="fresh-id-row fresh-id-meta">
        <span>@{user.username}</span>
        <span className="fresh-id-key">ID: {shortId}</span>
        <span>{user.role}</span>
      </div>
      <button className="logout-btn" onClick={logout}>Sign out</button>
    </div>
  )
}

function App() {
  const { user, loading } = useFreshId()
  const [active, setActive] = useState<ModuleKey>('notes')

  const modules: { key: ModuleKey; label: string }[] = [
    { key: 'notes', label: 'Notes' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'calculator', label: 'Calculator' },
    { key: 'log', label: 'Log' },
    { key: 'feed', label: 'Feed' },
    ...(user?.role === 'admin' ? [{ key: 'admin' as ModuleKey, label: 'Admin' }] : []),
  ]

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>{AppConfig.app.name}</h1>
        <p className="app-slogan">{AppConfig.app.slogan}</p>
        {loading && <p className="app-user">Loading...</p>}
        {!loading && user && <FreshIdBadge />}
        {!loading && !user && <AuthForm />}
      </header>

      {user && (
        <>
          <nav className="app-nav">
            {modules.map((m) => (
              <button
                key={m.key}
                className={active === m.key ? 'nav-btn active' : 'nav-btn'}
                onClick={() => setActive(m.key)}
              >
                {m.label}
              </button>
            ))}
          </nav>
          <main className="app-main">
            {active === 'notes' && <NotesModule />}
            {active === 'admin' && <AdminPanel />}
            {active === 'tasks' && <Placeholder name="Tasks" />}
            {active === 'calculator' && <Placeholder name="Calculator" />}
            {active === 'log' && <Placeholder name="Log" />}
            {active === 'feed' && <FeedModule />}
          </main>
        </>
      )}
    </div>
  )
}

export default App
