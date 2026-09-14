import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  testGuestyConnection, useGuestyReset, useGuestyStatus, useGuestySync,
} from "../lib/api";
import { useToast } from "../components/Toast";
import { useAuth } from "../auth";
import { useT } from "../i18n";

function fmtSyncTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("nl-BE", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export function IntegrationsPage() {
  const t = useT();
  const { user } = useAuth();
  const { data: status, isLoading } = useGuestyStatus();
  const sync = useGuestySync();
  const reset = useGuestyReset();
  const toast = useToast();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (user?.role !== "admin") return <Navigate to="/" replace />;
  if (isLoading || !status) return <div className="loading">{t("int.loading")}</div>;

  const onTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await testGuestyConnection();
      setTestResult(t("int.testOk", { n: r.listingsTotal }));
    } catch (err) {
      setTestResult(`✗ ${err instanceof Error ? err.message : t("int.testFail")}`);
    } finally {
      setTesting(false);
    }
  };

  const onSync = () => {
    sync.mutate([], {
      onSuccess: (s) => toast(t("int.syncOk", {
        p: s.listings.created + s.listings.updated,
        b: s.bookings.created + s.bookings.updated,
        c: s.messages.created + s.messages.updated,
      })),
      onError: (err) => toast(t("int.syncFail", { e: err.message })),
    });
  };

  const onReset = () => {
    if (!window.confirm(t("int.removeConfirm"))) return;
    reset.mutate([], {
      onSuccess: (r) => toast(t("int.removeOk", { p: r.properties, b: r.bookings })),
      onError: (err) => toast(t("int.removeFail", { e: err.message })),
    });
  };

  const last = status.lastSync;

  return (
    <section className="page">
      <h1>{t("int.title")}</h1>
      <p className="sub">{t("int.sub")}</p>

      <h2 className="sec-title"><span className="em">🔌</span> Guesty</h2>
      <div className="card" style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <b style={{ fontSize: 16 }}>Guesty Open API</b>
          {status.configured
            ? <span className="chip good">{t("int.configured")}</span>
            : <span className="chip warn">{t("int.notConfigured")}</span>}
          {last && <span className="chip gray">{t("int.lastSyncChip", { t: fmtSyncTime(last.at) })}</span>}
        </div>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "10px 0 0", maxWidth: 640 }}>
          {t("int.guestyBody")}
        </p>

        {!status.configured && (
          <div style={{ marginTop: 16, background: "var(--bg)", borderRadius: 12, padding: "14px 18px", fontSize: 14 }}>
            <b>{t("int.howTitle")}</b>
            <ol style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.7, color: "var(--muted)" }}>
              <li>{t("int.how1")}</li>
              <li>{t("int.how2")}</li>
              <li>{t("int.how3")}</li>
              <li>{t("int.how4")}</li>
            </ol>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <button className="btn ghost sm" disabled={!status.configured || testing} onClick={onTest}>
            {testing ? t("int.testing") : t("int.test")}
          </button>
          <button className="btn coral sm" disabled={!status.configured || sync.isPending} onClick={onSync}>
            {sync.isPending ? t("int.syncing") : t("int.syncNow")}
          </button>
          {(status.linkedProperties > 0 || status.linkedBookings > 0) && (
            <button className="btn ghost sm" disabled={reset.isPending} onClick={onReset}>
              {t("int.removeData")}
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
          <span className="lbl">{t("int.kpi.props")}</span>
          <span className="val num">{status.linkedProperties}</span>
          <span className="cmp">{t("int.kpi.propsCmp")}</span>
        </div>
        <div className="card kpi">
          <span className="lbl">{t("int.kpi.bookings")}</span>
          <span className="val num">{status.linkedBookings}</span>
          <span className="cmp">{t("int.kpi.bookingsCmp")}</span>
        </div>
        <div className="card kpi">
          <span className="lbl">{t("int.kpi.convos")}</span>
          <span className="val num">{status.linkedConversations}</span>
          <span className="cmp">
            {last?.messages ? t("int.kpi.convosCmp", { a: last.messages.created + last.messages.updated, b: last.messages.totalRemote }) : t("int.kpi.convosCmpPlain")}
          </span>
        </div>
        <div className="card kpi">
          <span className="lbl">{t("int.kpi.lastSync")}</span>
          <span className="val" style={{ fontSize: 20 }}>{last ? fmtSyncTime(last.at) : "—"}</span>
          <span className="cmp">
            {last
              ? t("int.kpi.lastSyncCmp", { n: last.listings.created, u: last.listings.updated, s: last.bookings.skipped })
              : t("int.kpi.noSync")}
          </span>
        </div>
      </div>

      <h2 className="sec-title"><span className="em">🧩</span> {t("int.soon")}</h2>
      <div className="card" style={{ padding: "18px 20px" }}>
        {[
          ["Wheelhouse", t("int.wheelhouse")],
          ["Peppol", t("int.peppol")],
          ["Supabase", t("int.supabase")],
        ].map(([name, desc]) => (
          <div key={name} className="split-row" style={{ gap: 14 }}>
            <b style={{ width: 110, flexShrink: 0 }}>{name}</b>
            <span style={{ color: "var(--muted)", fontSize: 14 }}>{desc}</span>
            <span className="chip gray" style={{ marginLeft: "auto", flexShrink: 0 }}>{t("int.planned")}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
