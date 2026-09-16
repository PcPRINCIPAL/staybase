import { useNavigate } from "react-router-dom";
import { BRAND_LABEL, type Property } from "@shared/types";
import { useT } from "../i18n";

/**
 * Pandenkaart zoals op het dashboard — ook gebruikt in de tegelweergave van
 * /panden. `showBrand` (overall admin-view, fase 2) toont het merk van het
 * pand als extra chip.
 */
export function PropertyCard({ p, showBrand = false }: { p: Property; showBrand?: boolean }) {
  const nav = useNavigate();
  const t = useT();
  return (
    <article className="prop" onClick={() => nav(`/pand/${p.id}`)} role="link" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") nav(`/pand/${p.id}`); }}>
      <div className="prop-art" style={{ background: p.artBg }}>
        {p.photo ? <img src={p.photo} alt="" loading="lazy" decoding="async" /> : p.art}
      </div>
      <div className="prop-body">
        <div className="name">
          {p.name}
          {p.rating != null && <span className="rate">★ {p.rating.toFixed(2).replace(".", ",")}</span>}
        </div>
        <div className="loc">
          {p.location} · {p.bedrooms} {t("cal.bedrooms")} · {p.type === "Villa" ? t("props.card.pool") : t("props.card.bath", { n: p.bathrooms })}
        </div>
        <span className={`chip ${p.status === "live" ? "coral" : "warn"}`}>{p.statusLabel}</span>
        {showBrand && <span className={`chip brand-${p.ownerBrand}`} style={{ marginLeft: 6 }}>{BRAND_LABEL[p.ownerBrand]}</span>}
      </div>
    </article>
  );
}
