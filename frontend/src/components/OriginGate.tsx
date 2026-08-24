import type { ReactNode } from "react";
import { brandFor, viewFor, type Brand, type PlatformView } from "@shared/types";
import { useAuth } from "../auth";
import { useT } from "../i18n";

/**
 * De variant van het platform voor de ingelogde gebruiker. Een Linnois-eigenaar
 * krijgt een uitgeklede versie: Linnois doet de gastcommunicatie, bepaalt de
 * prijzen en regelt de schoonmaak, dus die schermen horen daar niet thuis.
 */
export function useView(): PlatformView {
  const { user } = useAuth();
  return viewFor(user);
}

/** De huisstijl voor de ingelogde gebruiker: Staybase of Linnois. */
export function useBrand(): Brand {
  const { user } = useAuth();
  return brandFor(user);
}

const EXPLAIN: Record<keyof PlatformView, { title: string; body: string }> = {
  inbox: { title: "gate.inboxTitle", body: "gate.inboxBody" },
  prices: { title: "gate.pricesTitle", body: "gate.pricesBody" },
  grossRevenue: { title: "gate.revenueTitle", body: "gate.revenueBody" },
  cleaningDetails: { title: "gate.cleaningTitle", body: "gate.cleaningBody" },
};

/**
 * Omhult een pagina die bij een deel van het platform hoort dat een
 * Linnois-gebruiker niet ziet. De navigatie verbergt het item al — dit vangt
 * wie er via de URL toch belandt.
 */
export function OriginGate({ part, children }: { part: keyof PlatformView; children: ReactNode }) {
  const view = useView();
  const t = useT();
  if (view[part]) return <>{children}</>;

  const { title, body } = EXPLAIN[part];
  return (
    <section className="page">
      <div className="card upsell">
        <span className="upsell-badge">Linnois</span>
        <h1>{t(title)}</h1>
        <p>{t(body)}</p>
        <button className="btn coral" onClick={() => window.dispatchEvent(new Event("sb:open"))}>
          💬 {t("nav.chatJulie")}
        </button>
      </div>
    </section>
  );
}
