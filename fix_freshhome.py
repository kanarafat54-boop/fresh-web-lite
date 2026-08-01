from pathlib import Path

p = Path("src/design/icons/FreshHomeIcon.tsx")
s = p.read_text()

s = s.replace('import React from "react";\n', '')

p.write_text(s)
