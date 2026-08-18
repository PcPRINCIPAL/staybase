import { useMemo, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { CalendarPage } from "./pages/CalendarPage";
import { InboxPage } from "./pages/InboxPage";
import { PricesPage } from "./pages/PricesPage";
import { CleaningPage } from "./pages/CleaningPage";
import { RevenuePage } from "./pages/RevenuePage";
import { AdminPage } from "./pages/AdminPage";
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { PropertiesPage } from "./pages/PropertiesPage";
import { InsightsPage } from "./pages/InsightsPage";
import { PropertyPage } from "./pages/PropertyPage";
import { LandingPage } from "./pages/LandingPage";
import { ArticlePage } from "./pages/ArticlePage";
import { KennisPage } from "./pages/KennisPage";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Wizard } from "./features/Wizard";
import { PlanGate } from "./components/PlanGate";
import { Assistant } from "./features/Assistant";
import { UICtx } from "./ui";
import { useAuth } from "./auth";

/** Schil rond de ingelogde app: navigatie, footer en de assistent. */
function AppLayout() {
  return (
    <div className="shell">
      <Sidebar />
      <div className="shell-main">
        <main className="wrap">
          <Outlet />
        </main>
        <footer className="foot">Staybase · een voorstel van Oblivion Labs</footer>
      </div>
      <Assistant />
    </div>
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
        <Route path="/kennis" element={<KennisPage />} />
        <Route path="/kennis/:slug" element={<ArticlePage />} />

        {user ? (
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/panden" element={<PropertiesPage />} />
            <Route path="/pand/:id" element={<PropertyPage />} />
            <Route path="/kalender" element={<CalendarPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/prijzen" element={<PlanGate min="premium"><PricesPage /></PlanGate>} />
            <Route path="/schoonmaak" element={<CleaningPage />} />
            <Route path="/opbrengsten" element={<PlanGate min="premium"><RevenuePage /></PlanGate>} />
            <Route path="/insights" element={<PlanGate min="super"><InsightsPage /></PlanGate>} />
            <Route path="/beheer" element={<AdminPage />} />
            <Route path="/koppelingen" element={<IntegrationsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        ) : (
          <>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registreer" element={<Register />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
      {user && wizardOpen && <Wizard onClose={() => setWizardOpen(false)} />}
    </UICtx.Provider>
  );
}
