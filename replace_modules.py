from pathlib import Path

p = Path("src/App.tsx")
s = p.read_text()

start = s.index("const modules:")
end = s.index("  const isImmersive", start)

new = """const modules: { key: ModuleKey; label: string; Icon: React.FC<{ size?: number; className?: string }> }[] = [
    { key: 'feed', label: 'Home', Icon: HomeIcon },
    { key: 'shorts', label: 'Feed', Icon: FilmIcon },
    { key: 'ai', label: 'Fresh AI', Icon: AIIcon },
    { key: 'wallet', label: 'Wallet', Icon: WalletIcon },
    { key: 'profile', label: 'Profile', Icon: ProfileIcon },
  ]

"""

s = s[:start] + new + s[end:]

p.write_text(s)
