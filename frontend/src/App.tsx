import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { CalendarPage } from "./pages/CalendarPage";
import { InboxPage } from "./pages/InboxPage";
import { PricesPage } from "./pages/PricesPage";
import { CleaningPage } from "./pages/CleaningPage";
import { RevenuePage } from "./pages/RevenuePage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { PayoutsPage } from "./pages/PayoutsPage";
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
import { OriginGate } from "./components/OriginGate";
import { Assistant } from "./features/Assistant";
import { UICtx } from "./ui";
import { useAuth } from "./auth";
import { BRAND_LABEL, brandFor } from "@shared/types";
import { useLocale } from "./i18n";

/** Schil rond de ingelogde app: navigatie, footer en de assistent. */
function AppLayout() {
  const { user } = useAuth();
  const { t } = useLocale();
  const brandName = BRAND_LABEL[brandFor(user)];
  return (
    <div className="shell">
      <Sidebar />
      <div className="shell-main">
        <main className="wrap">
          <Outlet />
        </main>
        <footer className="foot">{t("app.footer", { brand: brandName })}</footer>
      </div>
      <Assistant />
    </div>
  );
}

export default function App() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const ui = useMemo(() => ({ openWizard: () => setWizardOpen(true) }), []);
  const { user, loading } = useAuth();
  const { lang, setLang, t } = useLocale();

  // De voorkeurstaal uit het profiel wint zodra we weten wie er inlogt; wie
  // niet ingelogd is, houdt de keuze uit localStorage of de browsertaal.
  useEffect(() => {
    if (user && user.language && user.language !== lang) setLang(user.language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.language]);

  // Huisstijl op de document-root: zo krijgen ook schermen buiten de app-schil
  // (de onboarding-wizard) de juiste merkkleuren mee. Uitgelogd is het normaal
  // Staybase — behalve tijdens de kleurtest van 16/09: rood → #1278EB op de
  // website. Vlag terug op false = terug naar het rood (meeting van de 25e).
  const BLUE_LANDING_TEST = true;
  useEffect(() => {
    document.documentElement.dataset.brand = user ? brandFor(user) : (BLUE_LANDING_TEST ? "bluetest" : "staybase");
  }, [user]);

  if (loading) return <div className="loading" style={{ paddingTop: 120 }}>{t("app.loading")}</div>;

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
            <Route path="/inbox" element={<OriginGate part="inbox"><InboxPage /></OriginGate>} />
            <Route path="/prijzen" element={<OriginGate part="prices"><PlanGate min="premium"><PricesPage /></PlanGate></OriginGate>} />
            <Route path="/schoonmaak" element={<CleaningPage />} />
            <Route path="/opbrengsten" element={<PlanGate min="premium"><RevenuePage /></PlanGate>} />
            <Route path="/facturen" element={<InvoicesPage />} />
            <Route path="/uitbetalingen" element={<PayoutsPage />} />
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
