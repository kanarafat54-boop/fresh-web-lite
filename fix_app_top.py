from pathlib import Path

p = Path("src/App.tsx")
s = p.read_text()

start = s.index("import { useState")
end = s.index("interface Note")

new_top = """import { useState, useEffect } from 'react'
import './App.css'

import AppConfig from './config/app.config'

import { useFreshId } from './features/fresh-id/context/FreshIdContext'
import { AuthForm } from './features/fresh-id/components/AuthForm'

import { AdminPanel } from './features/admin/AdminPanel'
import { FeedModule } from './features/feed/components/FeedModule'
import { ShortsModule } from './features/shorts/components/ShortsModule'
import { SavedModule } from './features/saved/components/SavedModule'

import {
  NotesIcon,
  TasksIcon,
  CalcIcon,
  LogIcon,
  FeedIcon,
  FilmIcon,
  BookmarkIcon,
  SettingsIcon,
  SearchIcon,
  BellIcon,
  ChevronDownIcon,
  PlusIcon,
  EditIcon,
  BackIcon,
  FreshIdIcon,
  AIIcon,
  WalletIcon,
  ProfileIcon,
} from './components/Icons'

import {
  ProfileNavProvider,
  useProfileNav,
} from './features/profile/context/ProfileNavContext'

import { ProfileView } from './features/profile/components/ProfileView'

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

"""

s = s[:start] + new_top + s[end:]

p.write_text(s)
