from pathlib import Path

p = Path("src/App.tsx")
s = p.read_text()

# Set AI as the default module
s = s.replace(
    "const [active, setActive] = useState<ModuleKey>('feed')",
    "const [active, setActive] = useState<ModuleKey>('ai')"
)

s = s.replace(
    "const [active, setActive] = useState<ModuleKey>('notes')",
    "const [active, setActive] = useState<ModuleKey>('ai')"
)

# Add FreshAIHome rendering
old = "{active === 'feed' && <FeedModule />}"
new = "{active === 'ai' && <FreshAIHome />}\n            {active === 'feed' && <FeedModule />}"
s = s.replace(old, new)

p.write_text(s)
print("Fresh AI activated.")
