"use client";

import Link from "next/link";

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="phone-frame relative z-10 min-h-[780px] flex flex-col">
        <div className="phone-notch" />

        <div className="flex justify-between items-center px-6 pt-3 pb-1 text-xs text-slate-400">
          <span>9:41</span>
          <div className="flex gap-1.5 items-center">
            <span className="w-4 h-2 border border-slate-400 rounded-sm relative">
              <span className="absolute inset-0.5 bg-slate-400 rounded-[1px]" />
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="mb-8 animate-fade-in-up">
            <div className="text-5xl font-bold tracking-tight mb-2">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                FWL
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-white tracking-wide">
              Fresh Web Lite
            </h1>
          </div>

          <div className="mb-10 space-y-3 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <p className="text-lg font-medium text-slate-200">
              The Universal AI Platform
            </p>
            <p className="text-sm text-slate-400 leading-relaxed max-w-[260px] mx-auto">
              Discover 32 ecosystems.<br />
              Create. Learn. Work. Earn.<br />
              All in one place.
            </p>
          </div>

          <div className="w-48 h-48 mb-12 relative animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/30 via-purple-500/20 to-pink-500/30 blur-xl" />
            <div className="absolute inset-4 rounded-full border border-blue-400/30 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/40">
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="w-full space-y-3 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <Link
              href="/auth"
              className="block w-full py-3.5 rounded-2xl btn-primary text-white font-semibold text-center text-base"
            >
              Get Started
            </Link>
            <Link
              href="/auth?mode=signin"
              className="block w-full py-3.5 rounded-2xl border border-slate-600 text-slate-200 font-medium text-center text-base hover:bg-slate-800/50 transition"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="pb-8 text-center">
          <p className="text-xs text-slate-500">
            Fresh Flow · Fresh AI · 32 Ecosystems
          </p>
        </div>
      </div>
    </div>
  );
}
