import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 relative overflow-hidden">
      {/* Background ambient glow/gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgb(148 163 184) 1px, transparent 1px),
            linear-gradient(90deg, rgb(148 163 184) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Centered Premium Split Card */}
      <div className="relative z-10 w-full max-w-4xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col md:flex-row overflow-hidden rounded-2xl min-h-[540px]">
        {children}
      </div>
    </div>
  );
}
