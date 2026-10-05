"use client";

import Link from "next/link";

interface BottomNavProps {
  active: "home" | "flow" | "ai" | "ecosystems" | "profile";
}

export default function BottomNav({ active }: BottomNavProps) {
  const items = [
    { id: "home" as const, label: "Home", href: "/home", icon: "⌂" },
    { id: "flow" as const, label: "Flow", href: "/flow", icon: "▶" },
    { id: "ai" as const, label: "AI", href: "/home", icon: "✦" },
    { id: "ecosystems" as const, label: "Ecosystems", href: "/ecosystems", icon: "⬡" },
    { id: "profile" as const, label: "Profile", href: "/home", icon: "👤" },
  ];

  return (
    <nav className="bottom-nav absolute bottom-0 left-0 right-0 px-2 pt-2 pb-6 flex justify-around items-center z-40">
      {items.map((item) => {
        const isActive = active === item.id;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition ${
              isActive ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span className={`text-xl ${isActive ? "scale-110" : ""}`}>{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
