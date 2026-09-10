import type { ReactNode } from "react";

function inline(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => part.startsWith("`") && part.endsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>);
}
export default function FreshAIRichText({ text }: { text: string }) {
  const blocks = text.split(/```([\w+-]*)\n?([\s\S]*?)```/g);
  const out: ReactNode[] = [];
  for (let i = 0; i < blocks.length; i += 3) {
    const prose = blocks[i] || "";
    prose.split(/\n{2,}/).forEach((paragraph, p) => {
      if (!paragraph.trim()) return;
      const lines = paragraph.split("\n");
      if (lines.every(x => /^[-*]\s+/.test(x))) out.push(<ul key={`u-${i}-${p}`}>{lines.map((x, n) => <li key={n}>{inline(x.replace(/^[-*]\s+/, ""))}</li>)}</ul>);
      else if (lines.every(x => /^\d+\.\s+/.test(x))) out.push(<ol key={`o-${i}-${p}`}>{lines.map((x, n) => <li key={n}>{inline(x.replace(/^\d+\.\s+/, ""))}</li>)}</ol>);
      else out.push(<p key={`p-${i}-${p}`}>{lines.map((x, n) => <span key={n}>{inline(x)}{n < lines.length - 1 && <br />}</span>)}</p>);
    });
    if (i + 2 < blocks.length) out.push(<pre key={`c-${i}`}><code>{blocks[i + 2]}</code></pre>);
  }
  return <div className="fresh-ai-rich-text">{out}</div>;
}
