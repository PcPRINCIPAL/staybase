import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Property } from "@shared/types";
import { BRAND_LABEL } from "@shared/types";
import { useClientConfig, useProperties } from "../lib/api";
import { Icon } from "../components/Icon";
import { PropertyCard } from "../components/PropertyCard";
import { useUI } from "../ui";
import { useAuth } from "../auth";
import { useT } from "../i18n";
import { matchesProperty } from "../lib/search";

type View = "grid" | "list" | "map";

/**
 * Kaartweergave in Mapbox-stijl (streets-v12 als raster-tegels) — prijspillen
 * als markers, klik = naar het pand. Bewust raster i.p.v. mapbox-gl (WebGL):
 * de GL-variant liep op deze machine vast in zowel Chrome als de preview;
 * de tegels zien er identiek uit.
 */
function MapView({ properties, token }: { properties: Property[]; token: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const nav = useNavigate();
  const withCoords = properties.filter((p) => p.lat != null && p.lng != null);
  const missing = properties.length - withCoords.length;

  useEffect(() => {
    if (!holder.current) return;
    const map = L.map(holder.current, { scrollWheelZoom: true, zoomControl: true });
    L.tileLayer(
      `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${token}`,
      {
        tileSize: 512,
        zoomOffset: -1,
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }
    ).addTo(map);

    for (const p of withCoords) {
      const icon = L.divIcon({
        className: "map-pin-holder",
        html: `<span class="map-pin ${p.status === "live" ? "live" : "off"}">€ ${p.basePriceWeek}</span>`,
        iconSize: [0, 0],
      });
      const m = L.marker([p.lat!, p.lng!], { icon }).addTo(map);
      m.bindTooltip(p.name, { direction: "top", offset: [0, -18] });
      m.on("click", () => nav(`/pand/${p.id}`));
    }
    if (withCoords.length) {
      map.fitBounds(L.latLngBounds(withCoords.map((p) => [p.lat!, p.lng!] as [number, number])), {
        padding: [56, 56],
        maxZoom: 13,
      });
    } else {
      map.setView([51.28, 3.1], 9); // Belgische kust
    }
    return () => { map.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(withCoords.map((p) => p.id)), token, nav]);

  return (
    <>
      <div className="map-wrap" ref={holder} />
      {missing > 0 && (
        <p style={{ color: "var(--faint)", fontSize: 13, marginTop: 10 }}>
          {missing} pand{missing === 1 ? "" : "en"} zonder gekende locatie {missing === 1 ? "staat" : "staan"} niet op de kaart.
        </p>
      )}
    </>
  );
}

function ListView({ properties, showBrand }: { properties: Property[]; showBrand: boolean }) {
  const nav = useNavigate();
  const t = useT();
  return (
    <div className="card">
      <table className="mini props-table">
        <thead>
          <tr>
            <th>{t("props.th.prop")}</th><th>{t("props.th.loc")}</th><th>{t("props.th.cap")}</th><th>{t("props.th.price")}</th><th>{t("props.th.clean")}</th><th>{t("props.th.status")}</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((p) => (
            <tr key={p.id} className="row-link" onClick={() => nav(`/pand/${p.id}`)}>
              <td>
                <div className="cell-prop">
                  <span className="thumb" style={{ background: p.artBg }}>
                    {p.photo ? <img src={p.photo} alt="" loading="lazy" /> : p.art}
                  </span>
                  <span className="cell-stack">
                    <b>{p.name}</b>
                    {p.codeName && <span className="cell-sub"><code className="code-name">{p.codeName}</code></span>}
                  </span>
                  {p.rating != null && <span className="rate">★ {p.rating.toFixed(2).replace(".", ",")}</span>}
                </div>
              </td>
              <td style={{ color: "var(--muted)" }}>{p.location}</td>
              <td className="num" style={{ color: "var(--muted)" }}>
                {t("props.capacity", { s: p.bedrooms, b: p.bathrooms, g: p.maxGuests })}
              </td>
              <td className="num">€ {p.basePriceWeek} <span style={{ color: "var(--faint)" }}>/ € {p.basePriceWeekend} {t("props.wknd")}</span></td>
              <td className="num" style={{ color: "var(--muted)" }}>€ {p.cleaningPrice}</td>
              <td>
                <span className={`chip ${p.status === "live" ? "coral" : "warn"}`}>{p.statusLabel}</span>
                {showBrand && <span className={`chip brand-${p.ownerBrand}`} style={{ marginLeft: 6 }}>{BRAND_LABEL[p.ownerBrand]}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PropertiesPage() {
  const t = useT();
  const { data: properties, isLoading } = useProperties();
  const { data: config } = useClientConfig();
  const { openWizard } = useUI();
  const { user } = useAuth();
  const [view, setView] = useState<View>("grid");
  const [query, setQuery] = useState("");
  // Overall admin-view (fase 2): dan draagt elk pand zijn merk als badge.
  const showBrand = user?.role === "admin" && user.adminScope === "all";

  if (isLoading || !properties) return <div className="loading">{t("props.loading")}</div>;

  const live = properties.filter((p) => p.status === "live").length;
  // Zoekt genormaliseerd over naam, interne codenaam en locatie: "beduin",
  // "be duin" en "BE.DUIN" komen allemaal bij BE.DUIN.ARC.4 uit.
  const q = query.trim();
  const shown = q ? properties.filter((p) => matchesProperty(p, q)) : properties;

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h1>{t("props.title")}</h1>
          <p className="sub">{t("props.sub", { count: properties.length === 1 ? t("props.count1") : t("props.countN", { n: properties.length }), live, onb: properties.length - live })}</p>
        </div>
        <div className="props-search">
          <Icon name="search" size={15} />
          <input
            type="search"
            value={query}
            placeholder={t("props.search")}
            aria-label={t("props.searchAria")}
            onChange={(e) => setQuery(e.target.value)}
          />
          {q && (
            <button className="props-search-clear" onClick={() => setQuery("")} aria-label={t("props.searchClear")}>
              <Icon name="x" size={13} />
            </button>
          )}
        </div>
        <div className="seg" role="tablist" aria-label={t("cal.view")}>
          {([["grid", t("props.grid")], ["list", t("props.list")], ["map", t("props.map")]] as const).map(([v, label]) => (
            <button key={v} role="tab" aria-selected={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {q && (
        <p className="props-search-count">
          {shown.length === 1 ? t("props.searchCount1") : t("props.searchCountN", { n: shown.length })}
        </p>
      )}

      {q && shown.length === 0 && (
        <div className="card" style={{ marginTop: 16, padding: "26px 24px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          🔍 {t("props.searchNone", { q })}
        </div>
      )}

      {view === "grid" && shown.length > 0 && (
        <div className="props" style={{ marginTop: q ? 12 : 20 }}>
          {shown.map((p) => <PropertyCard key={p.id} p={p} showBrand={showBrand} />)}
          {!q && (
            <button className="prop-add" onClick={openWizard}>
              <span className="plus"><Icon name="plus" /></span>
              {t("props.add")}
              <small>{t("props.addSub")}</small>
            </button>
          )}
        </div>
      )}
      {view === "list" && shown.length > 0 && <div style={{ marginTop: q ? 12 : 20 }}><ListView properties={shown} showBrand={showBrand} /></div>}
      {view === "map" && shown.length > 0 && (
        <div style={{ marginTop: q ? 12 : 20 }}>
          {config?.mapboxToken
            ? <MapView properties={shown} token={config.mapboxToken} />
            : <div className="card" style={{ padding: 20, color: "var(--muted)", fontSize: 14 }}>
                {t("props.noMapbox")}
              </div>}
        </div>
      )}
    </section>
  );
}
