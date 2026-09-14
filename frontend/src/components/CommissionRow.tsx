import { useEffect, useState } from "react";
import {
  COMMISSION_BASIS_LABEL, COMMISSION_MAX_PCT, COMMISSION_MIN_PCT,
  type CommissionBasis,
} from "@shared/types";
import { useSetUserCommission } from "../lib/api";
import { useT } from "../i18n";
import type { AdminUser } from "../lib/api";

/**
 * Eén commissieafspraak. De schuifknop houdt zijn waarde lokaal bij terwijl je
 * sleept en bewaart pas bij het loslaten — anders zou elke tussenstap een
 * bewaaroproep zijn. Het cijfer ernaast is ook een invoerveld, voor wie een
 * exact percentage afgesproken heeft (12,5 sleep je nooit precies).
 */
export function CommissionRow({
  user,
  onSaved,
  onError,
}: {
  user: AdminUser;
  onSaved: (name: string, pct: number, basis: CommissionBasis) => void;
  onError: () => void;
}) {
  const t = useT();
  const save = useSetUserCommission();
  const [pct, setPct] = useState(user.commissionPct);
  const [basis, setBasis] = useState<CommissionBasis>(user.commissionBasis);

  // Volgt de server weer zodra die een nieuwe waarde teruggeeft.
  useEffect(() => { setPct(user.commissionPct); }, [user.commissionPct]);
  useEffect(() => { setBasis(user.commissionBasis); }, [user.commissionBasis]);

  const commit = (nextPct: number, nextBasis: CommissionBasis) => {
    const clean = Math.min(COMMISSION_MAX_PCT, Math.max(COMMISSION_MIN_PCT, Math.round(nextPct * 2) / 2));
    setPct(clean);
    setBasis(nextBasis);
    if (clean === user.commissionPct && nextBasis === user.commissionBasis) return;
    save.mutate([user.id, clean, nextBasis], {
      onSuccess: (r) => onSaved(user.name, r.pct, r.basis),
      onError: () => {
        setPct(user.commissionPct);
        setBasis(user.commissionBasis);
        onError();
      },
    });
  };

  const fill = ((pct - COMMISSION_MIN_PCT) / (COMMISSION_MAX_PCT - COMMISSION_MIN_PCT)) * 100;

  return (
    <tr>
      <td className="cell-stack">
        <b>{user.name}</b>
        <span className="cell-sub">{user.email}</span>
      </td>
      <td className="comm-slider-cell">
        <input
          type="range"
          className="comm-slider"
          min={COMMISSION_MIN_PCT}
          max={COMMISSION_MAX_PCT}
          step={0.5}
          value={pct}
          aria-label={t("adm.commAriaPct", { name: user.name })}
          style={{ background: `linear-gradient(90deg, var(--coral) ${fill}%, var(--soft) ${fill}%)` }}
          onChange={(e) => setPct(Number(e.target.value))}
          onPointerUp={(e) => commit(Number((e.target as HTMLInputElement).value), basis)}
          onKeyUp={(e) => commit(Number((e.target as HTMLInputElement).value), basis)}
        />
      </td>
      <td>
        <span className="comm-value">
          <input
            type="number"
            min={COMMISSION_MIN_PCT}
            max={COMMISSION_MAX_PCT}
            step={0.5}
            value={pct}
            aria-label={t("adm.commAriaPctNum", { name: user.name })}
            onChange={(e) => setPct(Number(e.target.value))}
            onBlur={(e) => commit(Number(e.target.value), basis)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
          <b>%</b>
        </span>
      </td>
      <td>
        <select
          className="plan-select"
          value={basis}
          aria-label={t("adm.commAriaBasis", { name: user.name })}
          onChange={(e) => commit(pct, e.target.value as CommissionBasis)}
        >
          {(["bruto", "netto"] as const).map((b) => (
            <option key={b} value={b}>{COMMISSION_BASIS_LABEL[b]}</option>
          ))}
        </select>
      </td>
      <td className="comm-hint">{t(`adm.commHint.${basis}`)}</td>
    </tr>
  );
}
