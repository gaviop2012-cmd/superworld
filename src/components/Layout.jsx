import React from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { Compass, PenTool, Users, UserCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import useMe, { displayName } from "@/lib/useMe";

const links = [
  ["/", "Discover", Compass, true],
  ["/studio", "Creator Studio", PenTool],
  ["/teams", "Teams", Users],
  ["/profile", "Profile", UserCircle],
];

export default function Layout() {
  const { data: me } = useMe();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
          <Link to="/" className="font-display text-xl tracking-wide">WORLD<span className="text-primary">QUEST</span></Link>
          <nav className="flex gap-1 flex-1 overflow-x-auto">
            {links.map(([to, label, Icon, end]) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap ${isActive ? "bg-white/15" : "text-white/70 hover:text-white"}`}>
                <Icon className="w-4 h-4" /><span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
          <span className="text-sm text-white/80 hidden md:block">{me && displayName(me)}</span>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" title="Copy your Player ID"
            onClick={() => navigator.clipboard?.writeText(me?.id || "")}>
            <Copy className="w-4 h-4 mr-1" /><span className="hidden sm:inline">{me?.id || "Player ID"}</span>
          </Button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8"><Outlet /></main>
    </div>
  );
}
