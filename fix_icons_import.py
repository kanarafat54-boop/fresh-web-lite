from pathlib import Path

p = Path("src/App.tsx")
s = p.read_text()

start = s.index("import {", s.index("import { SavedModule"))

end = s.index("} from './components/Icons'", start) + len("} from './components/Icons'")

new = """import {
  NotesIcon,
  TasksIcon,
  CalcIcon,
  LogIcon,
  FilmIcon,
  BookmarkIcon,
  SettingsIcon,
  SearchIcon,
  BellIcon,
  ChevronDownIcon,
  PlusIcon,
  EditIcon,
  BackIcon,
  HomeIcon,
  AIIcon,
} from './components/Icons'"""

s = s[:start] + new + s[end:]

p.write_text(s)
