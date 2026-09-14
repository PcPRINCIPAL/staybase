import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Logo } from "../components/Icon";
import { useToast } from "../components/Toast";
import { geocodeAddress, trackOnboarding, useCreateProperty, type AddressSuggestion } from "../lib/api";
import { useT } from "../i18n";
import { useBrand } from "../components/OriginGate";
import { BRAND_LABEL } from "@shared/types";

const STEP_COUNT = 8;
const STEP_TITLES = [
  "Welkom", "Pandgegevens", "Foto's", "Attesten", "Schoonmaak", "Kanalen", "Stem-intake", "Overzicht",
];
// Analytics-labels (STEP_TITLES) blijven bewust Nederlands: ze worden
// opgeslagen in onboarding_events en moeten vergelijkbaar blijven over talen.
const MIC_Q_KEYS = ["wiz.micQ1", "wiz.micQ2", "wiz.micQ3", "wiz.micQ4"];
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
  const t = useT();
  const brand = BRAND_LABEL[useBrand()];
  const [step, setStep] = useState(0);
  const [type, setType] = useState("Huis");
  const [address, setAddress] = useState("Sparrendreef 24, 8300 Knokke-Heist");
  const [addrSuggestions, setAddrSuggestions] = useState<AddressSuggestion[]>([]);
  const [addrOpen, setAddrOpen] = useState(false);
  const [addrChecking, setAddrChecking] = useState(false);
  const [addrVerified, setAddrVerified] = useState(false);
  const addrTimer = useRef<ReturnType<typeof setTimeout>>();
  const addrSeq = useRef(0);
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
  const [micQ, setMicQ] = useState<string>("wiz.micIdle");
  const create = useCreateProperty();
  const toast = useToast();
  const nav = useNavigate();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  /* --- tijdsregistratie per stap (onboarding-analytics) --- */
  const track = useRef({ sessionId: crypto.randomUUID(), enteredAt: Date.now(), step: 0 });
  const logStep = (completed = false) => {
    const now = Date.now();
    trackOnboarding({
      sessionId: track.current.sessionId,
      step: track.current.step,
      stepTitle: STEP_TITLES[track.current.step] ?? String(track.current.step),
      durationMs: now - track.current.enteredAt,
      completed,
    });
    track.current.enteredAt = now;
  };
  const goToStep = (s: number) => {
    logStep();
    track.current.step = s;
    setStep(s);
  };
  const closeWizard = () => {
    logStep();
    onClose();
  };

  /* --- adres-autocomplete --- */
  const onAddressChange = (value: string) => {
    setAddress(value);
    setAddrVerified(false);
    clearTimeout(addrTimer.current);
    if (value.trim().length < 3) {
      setAddrOpen(false);
      setAddrChecking(false);
      return;
    }
    setAddrChecking(true);
    addrTimer.current = setTimeout(async () => {
      const seq = ++addrSeq.current;
      try {
        const results = await geocodeAddress(value.trim());
        if (seq !== addrSeq.current) return; // verouderd antwoord
        setAddrSuggestions(results);
        setAddrOpen(results.length > 0);
      } catch {
        setAddrOpen(false);
      } finally {
        if (seq === addrSeq.current) setAddrChecking(false);
      }
    }, 400);
  };
  const pickAddress = (s: AddressSuggestion) => {
    setAddress(s.value);
    setAddrOpen(false);
    setAddrVerified(true);
  };

  const startMic = () => {
    if (micState !== "idle") return;
    setMicState("live");
    let qi = 0;
    setMicQ(MIC_Q_KEYS[0]);
    const iv = setInterval(() => {
      qi++;
      if (qi < MIC_Q_KEYS.length) setMicQ(MIC_Q_KEYS[qi]);
      else {
        clearInterval(iv);
        setMicState("done");
        setMicQ("wiz.micDone");
      }
    }, 2200);
  };

  const street = address.split(",")[0].trim() || t("wiz.yourProperty");

  const finish = () => {
    logStep(true);
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
          toast(t("wiz.createdToast", { p: street }));
        },
        onError: () => toast(t("wiz.createFailed")),
      }
    );
  };

  const nextLabel =
    step === 0 ? t("wiz.next0")
    : step === STEP_COUNT - 2 ? t("wiz.nextFinish")
    : step === STEP_COUNT - 1 ? (create.isPending ? t("wiz.creating") : t("wiz.toDashboard"))
    : t("wiz.next");

  const onNext = () => {
    if (step === STEP_COUNT - 1) finish();
    else goToStep(step + 1);
  };

  return (
    <div className="wizard" role="dialog" aria-label={t("wiz.aria")}>
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
        <button className="icon-btn" onClick={closeWizard} aria-label={t("common.close")}><Icon name="x" /></button>
      </div>

      <div className="wiz-body">
        {step === 0 && (
          <div className="wiz-step">
            <h2>{t("wiz.s0.title")}</h2>
            <p className="lead">{t("wiz.s0.lead")}</p>
            <div className="card" style={{ marginTop: 28 }}>
              <div className="check-item"><span className="st ok">1</span><span><b>{t("wiz.s0.1h")}</b><span>{t("wiz.s0.1p")}</span></span><span className="end" style={{ fontSize: 20 }}>☕</span></div>
              <div className="check-item"><span className="st ok">2</span><span><b>{t("wiz.s0.2h")}</b><span>{t("wiz.s0.2p")}</span></span><span className="end" style={{ fontSize: 20 }}>📸</span></div>
              <div className="check-item"><span className="st ok">3</span><span><b>{t("wiz.s0.3h")}</b><span>{t("wiz.s0.3p")}</span></span><span className="end" style={{ fontSize: 20 }}>🎉</span></div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="wiz-step">
            <h2>{t("wiz.s1.title")}</h2>
            <p className="lead">{t("wiz.s1.lead")}</p>
            <div className="opt-grid">
              {[
                ["Huis", "🏠", t("wiz.s1.house"), t("wiz.s1.houseSub")],
                ["Appartement", "🏢", t("wiz.s1.apartment"), t("wiz.s1.apartmentSub")],
                ["Villa", "🏖️", t("wiz.s1.villa"), t("wiz.s1.villaSub")],
              ].map(([val, em, label, sub]) => (
                <button key={val} className={`opt ${type === val ? "sel" : ""}`} onClick={() => setType(val)}>
                  <span className="em">{em}</span><b>{label}</b><span>{sub}</span>
                </button>
              ))}
            </div>
            <div className="fld addr-wrap">
              <label htmlFor="wAddr">{t("wiz.s1.address")}</label>
              <input
                type="text"
                id="wAddr"
                value={address}
                autoComplete="off"
                onChange={(e) => onAddressChange(e.target.value)}
                onBlur={() => setTimeout(() => setAddrOpen(false), 150)}
              />
              {addrChecking && <span className="addr-status">{t("wiz.s1.searching")}</span>}
              {addrVerified && !addrChecking && <span className="addr-status ok">{t("wiz.s1.found")}</span>}
              {addrOpen && (
                <div className="addr-drop">
                  {addrSuggestions.map((s, i) => (
                    <button key={i} type="button" onMouseDown={(e) => { e.preventDefault(); pickAddress(s); }}>
                      📍 {s.label}
                      <span className="sub">{s.sub}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="steppers">
              {[
                [t("wiz.s1.bedrooms"), bedrooms, setBedrooms],
                [t("wiz.s1.bathrooms"), bathrooms, setBathrooms],
                [t("wiz.s1.maxGuests"), maxGuests, setMaxGuests],
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
            <h2>{t("wiz.s2.title")}</h2>
            <p className="lead">{t("wiz.s2.lead")}</p>
            <div className="opt-grid two">
              <button className={`opt ${photoChoice === "photographer" ? "sel" : ""}`} onClick={() => setPhotoChoice("photographer")}>
                <span className="chip coral rec">{t("wiz.s2.recommended")}</span>
                <span className="em">📸</span><b>{t("wiz.s2.photographer")}</b>
                <span>{t("wiz.s2.photographerSub")}</span>
              </button>
              <button className={`opt ${photoChoice === "own" ? "sel" : ""}`} onClick={() => setPhotoChoice("own")}>
                <span className="em">🤳</span><b>{t("wiz.s2.own")}</b>
                <span>{t("wiz.s2.ownSub")}</span>
              </button>
            </div>
            <div className="banner good">{t("wiz.s2.banner")}</div>
          </div>
        )}

        {step === 3 && (
          <div className="wiz-step">
            <h2>{t("wiz.s3.title")}</h2>
            <p className="lead">{t("wiz.s3.lead", { brand })}</p>
            <div className="card" style={{ marginTop: 24 }}>
              <div className="check-item">
                <span className={`st ${certRequested ? "ok" : "todo"}`}>{certRequested ? "✓" : "!"}</span>
                <span><b>{t("wiz.s3.fire")}</b><span>{t("wiz.s3.fireSub")}</span></span>
                <span className="end">
                  {certRequested ? (
                    <span className="chip good">{t("wiz.s3.fireRequested")}</span>
                  ) : (
                    <button className="btn primary sm" onClick={() => { setCertRequested(true); toast(t("wiz.s3.fireToast")); }}>
                      {t("wiz.s3.requestFire")}
                    </button>
                  )}
                </span>
              </div>
              <div className="check-item">
                <span className="st ok">✓</span>
                <span><b>{t("wiz.s3.epc")}</b><span>{t("wiz.s3.epcSub")}</span></span>
                <span className="end"><span className="chip good">{t("wiz.s3.ok")}</span></span>
              </div>
              <div className="check-item">
                <span className="st ok">✓</span>
                <span><b>{t("wiz.s3.insurance")}</b><span>{t("wiz.s3.insuranceSub")}</span></span>
                <span className="end"><span className="chip good">{t("wiz.s3.ok")}</span></span>
              </div>
            </div>
            <div className="banner warn">{t("wiz.s3.banner", { brand })}</div>
          </div>
        )}

        {step === 4 && (
          <div className="wiz-step">
            <h2>{t("wiz.s4.title")}</h2>
            <p className="lead">{t("wiz.s4.lead", { brand })}</p>
            <div className="opt-grid two">
              <button className={`opt ${cleaningChoice === "marketplace" ? "sel" : ""}`} onClick={() => setCleaningChoice("marketplace")}>
                <span className="chip coral rec">{t("wiz.s4.popular")}</span>
                <span className="em">✨</span><b>{t("wiz.s4.marketplace", { brand })}</b>
                <span>{t("wiz.s4.marketplaceSub")}</span>
              </button>
              <button className={`opt ${cleaningChoice === "own" ? "sel" : ""}`} onClick={() => setCleaningChoice("own")}>
                <span className="em">👋</span><b>{t("wiz.s4.own")}</b>
                <span>{t("wiz.s4.ownSub")}</span>
              </button>
            </div>
            <div className="fld">
              <label htmlFor="wCleanMail">{t("wiz.s4.email")}</label>
              <input
                type="email" id="wCleanMail" placeholder={t("wiz.s4.emailPh")}
                value={cleaningEmail} onChange={(e) => setCleaningEmail(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="wiz-step">
            <h2>{t("wiz.s5.title")}</h2>
            <p className="lead">{t("wiz.s5.lead", { brand })}</p>
            <div className="card" style={{ marginTop: 24 }}>
              <div className="check-item">
                <span className="st" style={{ background: "var(--coral-soft)", fontSize: 15 }}>🅰</span>
                <span><b>{t("wiz.s5.airbnb")}</b><span>{t("wiz.s5.airbnbSub", { brand })}</span></span>
                <span className="end">
                  {airbnbLinked ? (
                    <span className="chip good">{t("wiz.s5.linked")}</span>
                  ) : (
                    <button className="btn primary sm" onClick={() => { setAirbnbLinked(true); toast(t("wiz.s5.linkToast")); }}>
                      {t("wiz.s5.link")}
                    </button>
                  )}
                </span>
              </div>
              <div className="check-item">
                <span className="st" style={{ background: "var(--booking-soft)", fontSize: 15 }}>🅱</span>
                <span><b>Booking.com</b><span>{t("wiz.s5.bookingSub", { brand })}</span></span>
                <span className="end"><span className="chip good">{t("wiz.s5.included")}</span></span>
              </div>
              <div className="check-item">
                <span className="st" style={{ background: "var(--vrbo-soft)", fontSize: 15 }}>✌️</span>
                <span><b>VRBO</b><span>{t("wiz.s5.vrboSub")}</span></span>
                <span className="end">
                  <button
                    className={`switch ${vrbo ? "on" : ""}`}
                    role="switch" aria-checked={vrbo} aria-label={t("wiz.s5.vrboAria")}
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
            <h2>{t("wiz.s6.title", { brand })}</h2>
            <p className="lead">{t("wiz.s6.lead", { brand })}</p>
            <div className="card mic-wrap" style={{ marginTop: 24 }}>
              <div className={`mic ${micState === "live" ? "live" : ""} ${micState === "done" ? "done-mic" : ""}`}>
                <Icon name="mic" size={34} />
              </div>
              <div className="mic-q">{t(micQ, { brand })}</div>
              <p className="mic-sub">
                {micState === "idle" && t("wiz.s6.idle")}
                {micState === "live" && t("wiz.s6.live")}
                {micState === "done" && t("wiz.s6.done")}
              </p>
              {micState === "idle" && (
                <button className="btn coral" style={{ marginTop: 18 }} onClick={startMic}>{t("wiz.s6.start")}</button>
              )}
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="wiz-step">
            <h2>{t("wiz.s7.title")}</h2>
            <p className="lead">{t("wiz.s7.lead")}</p>
            <div className="card" style={{ marginTop: 24 }}>
              <div className="check-item"><span className="st ok">✓</span><span><b>{address}</b><span>{t("wiz.s7.meta", { type, s: bedrooms, g: maxGuests })}{amenities.has("🏊 Zwembad") ? t("wiz.s7.pool") : ""}</span></span></div>
              <div className="check-item"><span className="st ok">✓</span><span><b>{photoChoice === "photographer" ? t("wiz.s7.shootBooked") : t("wiz.s7.ownPhotos")}</b><span>{photoChoice === "photographer" ? t("wiz.s7.shootWhen") : t("wiz.s7.uploadAfter")}</span></span></div>
              <div className="check-item"><span className={`st ${certRequested ? "ok" : "todo"}`}>{certRequested ? "✓" : "⏳"}</span><span><b>{certRequested ? t("wiz.s7.fireRequested") : t("wiz.s7.fireTodo")}</b><span>{certRequested ? t("wiz.s7.fireReqSub") : t("wiz.s7.fireTodoSub")}</span></span></div>
              <div className="check-item"><span className="st ok">✓</span><span><b>{t("wiz.s7.cleaning")}</b><span>{cleaningChoice === "marketplace" ? t("wiz.s7.cleaningMarket", { brand }) : t("wiz.s7.cleaningOwn", { mail: cleaningEmail ? ` (${cleaningEmail})` : "" })}</span></span></div>
              <div className="check-item"><span className={`st ${airbnbLinked ? "ok" : "todo"}`}>{airbnbLinked ? "✓" : "⏳"}</span><span><b>{airbnbLinked ? t("wiz.s7.airbnbLinked") : t("wiz.s7.airbnbLater")}</b><span>{t("wiz.s7.channels", { vrbo: vrbo ? t("wiz.s7.andVrbo") : "" })}</span></span></div>
              <div className="check-item"><span className={`st ${micState === "done" ? "ok" : "todo"}`}>{micState === "done" ? "✓" : "⏳"}</span><span><b>{micState === "done" ? t("wiz.s7.voiceDone") : t("wiz.s7.voiceLater")}</b><span>{t("wiz.s7.voiceSub")}</span></span></div>
            </div>
            <div className="banner good">{t("wiz.s7.banner", { brand })}</div>
          </div>
        )}
      </div>

      <div className="wiz-foot">
        <div className="wiz-foot-in">
          <button className="btn ghost" style={{ visibility: step === 0 ? "hidden" : "visible" }} onClick={() => goToStep(Math.max(0, step - 1))}>
            {t("wiz.back")}
          </button>
          <button className="btn coral" onClick={onNext} disabled={create.isPending}>{nextLabel}</button>
        </div>
      </div>
    </div>
  );
}
