import { useEffect, useRef, useState } from "react";
import { askAssistant, useAiStatus } from "../lib/api";
import { Icon } from "../components/Icon";
import { useBrand } from "../components/OriginGate";
import { BRAND_LABEL } from "@shared/types";
import { useT } from "../i18n";
import { useAuth } from "../auth";

interface ChatMsg {
  id: number;
  from: "user" | "bot";
  html: string;
}

const CHIP_KEYS = ["assist.chip.revenue", "assist.chip.nextGuest", "assist.chip.best"];

export function Assistant() {
  const t = useT();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const idRef = useRef(1);
  const bodyRef = useRef<HTMLDivElement>(null);
  const { data: aiStatus } = useAiStatus();
  const brand = useBrand();
  // Bij Linnois heet de assistent 'Chat met Julie' — dat is ook de naam in de zijbalk.
  const title = brand === "linnois" ? t("assist.chatJulie") : t("assist.ask", { brand: BRAND_LABEL[brand] });

  // De begroeting hoort in de taal van het moment te staan, ook als je pas
  // later van taal wisselt zonder al iets gevraagd te hebben.
  const greeting = t("assist.greeting", { name: user?.name ?? "" }).replace(" !", "!").replace("  ", " ");
  const shown: ChatMsg[] = msgs.length ? msgs : [{ id: 0, from: "bot", html: greeting }];

  const scroll = () => {
    requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
    });
  };

  const ask = async (question: string) => {
    const clean = question.replace(/\s*[\p{Emoji_Presentation}\u{FE0F}]+\s*$/u, "").trim();
    setMsgs((m) => [...(m.length ? m : [{ id: 0, from: "bot" as const, html: greeting }]), { id: idRef.current++, from: "user" as const, html: question }]);
    setTyping(true);
    scroll();
    try {
      const { answer } = await askAssistant(clean);
      setMsgs((m) => [...m, { id: idRef.current++, from: "bot", html: answer }]);
    } catch {
      setMsgs((m) => [...m, { id: idRef.current++, from: "bot", html: t("assist.offline") }]);
    } finally {
      setTyping(false);
      scroll();
    }
  };

  // De homepage kan een vraag insturen (sb:ask) of het paneel openen (sb:open).
  useEffect(() => {
    const onAsk = (e: Event) => {
      const q = (e as CustomEvent<string>).detail?.trim();
      if (!q) return;
      setOpen(true);
      ask(q);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("sb:ask", onAsk);
    window.addEventListener("sb:open", onOpen);
    return () => {
      window.removeEventListener("sb:ask", onAsk);
      window.removeEventListener("sb:open", onOpen);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {open && (
        <div className="assist">
          <div className="assist-head">
            <span style={{ fontSize: 18 }}>✨</span> {title}
            <span className={`chip ${aiStatus?.llm ? "good" : "gray"}`} style={{ fontSize: 10.5 }}>
              {aiStatus?.llm ? t("assist.liveAI") : t("assist.demo")}
            </span>
            <button className="icon-btn" style={{ marginLeft: "auto", width: 30, height: 30 }} onClick={() => setOpen(false)} aria-label={t("common.close")}>
              <Icon name="x" />
            </button>
          </div>
          <div className="assist-body" ref={bodyRef}>
            {shown.map((m) => (
              <div
                key={m.id}
                className={`msg ${m.from === "user" ? "host" : "guest"}`}
                dangerouslySetInnerHTML={{ __html: m.html }}
              />
            ))}
            {typing && <div className="typing"><i /><i /><i /></div>}
          </div>
          <div className="assist-chips">
            {CHIP_KEYS.map((k) => (
              <button key={k} onClick={() => ask(t(k))} disabled={typing}>{t(k)}</button>
            ))}
          </div>
          <div className="assist-input">
            <input
              type="text"
              value={input}
              placeholder={t("assist.placeholder")}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim() && !typing) {
                  ask(input.trim());
                  setInput("");
                }
              }}
            />
            <button
              className="btn primary sm"
              disabled={typing || !input.trim()}
              onClick={() => { ask(input.trim()); setInput(""); }}
            >
              {t("assist.submit")}
            </button>
          </div>
        </div>
      )}
      <button className="fab" onClick={() => setOpen((o) => !o)}>
        <span style={{ fontSize: 17 }}>✨</span> {title}
      </button>
    </>
  );
}
