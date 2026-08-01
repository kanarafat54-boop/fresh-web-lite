from pathlib import Path

p = Path("src/App.tsx")
s = p.read_text()

old = "            {active === 'feed' && <HomeDashboard />}"
new = """            {active === 'ai' && <FreshAIHome />}
            {active === 'feed' && <HomeDashboard />}"""

if "{active === 'ai' && <FreshAIHome />}" not in s:
    s = s.replace(old, new)

p.write_text(s)
print("FreshAIHome render added.")
