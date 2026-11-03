import React from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Compass, PenTool, Users, UserCircle, LogOut } from "lucide-react";
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
          <span className="text-sm text-white/70 hidden md:block">{me && displayName(me)}</span>
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => base44.auth.logout()} aria-label="Log out">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>
      {me && !me.username && (
        <div className="bg-primary/15 text-foreground text-sm text-center py-2 border-b border-primary/40">
          Pick a username so teammates know who you are. <Link to="/profile" className="underline font-medium">Set it now</Link>
        </div>
      )}
      <main className="max-w-6xl mx-auto px-4 py-8"><Outlet /></main>
    </div>
  );
}