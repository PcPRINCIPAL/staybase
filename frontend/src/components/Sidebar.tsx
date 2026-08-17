import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Icon, Logo, type IconName } from "./Icon";
import { logout, useOverview } from "../lib/api";
import { useUI } from "../ui";
import { useAuth } from "../auth";

const ITEMS: { to: string; icon: IconName; label: string; badge?: "inbox" | "price"; adminOnly?: boolean }[] = [
  { to: "/", icon: "home", label: "Vandaag" },
  { to: "/panden", icon: "building", label: "Panden" },
  { to: "/kalender", icon: "calendar", label: "Kalender" },
  { to: "/inbox", icon: "chat", label: "Inbox", badge: "inbox" },
  { to: "/prijzen", icon: "tag", label: "Prijzen", badge: "price" },
  { to: "/schoonmaak", icon: "sparkle", label: "Schoonmaak" },
  { to: "/opbrengsten", icon: "chart", label: "Opbrengsten" },
  { to: "/beheer", icon: "shield", label: "Beheer", adminOnly: true },
  { to: "/koppelingen", icon: "plug", label: "Koppelingen", adminOnly: true },
];

export function Sidebar() {
  const { data: overview } = useOverview();
  const { openWizard } = useUI();
  const { user, setUser } = useAuth();
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
          <Logo />
          <span className="lbl">staybase</span>
        </div>
        <button className="side-toggle" onClick={toggleRail} disabled={narrow}
          title={rail ? "Zijbalk uitklappen" : "Zijbalk inklappen"}
          aria-label={rail ? "Zijbalk uitklappen" : "Zijbalk inklappen"}>
          <Icon name={rail ? "chevR" : "chevL"} />
        </button>
      </div>
      <nav className="side-nav">
        {ITEMS.filter((it) => !it.adminOnly || user?.role === "admin").map((it) => (
          <NavLink key={it.to} to={it.to} end={it.to === "/"} className={({ isActive }) => (isActive ? "on" : "")}>
            <Icon name={it.icon} />
            <span className="lbl">{it.label}</span>
            {it.badge && badges[it.badge] > 0 && <span className="badge num">{badges[it.badge]}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="side-bottom">
        <button className="btn-new" onClick={openWizard}>
          <Icon name="plus" />
          <span className="lbl">Pand toevoegen</span>
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
              <button onClick={onLogout}>Afmelden</button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
