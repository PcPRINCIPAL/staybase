import { useNavigate } from "react-router-dom";
import type { Property } from "@shared/types";

/** Pandenkaart zoals op het dashboard — ook gebruikt in de tegelweergave van /panden. */
export function PropertyCard({ p }: { p: Property }) {
  const nav = useNavigate();
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
          {p.location} · {p.bedrooms} slpk · {p.type === "Villa" ? "zwembad" : p.bathrooms + " badk."}
        </div>
        <span className={`chip ${p.status === "live" ? "coral" : "warn"}`}>{p.statusLabel}</span>
      </div>
    </article>
  );
}
