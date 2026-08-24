import { Navigate } from "react-router-dom";
import { COMMISSION_BASIS_LABEL, PLAN_LABEL, ORIGIN_LABEL, type UserOrigin, type UserPlan } from "@shared/types";
import { useAdminProperties, useAdminUsers, useAssignPropertyOwner, useOnboardingStats, useSetUserOrigin, useSetUserPlan } from "../lib/api";
import { shortDate } from "../lib/format";
import { CommissionRow } from "../components/CommissionRow";
import { useAuth } from "../auth";
import { useToast } from "../components/Toast";

function fmtDur(ms: number): string {
  if (ms < 1000) return "< 1 s";
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec} s`;
  return `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, "0")}s`;
}

const ROLE_LABEL: Record<string, string> = { admin: "Beheerder", owner: "Eigenaar" };

export function AdminPage() {
  const { user } = useAuth();
  const { data: usersData, isLoading: usersLoading } = useAdminUsers();
  const { data: stats, isLoading: statsLoading } = useOnboardingStats();
  const setPlan = useSetUserPlan();
  const setOrigin = useSetUserOrigin();
  const { data: adminProps } = useAdminProperties();
  const assignOwner = useAssignPropertyOwner();
  const toast = useToast();

  if (user?.role !== "admin") return <Navigate to="/" replace />;
  if (usersLoading || statsLoading || !usersData || !stats) {
    return <div className="loading">Beheer laden…</div>;
  }

  const maxAvg = Math.max(1, ...stats.perStep.map((s) => s.avgMs));
  const owners = usersData.users.filter((u) => u.role === "owner");

  return (
    <section className="page">
      <h1>Beheer</h1>
      <p className="sub">Inzichten voor het Staybase-team — eigenaars krijgen dit niet te zien.</p>

      <div className="kpis" style={{ marginTop: 24 }}>
        <div className="card kpi">
          <span className="lbl">Gebruikers</span>
          <span className="val num">{usersData.users.length}</span>
          <span className="cmp">
            {usersData.roles.map((r) => `${r.n} ${ROLE_LABEL[r.role]?.toLowerCase() ?? r.role}${r.n === 1 ? "" : "s"}`).join(" · ")}
            {" · "}
            {usersData.users.filter((u) => u.origin === "linnois").length} via Linnois
          </span>
        </div>
        <div className="card kpi">
          <span className="lbl">Onboardings gestart</span>
          <span className="val num">{stats.sessionsStarted}</span>
          <span className="cmp">Elke geopende wizard telt mee</span>
        </div>
        <div className="card kpi">
          <span className="lbl">Onboardings afgerond</span>
          <span className="val num">{stats.sessionsCompleted}</span>
          <span className="cmp">
            {stats.sessionsStarted > 0
              ? `${Math.round((stats.sessionsCompleted / stats.sessionsStarted) * 100)}% rondt de wizard af`
              : "Nog geen data"}
          </span>
        </div>
        <div className="card kpi">
          <span className="lbl">Traagste stap</span>
          <span className="val" style={{ fontSize: 20 }}>
            {stats.perStep.length
              ? [...stats.perStep].sort((a, b) => b.avgMs - a.avgMs)[0].stepTitle
              : "—"}
          </span>
          <span className="cmp">Kandidaat om te vereenvoudigen</span>
        </div>
      </div>

      <h2 className="sec-title"><span className="em">👥</span> Gebruikers, herkomst & formule</h2>
      <p className="sub" style={{ marginTop: -6, marginBottom: 18 }}>
        De <b>herkomst</b> bepaalt welke variant van het platform iemand ziet. Een Linnois-gebruiker
        krijgt geen inbox (Linnois doet de gastcommunicatie), geen prijzen of nachtprijzen, en ziet
        zijn netto-uitbetaling in plaats van de totale omzet.
      </p>
      <div className="card">
        <table className="mini">
          <thead>
            <tr>
              <th>Gebruiker</th>
              <th>Rol</th>
              <th>Herkomst</th>
              <th>Formule</th>
              <th>Onboardings</th>
              <th>Laatst actief</th>
            </tr>
          </thead>
          <tbody>
            {usersData.users.map((u) => (
              <tr key={u.id}>
                <td className="cell-stack">
                  <b>{u.name}</b>
                  <span className="cell-sub">{u.email}</span>
                </td>
                <td>
                  <span className={`chip ${u.role === "admin" ? "coral" : "gray"}`}>
                    {u.role === "admin" ? "🛡️ " : ""}{ROLE_LABEL[u.role] ?? u.role}
                  </span>
                </td>
                <td>
                  {u.role === "admin" ? (
                    // Een beheerder ziet en beheert alles, ongeacht herkomst —
                    // een keuze tonen zou suggereren dat ze iets verandert.
                    <span style={{ color: "var(--faint)", fontSize: 13 }}>n.v.t.</span>
                  ) : (
                    <select
                      className="plan-select"
                      value={u.origin ?? "staybase"}
                      onChange={(e) =>
                        setOrigin.mutate([u.id, e.target.value as UserOrigin], {
                          onSuccess: (r) => toast(`${u.name} is nu een ${ORIGIN_LABEL[r.origin].toLowerCase()} ✓`),
                          onError: () => toast("Herkomst wijzigen mislukte"),
                        })
                      }
                    >
                      {(["staybase", "linnois"] as const).map((o) => (
                        <option key={o} value={o}>{ORIGIN_LABEL[o]}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td>
                  {u.role === "admin" ? (
                    <span style={{ color: "var(--faint)", fontSize: 13 }}>alle toegang</span>
                  ) : (
                    <select
                      className="plan-select"
                      value={u.plan}
                      onChange={(e) =>
                        setPlan.mutate([u.id, e.target.value as UserPlan], {
                          onSuccess: (r) => toast(`${u.name} staat nu op de ${PLAN_LABEL[r.plan]}-formule ✓`),
                          onError: () => toast("Formule wijzigen mislukte"),
                        })
                      }
                    >
                      {(["basic", "premium", "super"] as const).map((p) => (
                        <option key={p} value={p}>{PLAN_LABEL[p]}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="num" style={{ color: "var(--muted)", fontWeight: 600 }}>
                  {u.onboardings}
                </td>
                <td className="num" style={{ color: u.lastLogin ? "var(--muted)" : "var(--faint)", fontWeight: 600 }}>
                  {u.lastLogin ? shortDate(u.lastLogin) : "nooit"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="sec-title"><span className="em">🤝</span> Commissie per gebruiker</h2>
      <p className="sub" style={{ marginTop: -6, marginBottom: 18 }}>
        De commissieafspraak wordt per klant onderhandeld. Zet het percentage met de schuifknop of
        typ het exact, en kies waarover het gerekend wordt: <b>bruto</b> is de totale gastbetaling,
        <b> netto</b> is die betaling min de OTA-commissie en de schoonmaakkost.
      </p>
      <div className="card">
        <table className="mini">
          <thead>
            <tr>
              <th>Gebruiker</th>
              <th>Percentage</th>
              <th />
              <th>Basis</th>
              <th>Gerekend</th>
            </tr>
          </thead>
          <tbody>
            {owners.length === 0 && (
              <tr><td colSpan={5} style={{ color: "var(--muted)" }}>Nog geen eigenaars om een afspraak mee vast te leggen.</td></tr>
            )}
            {owners.map((u) => (
              <CommissionRow
                key={u.id}
                user={u}
                onSaved={(name, pct, basis) =>
                  toast(`${name}: ${String(pct).replace(".", ",")}% op ${COMMISSION_BASIS_LABEL[basis].toLowerCase()} ✓`)
                }
                onError={() => toast("Commissie aanpassen mislukte")}
              />
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="sec-title"><span className="em">🏘️</span> Panden per eigenaar</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        Wijs panden toe aan een eigenaar — die ziet vanaf dan alléén zijn eigen panden, boekingen en berichten.
      </p>
      <div className="card">
        <table className="mini">
          <thead>
            <tr>
              <th>Pand</th>
              <th>Status</th>
              <th>Eigenaar</th>
            </tr>
          </thead>
          <tbody>
            {(adminProps ?? []).map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="cell-prop">
                    <span className="thumb" style={{ background: "var(--soft)" }}>
                      {p.photo ? <img src={p.photo} alt="" loading="lazy" /> : "🏠"}
                    </span>
                    <b>{p.name}</b>
                    <span style={{ color: "var(--muted)", fontSize: 13 }}>{p.location}</span>
                  </div>
                </td>
                <td>
                  <span className={`chip ${p.status === "live" ? "coral" : "warn"}`}>
                    {p.status === "live" ? "live" : "onboarding"}
                  </span>
                </td>
                <td>
                  <select
                    className="plan-select"
                    value={p.ownerId ?? ""}
                    onChange={(e) => {
                      const userId = e.target.value || null;
                      const owner = usersData.users.find((u) => u.id === userId);
                      assignOwner.mutate([p.id, userId], {
                        onSuccess: () => toast(userId
                          ? `${p.name} toegewezen aan ${owner?.name ?? "eigenaar"} ✓`
                          : `${p.name} losgekoppeld`),
                        onError: () => toast("Toewijzen mislukte"),
                      });
                    }}
                  >
                    <option value="">— geen eigenaar —</option>
                    {usersData.users.filter((u) => u.role === "owner").map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="sec-title"><span className="em">⏱️</span> Tijd per onboarding-stap</h2>
      <div className="card" style={{ padding: "18px 20px" }}>
        {stats.perStep.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Nog geen onboarding-data — open de wizard eens.</p>
        )}
        {stats.perStep.map((s) => (
          <div key={`${s.step}-${s.stepTitle}`} className="split-row" style={{ gap: 14 }}>
            <span style={{ width: 130, flexShrink: 0 }}>
              <b style={{ fontSize: 13.5 }}>{s.step + 1}. {s.stepTitle}</b>
            </span>
            <div className="bar-track" style={{ flex: 1 }}>
              <div className="bar-fill" style={{ width: `${Math.max(3, (s.avgMs / maxAvg) * 100)}%` }} />
            </div>
            <b className="num" style={{ marginLeft: 0, width: 90, textAlign: "right" }}>{fmtDur(s.avgMs)}</b>
            <span style={{ color: "var(--faint)", fontSize: 12.5, width: 70, textAlign: "right" }} className="num">
              {s.visits}× bezocht
            </span>
          </div>
        ))}
      </div>

      <h2 className="sec-title"><span className="em">🧭</span> Recente onboardings</h2>
      <div className="card">
        <table className="mini">
          <thead>
            <tr>
              <th>Gebruiker</th>
              <th>Gestart</th>
              <th>Stappen</th>
              <th>Duur</th>
              <th>Resultaat</th>
            </tr>
          </thead>
          <tbody>
            {stats.recent.length === 0 && (
              <tr><td colSpan={5} style={{ color: "var(--muted)" }}>Nog geen onboarding-sessies geregistreerd.</td></tr>
            )}
            {stats.recent.map((r) => (
              <tr key={r.sessionId}>
                <td><b>{r.userName}</b></td>
                <td className="num" style={{ color: "var(--muted)", fontWeight: 500 }}>{shortDate(r.startedAt)}</td>
                <td className="num" style={{ color: "var(--muted)", fontWeight: 500 }}>{r.steps}</td>
                <td className="num">{fmtDur(r.totalMs)}</td>
                <td>
                  <span className={`chip ${r.completed ? "good" : "warn"}`}>
                    {r.completed ? "✓ Afgerond" : "Afgebroken"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
