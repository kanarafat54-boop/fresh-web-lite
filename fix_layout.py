from pathlib import Path

p = Path("src/layouts/AppLayout.tsx")
s = p.read_text()

s = s.replace(
'import { ReactNode } from "react";',
'import type { ReactNode } from "react";'
)

p.write_text(s)
