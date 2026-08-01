from pathlib import Path

p = Path("src/App.tsx")
s = p.read_text()

s = s.replace(
"""  NotesIcon,
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
  AIIcon,""",
"""  FilmIcon,
  SearchIcon,
  BellIcon,
  ChevronDownIcon,
  PlusIcon,
  EditIcon,
  BackIcon,
  HomeIcon,
  AIIcon,
  WalletIcon,
  ProfileIcon,"""
)

p.write_text(s)
