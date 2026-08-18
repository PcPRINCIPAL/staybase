import { Navigate } from "react-router-dom";
import { PLAN_LABEL, type UserPlan } from "@shared/types";
import { useAdminUsers, useOnboardingStats, useSetUserPlan } from "../lib/api";
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
  const toast = useToast();

  if (user?.role !== "admin") return <Navigate to="/" replace />;
  if (usersLoading || statsLoading || !usersData || !stats) {
    return <div className="loading">Beheer laden…</div>;
  }

  const maxAvg = Math.max(1, ...stats.perStep.map((s) => s.avgMs));

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

      <h2 className="sec-title"><span className="em">👥</span> Gebruikers & rollen</h2>
      <div className="card">
        <table className="mini">
          <tbody>
            {usersData.users.map((u) => (
              <tr key={u.id}>
                <td>
                  <b>{u.name}</b>
                  <span style={{ color: "var(--muted)", marginLeft: 8, fontSize: 13 }}>{u.email}</span>
                </td>
                <td>
                  <span className={`chip ${u.role === "admin" ? "coral" : "gray"}`}>
                    {u.role === "admin" ? "🛡️ " : ""}{ROLE_LABEL[u.role] ?? u.role}
                  </span>
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
                <td className="num" style={{ color: "var(--muted)", fontWeight: 500 }}>
                  {u.onboardings} onboarding{u.onboardings === 1 ? "" : "s"}
                </td>
                <td className="num" style={{ color: "var(--muted)", fontWeight: 500 }}>
                  {u.lastLogin ? `laatst actief ${u.lastLogin.slice(0, 16)}` : "nog niet ingelogd"}
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
          <tbody>
            {stats.recent.length === 0 && (
              <tr><td style={{ color: "var(--muted)" }}>Nog geen onboarding-sessies geregistreerd.</td></tr>
            )}
            {stats.recent.map((r) => (
              <tr key={r.sessionId}>
                <td><b>{r.userName}</b></td>
                <td className="num" style={{ color: "var(--muted)", fontWeight: 500 }}>{r.startedAt.slice(0, 16)}</td>
                <td className="num" style={{ color: "var(--muted)", fontWeight: 500 }}>{r.steps} stap{r.steps === 1 ? "" : "pen"}</td>
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
