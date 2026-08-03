import { NavLink } from "react-router-dom";
import { Icon, Logo, type IconName } from "./Icon";
import { useOverview } from "../lib/api";
import { useUI } from "../ui";

const ITEMS: { to: string; icon: IconName; label: string; badge?: "inbox" | "price" }[] = [
  { to: "/", icon: "home", label: "Vandaag" },
  { to: "/kalender", icon: "calendar", label: "Kalender" },
  { to: "/inbox", icon: "chat", label: "Inbox", badge: "inbox" },
  { to: "/prijzen", icon: "tag", label: "Prijzen", badge: "price" },
  { to: "/schoonmaak", icon: "sparkle", label: "Schoonmaak" },
  { to: "/opbrengsten", icon: "chart", label: "Opbrengsten" },
];

export function Topbar() {
  const { data: overview } = useOverview();
  const { openWizard } = useUI();
  const badges = {
    inbox: overview?.attention.inboxDrafts ?? 0,
    price: overview?.attention.priceOpen ?? 0,
  };

  return (
    <header className="topbar">
      <div className="topbar-in">
        <div className="logo">
          <Logo />
          staybase
        </div>
        <nav className="nav">
          {ITEMS.map((it) => (
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
          <div className="avatar" title={overview?.greetingName ?? "Julie"}>
            {(overview?.greetingName ?? "J").slice(0, 1)}
          </div>
        </div>
      </div>
    </header>
  );
}
