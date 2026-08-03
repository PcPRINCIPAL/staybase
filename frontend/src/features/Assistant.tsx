import { useRef, useState } from "react";
import { askAssistant } from "../lib/api";
import { Icon } from "../components/Icon";

interface ChatMsg {
  id: number;
  from: "user" | "bot";
  html: string;
}

const CHIPS = [
  "Hoeveel verdiende ik in juni? 💶",
  "Wanneer komt mijn volgende gast? 🔑",
  "Welk pand presteert het best? 🏆",
];

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { id: 0, from: "bot", html: "Dag Julie! Vraag me gerust iets over je panden, je boekingen of je opbrengsten. 😊" },
  ]);
  const [typing, setTyping] = useState(false);
  const idRef = useRef(1);
  const bodyRef = useRef<HTMLDivElement>(null);

  const scroll = () => {
    requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
    });
  };

  const ask = async (question: string) => {
    const clean = question.replace(/\s*[\p{Emoji_Presentation}\u{FE0F}]+\s*$/u, "").trim();
    setMsgs((m) => [...m, { id: idRef.current++, from: "user", html: question }]);
    setTyping(true);
    scroll();
    try {
      const { answer } = await askAssistant(clean);
      setMsgs((m) => [...m, { id: idRef.current++, from: "bot", html: answer }]);
    } catch {
      setMsgs((m) => [...m, { id: idRef.current++, from: "bot", html: "Oeps — ik kon de server even niet bereiken. Probeer opnieuw." }]);
    } finally {
      setTyping(false);
      scroll();
    }
  };

  return (
    <>
      {open && (
        <div className="assist">
          <div className="assist-head">
            <span style={{ fontSize: 18 }}>✨</span> Vraag het aan Staybase
            <button className="icon-btn" style={{ marginLeft: "auto", width: 30, height: 30 }} onClick={() => setOpen(false)} aria-label="Sluiten">
              <Icon name="x" />
            </button>
          </div>
          <div className="assist-body" ref={bodyRef}>
            {msgs.map((m) => (
              <div
                key={m.id}
                className={`msg ${m.from === "user" ? "host" : "guest"}`}
                dangerouslySetInnerHTML={{ __html: m.html }}
              />
            ))}
            {typing && <div className="typing"><i /><i /><i /></div>}
          </div>
          <div className="assist-chips">
            {CHIPS.map((c) => (
              <button key={c} onClick={() => ask(c)} disabled={typing}>{c}</button>
            ))}
          </div>
        </div>
      )}
      <button className="fab" onClick={() => setOpen((o) => !o)}>
        <span style={{ fontSize: 17 }}>✨</span> Vraag het aan Staybase
      </button>
    </>
  );
}
