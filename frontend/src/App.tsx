import { useMemo, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { Topbar } from "./components/Topbar";
import { Dashboard } from "./pages/Dashboard";
import { CalendarPage } from "./pages/CalendarPage";
import { InboxPage } from "./pages/InboxPage";
import { PricesPage } from "./pages/PricesPage";
import { CleaningPage } from "./pages/CleaningPage";
import { RevenuePage } from "./pages/RevenuePage";
import { AdminPage } from "./pages/AdminPage";
import { Login } from "./pages/Login";
import { Wizard } from "./features/Wizard";
import { Assistant } from "./features/Assistant";
import { UICtx } from "./ui";
import { useAuth } from "./auth";

export default function App() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const ui = useMemo(() => ({ openWizard: () => setWizardOpen(true) }), []);
  const { user, loading } = useAuth();

  if (loading) return <div className="loading" style={{ paddingTop: 120 }}>Staybase laden…</div>;
  if (!user) return <Login />;

  return (
    <UICtx.Provider value={ui}>
      <Topbar />
      <main className="wrap">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/kalender" element={<CalendarPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/prijzen" element={<PricesPage />} />
          <Route path="/schoonmaak" element={<CleaningPage />} />
          <Route path="/opbrengsten" element={<RevenuePage />} />
          <Route path="/beheer" element={<AdminPage />} />
        </Routes>
      </main>
      <footer className="foot">Staybase · alle data is fictief · een voorstel van Oblivion Labs</footer>
      <Assistant />
      {wizardOpen && <Wizard onClose={() => setWizardOpen(false)} />}
    </UICtx.Provider>
  );
}
