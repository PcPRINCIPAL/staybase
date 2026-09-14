import { Navigate } from "react-router-dom";
import { COMMISSION_BASIS_LABEL, PLAN_LABEL, ORIGIN_LABEL, type UserOrigin, type UserPlan } from "@shared/types";
import { useAdminProperties, useAdminUsers, useAssignPropertyOwner, useOnboardingStats, useSetUserOrigin, useSetUserPlan } from "../lib/api";
import { shortDate } from "../lib/format";
import { CommissionRow } from "../components/CommissionRow";
import { useAuth } from "../auth";
import { useToast } from "../components/Toast";
import { useT } from "../i18n";

function fmtDur(ms: number): string {
  if (ms < 1000) return "< 1 s";
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec} s`;
  return `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, "0")}s`;
}

const ROLE_KEY: Record<string, string> = { admin: "adm.role.admin", owner: "adm.role.owner" };
const ROLE_PLURAL_KEY: Record<string, string> = { admin: "adm.role.admins", owner: "adm.role.owners" };

export function AdminPage() {
  const t = useT();
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
    return <div className="loading">{t("adm.loading")}</div>;
  }

  const maxAvg = Math.max(1, ...stats.perStep.map((s) => s.avgMs));
  const owners = usersData.users.filter((u) => u.role === "owner");

  return (
    <section className="page">
      <h1>{t("adm.title")}</h1>
      <p className="sub">{t("adm.sub")}</p>

      <div className="kpis" style={{ marginTop: 24 }}>
        <div className="card kpi">
          <span className="lbl">{t("adm.users")}</span>
          <span className="val num">{usersData.users.length}</span>
          <span className="cmp">
            {usersData.roles.map((r) => `${r.n} ${t(r.n === 1 ? ROLE_KEY[r.role] ?? r.role : ROLE_PLURAL_KEY[r.role] ?? r.role).toLowerCase()}`).join(" · ")}
            {" · "}
            {t("adm.viaLinnois", { n: usersData.users.filter((u) => u.origin === "linnois").length })}
          </span>
        </div>
        <div className="card kpi">
          <span className="lbl">{t("adm.onbStarted")}</span>
          <span className="val num">{stats.sessionsStarted}</span>
          <span className="cmp">{t("adm.onbStartedCmp")}</span>
        </div>
        <div className="card kpi">
          <span className="lbl">{t("adm.onbDone")}</span>
          <span className="val num">{stats.sessionsCompleted}</span>
          <span className="cmp">
            {stats.sessionsStarted > 0
              ? t("adm.onbDoneCmp", { p: Math.round((stats.sessionsCompleted / stats.sessionsStarted) * 100) })
              : t("adm.noData")}
          </span>
        </div>
        <div className="card kpi">
          <span className="lbl">{t("adm.slowest")}</span>
          <span className="val" style={{ fontSize: 20 }}>
            {stats.perStep.length
              ? [...stats.perStep].sort((a, b) => b.avgMs - a.avgMs)[0].stepTitle
              : "—"}
          </span>
          <span className="cmp">{t("adm.slowestCmp")}</span>
        </div>
      </div>

      <h2 className="sec-title"><span className="em">👥</span> {t("adm.usersTitle")}</h2>
      <p className="sub" style={{ marginTop: -6, marginBottom: 18 }}>
        {t("adm.usersSub")}
      </p>
      <div className="card">
        <table className="mini">
          <thead>
            <tr>
              <th>{t("adm.th.user")}</th>
              <th>{t("adm.th.role")}</th>
              <th>{t("adm.th.origin")}</th>
              <th>{t("adm.th.plan")}</th>
              <th>{t("adm.th.onboardings")}</th>
              <th>{t("adm.th.lastActive")}</th>
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
                    {u.role === "admin" ? "🛡️ " : ""}{t(ROLE_KEY[u.role] ?? u.role)}
                  </span>
                </td>
                <td>
                  {u.role === "admin" ? (
                    // Een beheerder ziet en beheert alles, ongeacht herkomst —
                    // een keuze tonen zou suggereren dat ze iets verandert.
                    <span style={{ color: "var(--faint)", fontSize: 13 }}>{t("adm.na")}</span>
                  ) : (
                    <select
                      className="plan-select"
                      value={u.origin ?? "staybase"}
                      onChange={(e) =>
                        setOrigin.mutate([u.id, e.target.value as UserOrigin], {
                          onSuccess: (r) => toast(t("adm.originToast", { name: u.name, origin: ORIGIN_LABEL[r.origin].toLowerCase() })),
                          onError: () => toast(t("adm.originFailed")),
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
                    <span style={{ color: "var(--faint)", fontSize: 13 }}>{t("adm.allAccess")}</span>
                  ) : (
                    <select
                      className="plan-select"
                      value={u.plan}
                      onChange={(e) =>
                        setPlan.mutate([u.id, e.target.value as UserPlan], {
                          onSuccess: (r) => toast(t("adm.planToast", { name: u.name, plan: PLAN_LABEL[r.plan] })),
                          onError: () => toast(t("adm.planFailed")),
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
                  {u.lastLogin ? shortDate(u.lastLogin) : t("common.never")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="sec-title"><span className="em">🤝</span> {t("adm.commTitle")}</h2>
      <p className="sub" style={{ marginTop: -6, marginBottom: 18 }}>
        {t("adm.commSub")}
      </p>
      <div className="card">
        <table className="mini">
          <thead>
            <tr>
              <th>{t("adm.th.user")}</th>
              <th>{t("adm.th.pct")}</th>
              <th />
              <th>{t("adm.th.basis")}</th>
              <th>{t("adm.th.calc")}</th>
            </tr>
          </thead>
          <tbody>
            {owners.length === 0 && (
              <tr><td colSpan={5} style={{ color: "var(--muted)" }}>{t("adm.noOwners")}</td></tr>
            )}
            {owners.map((u) => (
              <CommissionRow
                key={u.id}
                user={u}
                onSaved={(name, pct, basis) =>
                  toast(t("adm.commToast", { name, pct: String(pct).replace(".", ","), basis: COMMISSION_BASIS_LABEL[basis].toLowerCase() }))
                }
                onError={() => toast(t("adm.commFailed"))}
              />
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="sec-title"><span className="em">🏘️</span> {t("adm.propsTitle")}</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        {t("adm.propsSub")}
      </p>
      <div className="card">
        <table className="mini">
          <thead>
            <tr>
              <th>{t("adm.th.prop")}</th>
              <th>{t("adm.th.status")}</th>
              <th>{t("adm.th.owner")}</th>
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
                    <span className="cell-stack">
                      <b>{p.name}{p.codeName && <code className="code-name">{p.codeName}</code>}</b>
                      <span className="cell-sub">{p.location}</span>
                    </span>
                  </div>
                </td>
                <td>
                  <span className={`chip ${p.status === "live" ? "coral" : "warn"}`}>
                    {p.status === "live" ? t("common.live") : t("common.onboarding")}
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
                          ? t("adm.assignToast", { p: p.name, u: owner?.name ?? t("adm.role.owner") })
                          : t("adm.unassignToast", { p: p.name })),
                        onError: () => toast(t("adm.assignFailed")),
                      });
                    }}
                  >
                    <option value="">{t("adm.noOwner")}</option>
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

      <h2 className="sec-title"><span className="em">⏱️</span> {t("adm.stepTime")}</h2>
      <div className="card" style={{ padding: "18px 20px" }}>
        {stats.perStep.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>{t("adm.noStepData")}</p>
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
              {t("adm.visited", { n: s.visits })}
            </span>
          </div>
        ))}
      </div>

      <h2 className="sec-title"><span className="em">🧭</span> {t("adm.recent")}</h2>
      <div className="card">
        <table className="mini">
          <thead>
            <tr>
              <th>{t("adm.th.user")}</th>
              <th>{t("adm.th.started")}</th>
              <th>{t("adm.th.steps")}</th>
              <th>{t("adm.th.duration")}</th>
              <th>{t("adm.th.result")}</th>
            </tr>
          </thead>
          <tbody>
            {stats.recent.length === 0 && (
              <tr><td colSpan={5} style={{ color: "var(--muted)" }}>{t("adm.noSessions")}</td></tr>
            )}
            {stats.recent.map((r) => (
              <tr key={r.sessionId}>
                <td><b>{r.userName}</b></td>
                <td className="num" style={{ color: "var(--muted)", fontWeight: 500 }}>{shortDate(r.startedAt)}</td>
                <td className="num" style={{ color: "var(--muted)", fontWeight: 500 }}>{r.steps}</td>
                <td className="num">{fmtDur(r.totalMs)}</td>
                <td>
                  <span className={`chip ${r.completed ? "good" : "warn"}`}>
                    {r.completed ? t("adm.completed") : t("adm.aborted")}
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
