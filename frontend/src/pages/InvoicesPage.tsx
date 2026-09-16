import { useEffect, useMemo, useRef, useState } from "react";
import {
  downloadInvoice, downloadInvoiceBundle, downloadManagementInvoice, downloadOwnerStatement,
  useInvoices, useInvoicesOverview, type InvoiceListItem,
} from "../lib/api";
import { eur, shortDate } from "../lib/format";
import { useT } from "../i18n";

/**
 * Facturen-tabblad (§4/§9a). Twee tabbladen via een switch rechtsboven
 * (meeting 16/09: geen één grote scroll): "Nog te factureren" is de
 * werklijst met uitgecheckte boekingen zonder factuur, "Gefactureerd" de
 * uitgereikte gastfacturen gegroepeerd per pand met gebundelde download.
 * Eigenaars zien via de bestaande scoping vanzelf enkel hun eigen panden.
 */
export function InvoicesPage() {
  const t = useT();
  const { data: invoices, isLoading, refetch } = useInvoices();
  const { data: overview, refetch: refetchOverview } = useInvoicesOverview();
  const [propertyId, setPropertyId] = useState(""); // "" = alle panden
  const [tab, setTab] = useState<"pending" | "issued">("pending");
  const touched = useRef(false); // eigen keuze van de gebruiker wint

  // Eerste download legt nummer en datum vast → beide lijsten verversen.
  const refresh = () => setTimeout(() => { refetch(); refetchOverview(); }, 1200);

  const pendingAll = useMemo(
    () => (overview?.pending ?? []).filter((p) => p.checkedOut),
    [overview]
  );

  // Alles gefactureerd? Dan opent de pagina op het archief.
  useEffect(() => {
    if (!touched.current && overview && pendingAll.length === 0) setTab("issued");
  }, [overview, pendingAll.length]);

  const groups = useMemo(() => {
    const byProp = new Map<string, { name: string; code: string | null; rows: InvoiceListItem[] }>();
    for (const inv of invoices ?? []) {
      if (propertyId && inv.propertyId !== propertyId) continue;
      const g = byProp.get(inv.propertyId) ?? { name: inv.propertyName, code: inv.propertyCode, rows: [] };
      g.rows.push(inv);
      byProp.set(inv.propertyId, g);
    }
    return [...byProp.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, "nl"));
  }, [invoices, propertyId]);

  if (isLoading || !invoices) return <div className="loading">{t("invp.loading")}</div>;

  // Filteropties uit de facturen én de nog-te-factureren boekingen samen.
  const filterProps = new Map<string, string>();
  for (const i of invoices) filterProps.set(i.propertyId, i.propertyName);
  for (const p of overview?.pending ?? []) filterProps.set(p.propertyId, p.propertyName);
  const filterList = [...filterProps.entries()].sort((a, b) => a[1].localeCompare(b[1], "nl"));

  const shownCount = groups.reduce((n, [, g]) => n + g.rows.length, 0);
  const shownTotal = groups.reduce((n, [, g]) => n + g.rows.reduce((a, r) => a + r.amount, 0), 0);
  const pending = pendingAll.filter((p) => !propertyId || p.propertyId === propertyId);

  const pick = (next: "pending" | "issued") => { touched.current = true; setTab(next); };

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h1>{t("invp.title")}</h1>
          <p className="sub">{t("invp.sub")}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", flex: "1 1 100%" }}>
          <select className="plan-select" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">{t("inbox.filter.all", { n: invoices.length })}</option>
            {filterList.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          {tab === "issued" && shownCount > 0 && (
            <button className="btn coral sm" onClick={() => downloadInvoiceBundle(propertyId || undefined)}>
              {t("invp.downloadAll", { n: shownCount })}
            </button>
          )}
          {/* Rechts uitgelijnd met de kaartrand; zelfde radius als de kaart. */}
          <div className="seg seg-card" style={{ marginLeft: "auto" }} role="tablist" aria-label={t("invp.title")}>
            <button role="tab" aria-selected={tab === "pending"} className={tab === "pending" ? "on" : ""}
              onClick={() => pick("pending")}>
              {t("invp.tab.pending", { n: pendingAll.length })}
            </button>
            <button role="tab" aria-selected={tab === "issued"} className={tab === "issued" ? "on" : ""}
              onClick={() => pick("issued")}>
              {t("invp.tab.issued", { n: invoices.length })}
            </button>
          </div>
        </div>
      </div>

      {/* Nog te factureren: uitgecheckt, geen factuur — downloaden maakt ze aan. */}
      {tab === "pending" && (
        pending.length === 0 ? (
          <div className="card" style={{ marginTop: 24, padding: "28px 24px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            ✅ {propertyId ? t("invp.pendingEmptyFiltered") : t("invp.pendingEmpty")}
          </div>
        ) : (
          <>
            <p className="sub" style={{ marginTop: 20 }}>{t("invp.pendingSub")} {t("invp.docsHint")}</p>
            <div className="card">
              <table className="mini">
                <tbody>
                  {pending.map((p) => (
                    <tr key={p.bookingId}>
                      <td className="cell-stack">
                        <b>{p.guest}</b>
                        <span className="cell-sub">{p.propertyName}</span>
                      </td>
                      <td className="num" style={{ color: "var(--muted)", fontWeight: 500 }}>{shortDate(p.endDate)}</td>
                      <td>
                        <span className="invp-docs">
                          <button className="btn primary sm" onClick={() => { downloadInvoice(p.bookingId); refresh(); }}>
                            {t("invp.guestInvoice")}
                          </button>
                          <button className="btn ghost sm" onClick={() => downloadOwnerStatement(p.bookingId)}>{t("invp.statement")}</button>
                          <button className="btn ghost sm" onClick={() => downloadManagementInvoice(p.bookingId)}>{t("invp.mgmtInvoice")}</button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      )}

      {/* Gefactureerd: uitgereikte facturen, gegroepeerd per pand. */}
      {tab === "issued" && (
        shownCount === 0 ? (
          <div className="card" style={{ marginTop: 24, padding: "28px 24px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            🧾 {propertyId ? t("invp.emptyFiltered") : t("invp.empty")}
          </div>
        ) : (
          <>
            {groups.map(([pid, g]) => {
              const total = g.rows.reduce((a, r) => a + r.amount, 0);
              return (
                <div key={pid}>
                  <div className="invp-group-head">
                    <h2 className="sec-title" style={{ margin: 0 }}>
                      <span className="em">🏠</span> {g.name}
                      {g.code && <code className="code-name">{g.code}</code>}
                    </h2>
                    <span className="invp-group-meta num">
                      {g.rows.length === 1 ? t("invp.invoices1") : t("invp.invoicesN", { n: g.rows.length })} · {eur(Math.round(total))}
                    </span>
                    <button className="btn ghost sm" onClick={() => downloadInvoiceBundle(pid)}>
                      {t("invp.bundle", { n: g.rows.length })}
                    </button>
                  </div>
                  <div className="card">
                    <table className="mini">
                      <thead>
                        <tr>
                          <th>{t("invp.th.number")}</th>
                          <th>{t("invp.th.guest")}</th>
                          <th>{t("invp.th.stay")}</th>
                          <th>{t("invp.th.date")}</th>
                          <th>{t("invp.th.amount")}</th>
                          <th>{t("invp.th.docs")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.rows.map((r) => (
                          <tr key={r.bookingId}>
                            <td><span className="chip gray num">🧾 {r.label}</span></td>
                            <td><b>{r.guest}</b></td>
                            <td className="num" style={{ color: "var(--muted)", fontWeight: 500 }}>
                              {r.startDate && r.endDate ? `${shortDate(r.startDate)} – ${shortDate(r.endDate)}` : "—"}
                            </td>
                            <td className="num" style={{ color: "var(--muted)", fontWeight: 500 }}>{shortDate(r.issuedAt)}</td>
                            <td className="num" style={{ fontWeight: 700 }}>{eur(Math.round(r.amount))}</td>
                            <td>
                              <span className="invp-docs">
                                <button className="btn ghost sm" onClick={() => downloadInvoice(r.bookingId)}>{t("invp.guestInvoice")}</button>
                                <button className="btn ghost sm" onClick={() => downloadOwnerStatement(r.bookingId)}>{t("invp.statement")}</button>
                                <button className="btn ghost sm" onClick={() => downloadManagementInvoice(r.bookingId)}>{t("invp.mgmtInvoice")}</button>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            <p className="invp-total num">
              {t("invp.total")}: <b>{eur(Math.round(shownTotal))}</b>
            </p>
          </>
        )
      )}

    </section>
  );
}
