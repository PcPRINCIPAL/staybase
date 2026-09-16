import { Fragment, useState } from "react";
import { Navigate } from "react-router-dom";
import { downloadPayoutsCsv, usePayouts } from "../lib/api";
import { eurC, shortDate } from "../lib/format";
import { useAuth } from "../auth";
import { useT } from "../i18n";
import { Icon } from "../components/Icon";

/**
 * Uitbetalingen (§9c, alleen admin). Per uitcheckmaand één run: alle
 * afgeronde boekingen, per eigenaar via de §8-keten opgeteld tot één
 * overschrijving die op de 15e van de maand erna vertrekt. Geen
 * bankkoppeling (expliciet afgevoerd) — wel een CSV-batchbestand dat
 * als groepsoverschrijving in KBC wordt ingeladen, zoals Billit doet.
 */
export function PayoutsPage() {
  const t = useT();
  const { user } = useAuth();
  const [month, setMonth] = useState<string>();
  const { data, isLoading } = usePayouts(month);
  const [open, setOpen] = useState<string | null>(null);

  if (user?.role !== "admin") return <Navigate to="/" replace />;
  if (isLoading || !data) return <div className="loading">{t("pay.loading")}</div>;

  const exportable = data.owners.some((o) => o.iban && o.amount > 0);

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h1>{t("pay.title")}</h1>
          <p className="sub">{t("pay.sub")}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select className="plan-select" value={data.month} onChange={(e) => setMonth(e.target.value)}>
            {data.months.map((m) => (
              <option key={m.month} value={m.month}>
                {t("pay.runOption", { run: shortDate(m.runDate), n: m.bookings })}
                {m.running ? ` — ${t("pay.runningShort")}` : ""}
              </option>
            ))}
          </select>
          {exportable && (
            <button className="btn coral sm" onClick={() => downloadPayoutsCsv(data.month)}>
              <Icon name="down" size={15} /> {t("pay.exportKbc")}
            </button>
          )}
        </div>
      </div>

      {/* Kop van de run: wanneer, hoeveel, naar wie. */}
      <div className="card pay-head">
        <div className="pay-kpi">
          <span>{data.running ? t("pay.headRunning") : t("pay.headDate", { date: shortDate(data.runDate) })}</span>
          <b className="num">{eurC(data.totals.amount)}</b>
        </div>
        <div className="pay-kpi">
          <span>{t("pay.owners")}</span>
          <b className="num">{data.totals.owners}</b>
        </div>
        <div className="pay-kpi">
          <span>{t("pay.bookings")}</span>
          <b className="num">{data.totals.bookings}</b>
        </div>
        <p className="pay-note">
          {data.running ? t("pay.runningNote") : t("pay.kbcNote")}
          {data.totals.missingIban > 0 && (
            <span className="pay-warn"> ⚠️ {t("pay.missingIban", { n: data.totals.missingIban })}</span>
          )}
        </p>
      </div>

      {data.owners.length === 0 ? (
        <div className="card" style={{ marginTop: 24, padding: "28px 24px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          💤 {t("pay.empty")}
        </div>
      ) : (
        <div className="card pay-card" style={{ marginTop: 18 }}>
          <div className="pay-row pay-row-head">
            <span>{t("pay.th.owner")}</span>
            <span>{t("pay.th.iban")}</span>
            <span>{t("pay.th.reference")}</span>
            <span className="num r">{t("pay.th.bookings")}</span>
            <span className="num r">{t("pay.th.amount")}</span>
            <span />
          </div>
          {data.owners.map((o) => (
            <Fragment key={o.ownerId}>
              <div className="pay-row">
                <span className="cell-stack">
                  <b>{o.name}</b>
                  <span className="cell-sub">{o.email}</span>
                </span>
                <span>
                  {o.iban
                    ? <code className="code-name">{o.iban}</code>
                    : <span className="chip pay-chip-warn">{t("pay.noIban")}</span>}
                </span>
                <span className="pay-ref" style={{ color: "var(--muted)", fontSize: 13 }} title={o.reference}>{o.reference}</span>
                <span className="num r">{o.bookings.length}</span>
                <span className="num r" style={{ fontWeight: 700 }}>{eurC(o.amount)}</span>
                <span className="r">
                  <button className="btn ghost sm" onClick={() => setOpen(open === o.ownerId ? null : o.ownerId)}>
                    {open === o.ownerId ? t("pay.hideDetail") : t("pay.showDetail")}
                  </button>
                </span>
              </div>
              {open === o.ownerId && (
                <div className="pay-detail-scroll">
                  <table className="mini pay-detail">
                    <thead>
                      <tr>
                        <th>{t("pay.th.guest")}</th>
                        <th>{t("pay.th.property")}</th>
                        <th>{t("pay.th.checkout")}</th>
                        <th className="num">{t("pay.th.guestPaid")}</th>
                        <th className="num">{t("pay.th.ota")}</th>
                        <th className="num">{t("pay.th.commission")}</th>
                        <th className="num">{t("pay.th.cleaning")}</th>
                        <th className="num">{t("pay.th.net")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.bookings.map((b) => (
                        <tr key={b.bookingId}>
                          <td><b>{b.guest}</b></td>
                          <td className="pay-prop">
                            {b.propertyName}
                            {b.propertyCode && <> <code className="code-name">{b.propertyCode}</code></>}
                          </td>
                          <td className="num" style={{ color: "var(--muted)" }}>{shortDate(b.endDate)}</td>
                          <td className="num">{eurC(b.guestTotal)}</td>
                          <td className="num" style={{ color: "var(--muted)" }}>− {eurC(b.otaFee)}</td>
                          <td className="num" style={{ color: "var(--muted)" }}>− {eurC(b.commissionIncl)}</td>
                          <td className="num" style={{ color: "var(--muted)" }}>− {eurC(b.cleaningFee)}</td>
                          <td className="num" style={{ fontWeight: 700 }}>{eurC(b.netPayout)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Fragment>
          ))}
        </div>
      )}
    </section>
  );
}
