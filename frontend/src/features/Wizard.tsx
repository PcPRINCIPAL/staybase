import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Logo } from "../components/Icon";
import { useToast } from "../components/Toast";
import { useCreateProperty } from "../lib/api";

const STEP_COUNT = 8;
const MIC_QS = [
  "“Hoe zou je je pand omschrijven aan een goeie vriend?”",
  "“Wat maakt de buurt zo leuk voor gasten?”",
  "“Hoe verwelkom je gasten meestal?”",
  "Even luisteren… jouw stijl wordt opgeslagen ✨",
];
const AMENITIES = ["🏊 Zwembad", "🌳 Tuin", "🚗 Parkeerplaats", "📶 Wifi", "🐶 Huisdieren welkom", "🔥 Open haard", "🚲 Fietsen"];
const CONFETTI_COLORS = ["#FF385C", "#2B6CDF", "#00A67C", "#FFB400", "#E31C5F"];

function Confetti() {
  const pieces = useRef(
    Array.from({ length: 36 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.9,
      rot: Math.random() * 360,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    }))
  ).current;
  return (
    <>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti"
          style={{ left: `${p.left}vw`, background: p.color, animationDelay: `${p.delay}s`, transform: `rotate(${p.rot}deg)` }}
        />
      ))}
    </>
  );
}

