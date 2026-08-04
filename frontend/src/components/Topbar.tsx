import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Icon, Logo, type IconName } from "./Icon";
import { logout, useOverview } from "../lib/api";
import { useUI } from "../ui";
import { useAuth } from "../auth";

const ITEMS: { to: string; icon: IconName; label: string; badge?: "inbox" | "price"; adminOnly?: boolean }[] = [
  { to: "/", icon: "home", label: "Vandaag" },
  { to: "/kalender", icon: "calendar", label: "Kalender" },
  { to: "/inbox", icon: "chat", label: "Inbox", badge: "inbox" },
  { to: "/prijzen", icon: "tag", label: "Prijzen", badge: "price" },
  { to: "/schoonmaak", icon: "sparkle", label: "Schoonmaak" },
  { to: "/opbrengsten", icon: "chart", label: "Opbrengsten" },
  { to: "/beheer", icon: "shield", label: "Beheer", adminOnly: true },
];

export function Topbar() {
  const { data: overview } = useOverview();
  const { openWizard } = useUI();
  const { user, setUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
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
    <header className="topbar">
      <div className="topbar-in">
        <div className="logo">
          <Logo />
          staybase
        </div>
        <nav className="nav">
          {ITEMS.filter((it) => !it.adminOnly || user?.role === "admin").map((it) => (
            <NavLink key={it.to} to={it.to} end={it.to === "/"} className={({ isActive }) => (isActive ? "on" : "")}>
              <Icon name={it.icon} />
              {it.label}
              {it.badge && badges[it.badge] > 0 && <span className="badge num">{badges[it.badge]}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="top-actions">
          <span className="demo-chip">Demo · fictieve data</span>
          <button className="btn-new" onClick={openWizard}>
            <Icon name="plus" />
            <span>Pand toevoegen</span>
          </button>
          <div className="avatar-wrap" ref={menuRef}>
            <button className="avatar" title={user?.name} onClick={() => setMenuOpen((o) => !o)}>
              {(user?.name ?? "J").slice(0, 1)}
            </button>
            {menuOpen && (
              <div className="avatar-menu">
                <div className="who">
                  <b>{user?.name}</b>
                  <span>{user?.email}</span>
                </div>
                <button onClick={onLogout}>Afmelden</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
