import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import ScrollToTop from "./components/ScrollToTop";
import Layout from "@/components/Layout";
import Discover from "@/pages/Discover";
import QuestPage from "@/pages/QuestPage";
import Studio from "@/pages/Studio";
import QuestEditor from "@/pages/QuestEditor";
import Teams from "@/pages/Teams";
import TeamRoom from "@/pages/TeamRoom";
import Profile from "@/pages/Profile";
import useMe from "@/lib/useMe";
import { Button } from "@/components/ui/button";

function AppRoutes() {
  const player = useMe();

  if (player.isLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Preparing your Player ID…</p>
      </div>
    );
  }

  if (player.isError) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <h1 className="font-display text-2xl">WorldQuest could not connect</h1>
        <p className="max-w-md text-sm text-muted-foreground">Your local Player ID is ready, but the game service did not respond. Check that the WorldQuest API service is running and try again.</p>
        <Button onClick={() => player.refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Discover />} />
        <Route path="/quest/:id" element={<QuestPage />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="/studio/new" element={<QuestEditor />} />
        <Route path="/studio/:id" element={<QuestEditor />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/teams/:id" element={<TeamRoom />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        <Route path="/forgot-password" element={<Navigate to="/" replace />} />
        <Route path="/reset-password" element={<Navigate to="/" replace />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollToTop />
        <AppRoutes />
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}
