from pathlib import Path

p = Path("src/App.tsx")
s = p.read_text()

s = s.replace(
"""  FeedIcon,
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
  ProfileIcon,""",
"""  FilmIcon,
  BookmarkIcon,
  SettingsIcon,
  SearchIcon,
  BellIcon,
  ChevronDownIcon,
  PlusIcon,
  EditIcon,
  BackIcon,
  HomeIcon,"""
)

p.write_text(s)
