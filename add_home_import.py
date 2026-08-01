from pathlib import Path

p = Path("src/App.tsx")
s = p.read_text()

target = "import { SavedModule } from './features/saved/components/SavedModule'"

replacement = target + "\nimport HomeDashboard from './features/home/HomeDashboard'"

if "HomeDashboard" not in s:
    s = s.replace(target, replacement)

p.write_text(s)
