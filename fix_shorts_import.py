from pathlib import Path

p = Path("src/features/shorts/components/ShortsModule.tsx")
s = p.read_text()

s = s.replace(
"FilmIcon, ScissorsIcon, CommentIcon, BookmarkIcon, PlusIcon, BackIcon, ShareIcon,",
"FilmIcon, ScissorsIcon, CommentIcon, BookmarkIcon, BackIcon, ShareIcon,"
)

p.write_text(s)
