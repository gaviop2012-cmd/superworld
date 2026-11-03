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

function AppRoutes() {
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
