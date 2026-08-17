import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  testGuestyConnection, useGuestyReset, useGuestyStatus, useGuestySync,
} from "../lib/api";
import { useToast } from "../components/Toast";
import { useAuth } from "../auth";

function fmtSyncTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("nl-BE", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export function IntegrationsPage() {
  const { user } = useAuth();
  const { data: status, isLoading } = useGuestyStatus();
  const sync = useGuestySync();
  const reset = useGuestyReset();
  const toast = useToast();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (user?.role !== "admin") return <Navigate to="/" replace />;
  if (isLoading || !status) return <div className="loading">Koppelingen laden…</div>;

  const onTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await testGuestyConnection();
      setTestResult(`✓ Verbonden — Guesty-account met ${r.listingsTotal} listing${r.listingsTotal === 1 ? "" : "s"}`);
    } catch (err) {
      setTestResult(`✗ ${err instanceof Error ? err.message : "Verbinding mislukte"}`);
    } finally {
      setTesting(false);
    }
  };

  const onSync = () => {
    sync.mutate([], {
      onSuccess: (s) => toast(
        `Guesty gesynchroniseerd: ${s.listings.created + s.listings.updated} panden, ` +
        `${s.bookings.created + s.bookings.updated} boekingen, ` +
        `${s.messages.created + s.messages.updated} gesprekken ✓`
      ),
      onError: (err) => toast(`Sync mislukte: ${err.message}`),
    });
  };

  const onReset = () => {
    if (!window.confirm("Alle uit Guesty geïmporteerde panden en boekingen uit Staybase verwijderen? Guesty zelf blijft ongemoeid.")) return;
    reset.mutate([], {
      onSuccess: (r) => toast(`Guesty-data verwijderd: ${r.properties} panden, ${r.bookings} boekingen`),
      onError: (err) => toast(`Verwijderen mislukte: ${err.message}`),
    });
  };

  const last = status.lastSync;

  return (
    <section className="page">
      <h1>Koppelingen</h1>
      <p className="sub">Verbind Staybase met de tools waar de data vandaag leeft — te beginnen met Guesty.</p>

      <h2 className="sec-title"><span className="em">🔌</span> Guesty</h2>
      <div className="card" style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <b style={{ fontSize: 16 }}>Guesty Open API</b>
          {status.configured
            ? <span className="chip good">● Geconfigureerd</span>
            : <span className="chip warn">Nog niet geconfigureerd</span>}
          {last && <span className="chip gray">laatste sync {fmtSyncTime(last.at)}</span>}
        </div>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "10px 0 0", maxWidth: 640 }}>
          Guesty is de distributiehub van Staybase: panden en boekingen worden er naar Airbnb,
          Booking.com en VRBO gepusht. Deze koppeling haalt listings en reservaties op en zet ze
          als panden en boekingen in Staybase. Opnieuw synchroniseren werkt alles bij, zonder dubbels.
        </p>

        {!status.configured && (
          <div style={{ marginTop: 16, background: "var(--bg)", borderRadius: 12, padding: "14px 18px", fontSize: 14 }}>
            <b>Zo verbind je het Guesty-account:</b>
            <ol style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.7, color: "var(--muted)" }}>
              <li>Log in op Guesty en ga naar <b>Settings → Integrations → API</b>.</li>
              <li>Maak een nieuwe applicatie/API-key aan met scope <b>Open API</b>.</li>
              <li>Kopieer de <b>client-id</b> en het <b>secret</b> naar <code>backend/.env</code> als
                {" "}<code>GUESTY_CLIENT_ID</code> en <code>GUESTY_CLIENT_SECRET</code>.</li>
              <li>Herstart de backend en kom terug naar deze pagina.</li>
            </ol>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <button className="btn ghost sm" disabled={!status.configured || testing} onClick={onTest}>
            {testing ? "Testen…" : "Test verbinding"}
          </button>
          <button className="btn coral sm" disabled={!status.configured || sync.isPending} onClick={onSync}>
            {sync.isPending ? "Synchroniseren…" : "Synchroniseer nu"}
          </button>
          {(status.linkedProperties > 0 || status.linkedBookings > 0) && (
            <button className="btn ghost sm" disabled={reset.isPending} onClick={onReset}>
              Geïmporteerde data verwijderen
            </button>
          )}
        </div>
        {testResult && (
          <p style={{ marginTop: 12, fontSize: 14, color: testResult.startsWith("✓") ? "var(--good, #1c8a4e)" : "var(--coral, #e05263)" }}>
            {testResult}
          </p>
        )}
      </div>

      <div className="kpis" style={{ marginTop: 18 }}>
        <div className="card kpi">
          <span className="lbl">Panden via Guesty</span>
          <span className="val num">{status.linkedProperties}</span>
          <span className="cmp">Zichtbaar tussen de andere panden</span>
        </div>
        <div className="card kpi">
          <span className="lbl">Boekingen via Guesty</span>
          <span className="val num">{status.linkedBookings}</span>
          <span className="cmp">Tellen mee in kalender & opbrengsten</span>
        </div>
        <div className="card kpi">
          <span className="lbl">Gesprekken via Guesty</span>
          <span className="val num">{status.linkedConversations}</span>
          <span className="cmp">
            {last?.messages ? `De ${last.messages.created + last.messages.updated} recentste van ${last.messages.totalRemote} — zichtbaar in de inbox` : "Zichtbaar in de inbox"}
          </span>
        </div>
        <div className="card kpi">
          <span className="lbl">Laatste sync</span>
          <span className="val" style={{ fontSize: 20 }}>{last ? fmtSyncTime(last.at) : "—"}</span>
          <span className="cmp">
            {last
              ? `${last.listings.created} nieuw · ${last.listings.updated} bijgewerkt · ${last.bookings.skipped} overgeslagen`
              : "Nog niet gesynchroniseerd"}
          </span>
        </div>
      </div>

      <h2 className="sec-title"><span className="em">🧩</span> Binnenkort</h2>
      <div className="card" style={{ padding: "18px 20px" }}>
        {[
          ["Wheelhouse", "Dynamische prijszetting — voedt de prijsvoorstellen met echte marktdata."],
          ["Peppol", "Facturen van het Staybase-abonnement rechtstreeks naar de boekhouding."],
          ["Supabase", "Overstap van SQLite naar Postgres met echte multi-tenant auth."],
        ].map(([name, desc]) => (
          <div key={name} className="split-row" style={{ gap: 14 }}>
            <b style={{ width: 110, flexShrink: 0 }}>{name}</b>
            <span style={{ color: "var(--muted)", fontSize: 14 }}>{desc}</span>
            <span className="chip gray" style={{ marginLeft: "auto", flexShrink: 0 }}>gepland</span>
          </div>
        ))}
      </div>
    </section>
  );
}
