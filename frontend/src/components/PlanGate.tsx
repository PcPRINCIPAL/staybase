import type { ReactNode } from "react";
import { PLAN_LABEL, PLAN_RANK, type UserPlan } from "@shared/types";
import { useAuth } from "../auth";

/** Heeft deze gebruiker toegang tot een onderdeel van deze formule? Admins altijd. */
export function hasPlan(user: { role: string; plan?: UserPlan } | null, min: UserPlan): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return PLAN_RANK[user.plan ?? "basic"] >= PLAN_RANK[min];
}

const PERKS: Record<UserPlan, string[]> = {
  basic: [],
  premium: ["Prijsvoorstellen bekijken en toepassen", "Opbrengsten per kanaal en per pand", "Documenten voor je boekhouder"],
  super: ["Alles uit Premium", "Insights: bezettingsgraad, reactietijd en boekingsvenster", "Vergelijk je panden en vind de gaten in je kalender"],
};

/**
 * Omhult een pagina die bij een formule hoort. Wie de formule niet heeft,
 * ziet een nette upgrade-uitnodiging in plaats van de inhoud.
 */
export function PlanGate({ min, children }: { min: UserPlan; children: ReactNode }) {
  const { user } = useAuth();
  if (hasPlan(user, min)) return <>{children}</>;

  return (
    <section className="page">
      <div className="card upsell">
        <span className="upsell-badge">{PLAN_LABEL[min]}</span>
        <h1>Dit onderdeel zit in de {PLAN_LABEL[min]}-formule</h1>
        <p>
          Je gebruikt nu de <b>{PLAN_LABEL[user?.plan ?? "basic"]}</b>-formule. Upgrade naar{" "}
          <b>{PLAN_LABEL[min]}</b> om dit scherm te ontgrendelen:
        </p>
        <ul>
          {PERKS[min].map((p) => <li key={p}>✓ {p}</li>)}
        </ul>
        <p className="upsell-note">
          Vraag je upgrade aan via je Staybase-beheerder — die zet je formule meteen om.
        </p>
      </div>
    </section>
  );
}
