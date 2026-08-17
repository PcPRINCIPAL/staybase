import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Property } from "@shared/types";
import { useClientConfig, useProperties } from "../lib/api";
import { Icon } from "../components/Icon";
import { PropertyCard } from "../components/PropertyCard";
import { useUI } from "../ui";

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

function ListView({ properties }: { properties: Property[] }) {
  const nav = useNavigate();
  return (
    <div className="card">
      <table className="mini props-table">
        <thead>
          <tr>
            <th>Pand</th><th>Locatie</th><th>Capaciteit</th><th>Prijs / nacht</th><th>Schoonmaak</th><th>Status</th>
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
                  <b>{p.name}</b>
                  {p.rating != null && <span className="rate">★ {p.rating.toFixed(2).replace(".", ",")}</span>}
                </div>
              </td>
              <td style={{ color: "var(--muted)" }}>{p.location}</td>
              <td className="num" style={{ color: "var(--muted)" }}>
                {p.bedrooms} slpk · {p.bathrooms} badk. · {p.maxGuests} gasten
              </td>
              <td className="num">€ {p.basePriceWeek} <span style={{ color: "var(--faint)" }}>/ € {p.basePriceWeekend} wknd</span></td>
              <td className="num" style={{ color: "var(--muted)" }}>€ {p.cleaningPrice}</td>
              <td><span className={`chip ${p.status === "live" ? "coral" : "warn"}`}>{p.statusLabel}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PropertiesPage() {
  const { data: properties, isLoading } = useProperties();
  const { data: config } = useClientConfig();
  const { openWizard } = useUI();
  const [view, setView] = useState<View>("grid");

  if (isLoading || !properties) return <div className="loading">Panden laden…</div>;

  const live = properties.filter((p) => p.status === "live").length;

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h1>Panden</h1>
          <p className="sub">{properties.length} panden · {live} live · {properties.length - live} in onboarding</p>
        </div>
        <div className="seg" role="tablist" aria-label="Weergave">
          {([["grid", "Tegels"], ["list", "Lijst"], ["map", "Kaart"]] as const).map(([v, label]) => (
            <button key={v} role="tab" aria-selected={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === "grid" && (
        <div className="props" style={{ marginTop: 20 }}>
          {properties.map((p) => <PropertyCard key={p.id} p={p} />)}
          <button className="prop-add" onClick={openWizard}>
            <span className="plus"><Icon name="plus" /></span>
            Pand toevoegen
            <small>Binnen 7 dagen online</small>
          </button>
        </div>
      )}
      {view === "list" && <div style={{ marginTop: 20 }}><ListView properties={properties} /></div>}
      {view === "map" && (
        <div style={{ marginTop: 20 }}>
          {config?.mapboxToken
            ? <MapView properties={properties} token={config.mapboxToken} />
            : <div className="card" style={{ padding: 20, color: "var(--muted)", fontSize: 14 }}>
                Geen <code>MAPBOX_TOKEN</code> gevonden in <code>backend/.env</code> — voeg hem toe en herstart de dev-server.
              </div>}
        </div>
      )}
    </section>
  );
}
