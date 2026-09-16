import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PLAN_LABEL, type PlatformView, type UserPlan } from "@shared/types";
import { Icon, Logo, type IconName } from "./Icon";
import { logout, useOverview } from "../lib/api";
import { hasPlan } from "./PlanGate";
import { useBrand, useView } from "./OriginGate";
import { useUI } from "../ui";
import { useAuth } from "../auth";
import { useT } from "../i18n";
import { LanguagePicker } from "./LanguagePicker";

/**
 * `needs` koppelt een item aan de herkomst-variant: wie dat deel van het
 * platform niet heeft (een Linnois-eigenaar), ziet het item gewoon niet staan.
 */
const ITEMS: {
  to: string; icon: IconName; key: string;
  badge?: "inbox" | "price"; adminOnly?: boolean; minPlan?: UserPlan; needs?: keyof PlatformView;
}[] = [
  { to: "/", icon: "home", key: "nav.today" },
  { to: "/panden", icon: "building", key: "nav.properties" },
  { to: "/kalender", icon: "calendar", key: "nav.calendar" },
  { to: "/inbox", icon: "chat", key: "nav.inbox", badge: "inbox", needs: "inbox" },
  { to: "/prijzen", icon: "tag", key: "nav.prices", badge: "price", minPlan: "premium", needs: "prices" },
  { to: "/schoonmaak", icon: "sparkle", key: "nav.cleaning" },
  { to: "/opbrengsten", icon: "chart", key: "nav.revenue", minPlan: "premium" },
  { to: "/facturen", icon: "doc", key: "nav.invoices" },
  { to: "/uitbetalingen", icon: "bank", key: "nav.payouts", adminOnly: true },
  { to: "/insights", icon: "pulse", key: "nav.insights", minPlan: "super" },
  { to: "/beheer", icon: "shield", key: "nav.admin", adminOnly: true },
  { to: "/koppelingen", icon: "plug", key: "nav.integrations", adminOnly: true },
];

export function Sidebar() {
  const { data: overview } = useOverview();
  const { openWizard } = useUI();
  const { user, setUser } = useAuth();
  const view = useView();
  const brand = useBrand();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sb:sidebar") === "rail");
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 1020px)").matches);
  const menuRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const rail = collapsed || narrow; // smalle schermen klappen altijd in

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1020px)");
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggleRail = () => {
    setCollapsed((c) => {
      localStorage.setItem("sb:sidebar", c ? "open" : "rail");
      return !c;
    });
  };
  const badges = {
    inbox: overview?.attention.inboxDrafts ?? 0,
    price: overview?.attention.priceOpen ?? 0,
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const onLogout = async () => {
    try { await logout(); } catch { /* sessie kan al vervallen zijn */ }
    qc.clear();
    setUser(null);
  };

  return (
    <aside className={`sidebar${rail ? " rail" : ""}`}>
      <div className="side-top">
        <div className="logo">
          {brand === "linnois" ? (
            // Ingeklapt blijft alleen de L van het logo over — het volledige
            // woordmerk is te breed voor de smalle balk.
            <img className="logo-img" src={rail ? "/linnois-mark.png" : "/linnois-logo.png"} alt="Linnois" />
          ) : (
            <>
              <Logo />
              <span className="lbl">staybase</span>
            </>
          )}
        </div>
        <button className="side-toggle" onClick={toggleRail} disabled={narrow}
          title={rail ? t("nav.expand") : t("nav.collapse")}
          aria-label={rail ? t("nav.expand") : t("nav.collapse")}>
          <Icon name={rail ? "chevR" : "chevL"} />
        </button>
      </div>
      <nav className="side-nav">
        {ITEMS
          .filter((it) => !it.adminOnly || user?.role === "admin")
          .filter((it) => !it.needs || view[it.needs])
          .map((it) => {
          const locked = it.minPlan ? !hasPlan(user, it.minPlan) : false;
          return (
            <NavLink key={it.to} to={it.to} end={it.to === "/"}
              className={({ isActive }) => `${isActive ? "on" : ""}${locked ? " locked" : ""}`}
              title={locked ? t("nav.lockedPlan", { plan: PLAN_LABEL[it.minPlan!] }) : undefined}>
              <Icon name={it.icon} />
              <span className="lbl">{t(it.key)}</span>
              {locked
                ? <span className="lock">🔒</span>
                : it.badge && badges[it.badge] > 0 && <span className="badge num">{badges[it.badge]}</span>}
            </NavLink>
          );
        })}
        {!view.inbox && (
          <button type="button" className="side-chat" onClick={() => window.dispatchEvent(new Event("sb:open"))}
            title={t("nav.chatJulie")}>
            <Icon name="chat" />
            <span className="lbl">{t("nav.chatJulie")}</span>
          </button>
        )}
      </nav>
      <div className="side-bottom">
        <button className="btn-new" onClick={openWizard}>
          <Icon name="plus" />
          <span className="lbl">{t("nav.addProperty")}</span>
        </button>
        <div className="avatar-wrap" ref={menuRef}>
          <button className="side-user" onClick={() => setMenuOpen((o) => !o)}>
            <span className="avatar">{(user?.name ?? "J").slice(0, 1)}</span>
            <b className="lbl">{user?.name}</b>
            <span className="chev lbl"><Icon name="chevD" /></span>
          </button>
          {menuOpen && (
            <div className="avatar-menu up">
              <div className="who">
                <b>{user?.name}</b>
                <span>{user?.email}</span>
              </div>
              <div className="menu-lang"><LanguagePicker /></div>
              <button onClick={onLogout}>{t("nav.signOut")}</button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