export function Wizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState("Huis");
  const [address, setAddress] = useState("Sparrendreef 24, 8300 Knokke-Heist");
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [maxGuests, setMaxGuests] = useState(8);
  const [amenities, setAmenities] = useState<Set<string>>(new Set(["🏊 Zwembad", "🌳 Tuin", "📶 Wifi"]));
  const [photoChoice, setPhotoChoice] = useState<"photographer" | "own">("photographer");
  const [certRequested, setCertRequested] = useState(false);
  const [cleaningChoice, setCleaningChoice] = useState<"marketplace" | "own">("marketplace");
  const [cleaningEmail, setCleaningEmail] = useState("");
  const [airbnbLinked, setAirbnbLinked] = useState(false);
  const [vrbo, setVrbo] = useState(true);
  const [micState, setMicState] = useState<"idle" | "live" | "done">("idle");
  const [micQ, setMicQ] = useState("Klaar om te starten?");
  const create = useCreateProperty();
  const toast = useToast();
  const nav = useNavigate();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const startMic = () => {
    if (micState !== "idle") return;
    setMicState("live");
    let qi = 0;
    setMicQ(MIC_QS[0]);
    const iv = setInterval(() => {
      qi++;
      if (qi < MIC_QS.length) setMicQ(MIC_QS[qi]);
      else {
        clearInterval(iv);
        setMicState("done");
        setMicQ("Klaar! Staybase schrijft voortaan in jouw stem ✅");
      }
    }, 2200);
  };

  const street = address.split(",")[0].trim() || "Je pand";

  const finish = () => {
    create.mutate(
      [{
        address, type, bedrooms, bathrooms, maxGuests,
        amenities: [...amenities],
        photoChoice, cleaningChoice,
        cleaningEmail: cleaningEmail || null,
        vrbo,
      }],
      {
        onSuccess: () => {
          onClose();
          nav("/");
          toast(`${street} staat in onboarding — verwachte livegang vr 24 juli 🎉`);
        },
        onError: () => toast("Er ging iets mis bij het aanmaken — probeer opnieuw"),
      }
    );
  };

  const nextLabel =
    step === 0 ? "Let's go 🚀"
    : step === STEP_COUNT - 2 ? "Rond af"
    : step === STEP_COUNT - 1 ? (create.isPending ? "Aanmaken…" : "Naar mijn dashboard")
    : "Ga verder";

  const onNext = () => {
    if (step === STEP_COUNT - 1) finish();
    else setStep((s) => s + 1);
  };

  return (
    <div className="wizard" role="dialog" aria-label="Nieuw pand toevoegen">
      {step === STEP_COUNT - 1 && <Confetti />}
      <div className="wiz-top">
        <div className="logo" style={{ fontSize: 17 }}>
          <Logo size={24} /> staybase
        </div>
        <div className="wiz-progress">
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <i key={i} className={i <= step ? "done" : ""} />
          ))}
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Sluiten"><Icon name="x" /></button>
      </div>

      <div className="wiz-body">
        {step === 0 && (
          <div className="wiz-step">
            <h2>Binnen 7 dagen staat je pand online 🚀</h2>
            <p className="lead">
              Jij vertelt ons over je pand, wij doen het zware werk: schoonmaak, fotoshoot, teksten en publicatie op de juiste kanalen.
            </p>
            <div className="card" style={{ marginTop: 28 }}>
              <div className="check-item"><span className="st ok">1</span><span><b>Vandaag — 5 minuutjes van jou</b><span>Enkele vragen over je pand, in mensentaal</span></span><span className="end" style={{ fontSize: 20 }}>☕</span></div>
              <div className="check-item"><span className="st ok">2</span><span><b>Deze week — wij komen langs</b><span>Schoonmaak, linnen en professionele fotoshoot</span></span><span className="end" style={{ fontSize: 20 }}>📸</span></div>
              <div className="check-item"><span className="st ok">3</span><span><b>Volgende week — je staat live</b><span>Op Airbnb en Booking.com, met slimme prijzen vanaf dag één</span></span><span className="end" style={{ fontSize: 20 }}>🎉</span></div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="wiz-step">
            <h2>Vertel eens over je pand 🏡</h2>
            <p className="lead">Geen zorgen als je iets niet zeker weet — alles kan later nog aangepast worden.</p>
            <div className="opt-grid">
              {[
                ["Huis", "🏠", "Vrijstaand of gesloten"],
                ["Appartement", "🏢", "Ook studio of penthouse"],
                ["Villa", "🏖️", "Met tuin of zwembad"],
              ].map(([t, em, sub]) => (
                <button key={t} className={`opt ${type === t ? "sel" : ""}`} onClick={() => setType(t)}>
                  <span className="em">{em}</span><b>{t}</b><span>{sub}</span>
                </button>
              ))}
            </div>
            <div className="fld">
              <label htmlFor="wAddr">Adres</label>
              <input type="text" id="wAddr" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="steppers">
              {[
                ["🛏️ Slaapkamers", bedrooms, setBedrooms],
                ["🛁 Badkamers", bathrooms, setBathrooms],
                ["👥 Max. gasten", maxGuests, setMaxGuests],
              ].map(([label, val, set]) => (
                <div className="stepper" key={label as string}>
                  <b>{label as string}</b>
                  <span className="ctl">
                    <button onClick={() => (set as (n: number) => void)(Math.max(0, (val as number) - 1))}>−</button>
                    <output className="num">{val as number}</output>
                    <button onClick={() => (set as (n: number) => void)((val as number) + 1)}>+</button>
                  </span>
                </div>
              ))}
            </div>
            <div className="amen">
              {AMENITIES.map((a) => (
                <button
                  key={a}
                  className={amenities.has(a) ? "sel" : ""}
                  onClick={() => setAmenities((s) => {
                    const n = new Set(s);
                    n.has(a) ? n.delete(a) : n.add(a);
                    return n;
                  })}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="wiz-step">
            <h2>Foto's die boekingen opleveren 📸</h2>
            <p className="lead">Panden met professionele foto's krijgen tot 40% meer boekingen. Onze fotograaf kent de kust — en het licht.</p>
            <div className="opt-grid two">
              <button className={`opt ${photoChoice === "photographer" ? "sel" : ""}`} onClick={() => setPhotoChoice("photographer")}>
                <span className="chip coral rec">Aanbevolen</span>
                <span className="em">📸</span><b>Onze fotograaf komt langs</b>
                <span>Er is deze week nog een slot vrij: donderdag 23 juli om 10:00. Wij regelen alles.</span>
              </button>
              <button className={`opt ${photoChoice === "own" ? "sel" : ""}`} onClick={() => setPhotoChoice("own")}>
                <span className="em">🤳</span><b>Ik gebruik eigen foto's</b>
                <span>Uploaden kan meteen — wij kiezen de beste volgorde</span>
              </button>
            </div>
            <div className="banner good">💡 <span>De shoot wordt pas gefactureerd als je pand live staat. Annuleren kan tot 24u vooraf.</span></div>
          </div>
        )}

        {step === 3 && (
          <div className="wiz-step">
            <h2>Veilig & volgens de regels 🛡️</h2>
            <p className="lead">Verhuren aan de kust vraagt een paar attesten. Staybase houdt bij wat in orde is — en regelt de rest mee.</p>
            <div className="card" style={{ marginTop: 24 }}>
              <div className="check-item">
                <span className={`st ${certRequested ? "ok" : "todo"}`}>{certRequested ? "✓" : "!"}</span>
                <span><b>Brandveiligheidsattest</b><span>Verplicht door Toerisme Vlaanderen</span></span>
                <span className="end">
                  {certRequested ? (
                    <span className="chip good">✓ Keuring aangevraagd — wij volgen op</span>
                  ) : (
                    <button className="btn primary sm" onClick={() => { setCertRequested(true); toast("Keuring aangevraagd via Certilogics (demo)"); }}>
                      Vraag keuring aan
                    </button>
                  )}
                </span>
              </div>
              <div className="check-item">
                <span className="st ok">✓</span>
                <span><b>EPC-attest</b><span>Gevonden via je adres — geldig tot 2031</span></span>
                <span className="end"><span className="chip good">In orde</span></span>
              </div>
              <div className="check-item">
                <span className="st ok">✓</span>
                <span><b>Verzekering burgerlijke aansprakelijkheid</b><span>Bevestigd bij onboarding</span></span>
                <span className="end"><span className="chip good">In orde</span></span>
              </div>
            </div>
            <div className="banner warn">⏳ <span><b>Je kan gewoon verdergaan.</b> Publiceren kan zodra het attest binnen is — wij volgen het op en verwittigen je. Zo blijft elk Staybase-pand gecontroleerd en betrouwbaar.</span></div>
          </div>
        )}

        {step === 4 && (
          <div className="wiz-step">
            <h2>Wie doet de schoonmaak? 🧽</h2>
            <p className="lead">Na elke check-out plant Staybase automatisch een poetsbeurt. Kies wat voor jou werkt — wisselen kan altijd.</p>
            <div className="opt-grid two">
              <button className={`opt ${cleaningChoice === "marketplace" ? "sel" : ""}`} onClick={() => setCleaningChoice("marketplace")}>
                <span className="chip coral rec">Populair</span>
                <span className="em">✨</span><b>Staybase regelt het</b>
                <span>Gescreende teams uit de buurt. Voor dit pand: ± € 85 per beurt, linnen inbegrepen.</span>
              </button>
              <button className={`opt ${cleaningChoice === "own" ? "sel" : ""}`} onClick={() => setCleaningChoice("own")}>
                <span className="em">👋</span><b>Ik heb een eigen poetsteam</b>
                <span>Zij krijgen na elke check-out automatisch een taak. Antwoorden ze niet, dan springt de marktplaats bij.</span>
              </button>
            </div>
            <div className="fld">
              <label htmlFor="wCleanMail">E-mail van je poetsteam (optioneel)</label>
              <input
                type="email" id="wCleanMail" placeholder="bv. rosa@poetsteam.be"
                value={cleaningEmail} onChange={(e) => setCleaningEmail(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="wiz-step">
            <h2>Waar wil je verhuren? 🌍</h2>
            <p className="lead">Jij blijft de host, in eigen naam. Staybase staat ernaast als co-host en doet het werk.</p>
            <div className="card" style={{ marginTop: 24 }}>
              <div className="check-item">
                <span className="st" style={{ background: "var(--coral-soft)", fontSize: 15 }}>🅰</span>
                <span><b>Airbnb — jouw eigen account</b><span>Jouw naam, jouw reviews. Staybase wordt co-host.</span></span>
                <span className="end">
                  {airbnbLinked ? (
                    <span className="chip good">✓ Gekoppeld als co-host</span>
                  ) : (
                    <button className="btn primary sm" onClick={() => { setAirbnbLinked(true); toast("Airbnb-account gekoppeld — jij blijft de host"); }}>
                      Koppel mijn account
                    </button>
                  )}
                </span>
              </div>
              <div className="check-item">
                <span className="st" style={{ background: "var(--booking-soft)", fontSize: 15 }}>🅱</span>
                <span><b>Booking.com</b><span>Loopt via het Staybase-account — geregeld voor jou</span></span>
                <span className="end"><span className="chip good">✓ Inbegrepen</span></span>
              </div>
              <div className="check-item">
                <span className="st" style={{ background: "var(--vrbo-soft)", fontSize: 15 }}>✌️</span>
                <span><b>VRBO</b><span>Extra bereik bij internationale gezinnen</span></span>
                <span className="end">
                  <button
                    className={`switch ${vrbo ? "on" : ""}`}
                    role="switch" aria-checked={vrbo} aria-label="VRBO inschakelen"
                    style={{ transform: "scale(.85)" }}
                    onClick={() => setVrbo((v) => !v)}
                  />
                </span>
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="wiz-step">
            <h2>Laat Staybase klinken als jou 🎙️</h2>
            <p className="lead">
              Eén belletje van 2 minuten. Geen vragenlijst — gewoon even babbelen over je pand.
              Daarna schrijft Staybase elk gastenbericht in jouw stem.
            </p>
            <div className="card mic-wrap" style={{ marginTop: 24 }}>
              <div className={`mic ${micState === "live" ? "live" : ""} ${micState === "done" ? "done-mic" : ""}`}>
                <Icon name="mic" size={34} />
              </div>
              <div className="mic-q">{micQ}</div>
              <p className="mic-sub">
                {micState === "idle" && "Duurt ± 2 minuten · je kan altijd opnieuw"}
                {micState === "live" && "Opname loopt · gewoon babbelen, geen juiste antwoorden"}
                {micState === "done" && "Je kan dit altijd opnieuw doen via je profiel"}
              </p>
              {micState === "idle" && (
                <button className="btn coral" style={{ marginTop: 18 }} onClick={startMic}>Start het belletje</button>
              )}
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="wiz-step">
            <h2>Alles staat klaar! 🎉</h2>
            <p className="lead">Wij gaan aan de slag. Jij hoort van ons — en volgt alles live op je dashboard.</p>
            <div className="card" style={{ marginTop: 24 }}>
              <div className="check-item"><span className="st ok">✓</span><span><b>{address}</b><span>{type} · {bedrooms} slpk · {maxGuests} gasten{amenities.has("🏊 Zwembad") ? " · zwembad" : ""}</span></span></div>
              <div className="check-item"><span className="st ok">✓</span><span><b>{photoChoice === "photographer" ? "Fotoshoot geboekt" : "Eigen foto's gekozen"}</b><span>{photoChoice === "photographer" ? "Donderdag 23 juli om 10:00" : "Uploaden kan meteen na afronden"}</span></span></div>
              <div className="check-item"><span className={`st ${certRequested ? "ok" : "todo"}`}>{certRequested ? "✓" : "⏳"}</span><span><b>Brandveiligheidsattest {certRequested ? "aangevraagd" : "nog te regelen"}</b><span>{certRequested ? "Keuring wordt ingepland — wij volgen op" : "Wij herinneren je eraan — publiceren kan zodra het binnen is"}</span></span></div>
              <div className="check-item"><span className="st ok">✓</span><span><b>Schoonmaak geregeld</b><span>{cleaningChoice === "marketplace" ? "Via de Staybase-marktplaats · ± € 85 per beurt" : `Jouw eigen team${cleaningEmail ? ` (${cleaningEmail})` : ""} · marktplaats als vangnet`}</span></span></div>
              <div className="check-item"><span className={`st ${airbnbLinked ? "ok" : "todo"}`}>{airbnbLinked ? "✓" : "⏳"}</span><span><b>{airbnbLinked ? "Airbnb gekoppeld als co-host" : "Airbnb koppelen kan ook later"}</b><span>Booking.com{vrbo ? " en VRBO" : ""} inbegrepen</span></span></div>
              <div className="check-item"><span className={`st ${micState === "done" ? "ok" : "todo"}`}>{micState === "done" ? "✓" : "⏳"}</span><span><b>{micState === "done" ? "Jouw schrijfstijl geleerd" : "Stem-intake kan ook later"}</b><span>Gastenberichten klinken voortaan als jij</span></span></div>
            </div>
            <div className="banner good">🗓️ <span><b>Verwachte livegang: vrijdag 24 juli.</b> Zodra het attest binnen is, publiceert Staybase automatisch.</span></div>
          </div>
        )}
      </div>

      <div className="wiz-foot">
        <div className="wiz-foot-in">
          <button className="btn ghost" style={{ visibility: step === 0 ? "hidden" : "visible" }} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            Terug
          </button>
          <button className="btn coral" onClick={onNext} disabled={create.isPending}>{nextLabel}</button>
        </div>
      </div>
    </div>
  );
}
