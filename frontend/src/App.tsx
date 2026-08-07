import { useMemo, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Topbar } from "./components/Topbar";
import { Dashboard } from "./pages/Dashboard";
import { CalendarPage } from "./pages/CalendarPage";
import { InboxPage } from "./pages/InboxPage";
import { PricesPage } from "./pages/PricesPage";
import { CleaningPage } from "./pages/CleaningPage";
import { RevenuePage } from "./pages/RevenuePage";
import { AdminPage } from "./pages/AdminPage";
import { LandingPage } from "./pages/LandingPage";
import { ArticlePage } from "./pages/ArticlePage";
import { Login } from "./pages/Login";
import { Wizard } from "./features/Wizard";
import { Assistant } from "./features/Assistant";
import { UICtx } from "./ui";
import { useAuth } from "./auth";

/** Schil rond de ingelogde app: navigatie, footer en de assistent. */
function AppLayout() {
  return (
    <>
      <Topbar />
      <main className="wrap">
        <Outlet />
      </main>
      <footer className="foot">Staybase · alle data is fictief · een voorstel van Oblivion Labs</footer>
      <Assistant />
    </>
  );
}

export default function App() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const ui = useMemo(() => ({ openWizard: () => setWizardOpen(true) }), []);
  const { user, loading } = useAuth();

  if (loading) return <div className="loading" style={{ paddingTop: 120 }}>Staybase laden…</div>;

  return (
    <UICtx.Provider value={ui}>
      <Routes>
        {/* Kennisbank is publiek en blijft ook bereikbaar als je ingelogd bent. */}
        <Route path="/kennis/:slug" element={<ArticlePage />} />

        {user ? (
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/kalender" element={<CalendarPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/prijzen" element={<PricesPage />} />
            <Route path="/schoonmaak" element={<CleaningPage />} />
            <Route path="/opbrengsten" element={<RevenuePage />} />
            <Route path="/beheer" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        ) : (
          <>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
      {user && wizardOpen && <Wizard onClose={() => setWizardOpen(false)} />}
    </UICtx.Provider>
  );
}
