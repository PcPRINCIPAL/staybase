import type { ReactNode } from "react";
import { BRAND_LABEL, PLAN_LABEL, PLAN_RANK, brandFor, type UserPlan } from "@shared/types";
import { useAuth } from "../auth";
import { useT } from "../i18n";

/** Heeft deze gebruiker toegang tot een onderdeel van deze formule? Admins altijd. */
export function hasPlan(user: { role: string; plan?: UserPlan } | null, min: UserPlan): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return PLAN_RANK[user.plan ?? "basic"] >= PLAN_RANK[min];
}

const PERKS: Record<UserPlan, string[]> = {
  basic: [],
  premium: ["gate.perk.prices", "gate.perk.revenue", "gate.perk.docs"],
  super: ["gate.perk.allPremium", "gate.perk.insights", "gate.perk.compare"],
};

/**
 * Omhult een pagina die bij een formule hoort. Wie de formule niet heeft,
 * ziet een nette upgrade-uitnodiging in plaats van de inhoud.
 */
export function PlanGate({ min, children }: { min: UserPlan; children: ReactNode }) {
  const { user } = useAuth();
  const t = useT();
  if (hasPlan(user, min)) return <>{children}</>;

  return (
    <section className="page">
      <div className="card upsell">
        <span className="upsell-badge">{PLAN_LABEL[min]}</span>
        <h1>{t("gate.planTitle", { plan: PLAN_LABEL[min] })}</h1>
        <p>{t("gate.planBody", { current: PLAN_LABEL[user?.plan ?? "basic"], plan: PLAN_LABEL[min] })}</p>
        <ul>
          {PERKS[min].map((p) => <li key={p}>✓ {t(p)}</li>)}
        </ul>
        <p className="upsell-note">
          {t("gate.planNote", { brand: BRAND_LABEL[brandFor(user)] })}
        </p>
      </div>
    </section>
  );
}
