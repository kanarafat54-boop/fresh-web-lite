from pathlib import Path

p = Path("src/App.tsx")
s = p.read_text()

imp = "import FreshAIHome from './features/ai/components/FreshAIHome'"

if imp not in s:
    marker = "import { ProfileView } from './features/profile/components/ProfileView'"
    s = s.replace(marker, marker + "\n" + imp)

p.write_text(s)
print("FreshAIHome import added.")
