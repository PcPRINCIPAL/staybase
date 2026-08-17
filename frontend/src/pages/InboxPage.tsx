import { useState } from "react";
import type { Conversation } from "@shared/types";
import {
  useAiStatus, useApproveConversation, useConversations, useOverview,
  useRegenerateDraft, useReplyConversation,
} from "../lib/api";
import { CHANNEL_META } from "../lib/format";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";

function statusChip(c: Conversation) {
  if (c.status === "draft") return <span className="chip coral">✨ Antwoord klaar</span>;
  if (c.status === "guard") return <span className="chip warn">Voor jou</span>;
  return <span className="chip good">✓ Beantwoord</span>;
}

export function InboxPage() {
  const { data: convos, isLoading } = useConversations();
  const { data: overview } = useOverview();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);
  const approve = useApproveConversation();
  const reply = useReplyConversation();
  const regenerate = useRegenerateDraft();
  const { data: aiStatus } = useAiStatus();
  const toast = useToast();

  if (isLoading || !convos) return <div className="loading">Inbox laden…</div>;

  if (convos.length === 0) {
    return (
      <section className="page">
        <h1>Inbox</h1>
        <p className="sub">
          Alle gastenberichten van elk kanaal, in één plek. Staybase schrijft het antwoord — in jouw stijl. Jij keurt goed.
        </p>
        <div className="card" style={{ marginTop: 24, padding: "28px 24px", textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>📭</div>
          <b style={{ color: "var(--ink)" }}>Nog geen gesprekken</b>
          <p style={{ fontSize: 14, margin: "6px auto 0", maxWidth: 420 }}>
            Synchroniseer met Guesty via <b>Koppelingen</b> om de gastenberichten van Airbnb en Booking.com hier binnen te halen.
          </p>
        </div>
      </section>
    );
  }

  const active = convos.find((c) => c.id === activeId) ?? convos.find((c) => c.status === "draft") ?? convos[0];
  const trust = overview?.trust ?? { count: 13, target: 20 };

  const onApprove = () => {
    approve.mutate([active.id], {
      onSuccess: () => toast(`Verstuurd via ${CHANNEL_META[active.channel].name} ✓`),
    });
  };

  const onReply = () => {
    const body = replyText.trim();
    if (!body) return;
    reply.mutate([active.id, body], {
      onSuccess: () => {
        setReplyText("");
        setShowReply(false);
        toast(`Verstuurd via ${CHANNEL_META[active.channel].name} ✓`);
      },
    });
  };

  return (
    <section className="page inbox-page">
      <h1>Inbox</h1>
      <p className="sub">
        Alle gastenberichten van elk kanaal, in één plek. Staybase schrijft het antwoord — in jouw stijl. Jij keurt goed.
      </p>

      <div className="inbox-grid">
        <div className="inbox-left">
          <div className="card convo-list">
            {convos.map((c) => (
              <button
                key={c.id}
                className={`convo ${c.id === active.id ? "on" : ""}`}
                onClick={() => { setActiveId(c.id); setShowReply(false); }}
              >
                <span className="avat">{c.avatar}</span>
                <span style={{ minWidth: 0 }}>
                  <b>{c.guest}</b>
                  <span className="snip">{c.snippet}</span>
                </span>
                <span className="meta">
                  <time>{c.timeLabel}</time>
                  {statusChip(c)}
                </span>
              </button>
            ))}
          </div>
          <div className="card trust">
            <span style={{ fontSize: 20 }}>🎓</span>
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 13.5 }}>Staybase leert jouw stem · <span className="num">{trust.count}</span>/{trust.target}</b>
              <div className="bar-track" style={{ marginTop: 6 }}>
                <div className="bar-fill" style={{ width: `${(trust.count / trust.target) * 100}%` }} />
              </div>
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                Na {trust.target} goedkeuringen kan Staybase eenvoudige vragen zelf beantwoorden.
                Kortingen en voorwaarden blijven áltijd bij jou.
              </span>
            </div>
          </div>
        </div>

        <div className="card thread">
          <div className="thread-head">
            <span className="avat">{active.avatar}</span>
            <div>
              <b style={{ fontSize: 15 }}>{active.guest}</b><br />
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{active.propertyName}</span>
            </div>
            <span className={`chip ${CHANNEL_META[active.channel].chip}`} style={{ marginLeft: "auto" }}>
              {CHANNEL_META[active.channel].name}
            </span>
          </div>

          <div className="thread-body">
            {active.messages.map((m) => (
              <div key={m.id} className={`msg ${m.sender}`}>
                {m.body}
                <span className="mt">
                  {m.timeLabel}{m.auto ? " · automatisch verstuurd, in jouw stijl ✨" : ""}
                </span>
              </div>
            ))}
          </div>

          {active.status === "draft" && active.draft && (
            <div className="ai-card">
              <div className="ai-top"><Icon name="sparkle" /> Voorstel van Staybase</div>
              <p>{active.draft}</p>
              {active.draftNote && <div className="ai-note">💡 {active.draftNote}</div>}
              <div className="ai-actions">
                <button className="btn coral sm" onClick={onApprove} disabled={approve.isPending}>
                  <Icon name="check" /> {approve.isPending ? "Versturen…" : "Goedkeuren & versturen"}
                </button>
                <button className="btn ghost sm" onClick={() => { setShowReply(true); setReplyText(active.draft ?? ""); }}>
                  ✎ Aanpassen
                </button>
                {aiStatus?.llm && (
                  <button
                    className="btn ghost sm"
                    disabled={regenerate.isPending}
                    onClick={() =>
                      regenerate.mutate([active.id], {
                        onSuccess: () => toast("Nieuw voorstel geschreven ✨"),
                        onError: () => toast("Herschrijven mislukte — probeer opnieuw"),
                      })
                    }
                  >
                    {regenerate.isPending ? "Schrijven…" : "↻ Herschrijf met AI"}
                  </button>
                )}
              </div>
            </div>
          )}

          {active.status === "guard" && (
            <div className="ai-card guard">
              <div className="ai-top">💬 Wacht op jouw antwoord</div>
              <p>{active.guardReason ?? "De gast stuurde een bericht dat nog niet beantwoord is."}</p>
              <div className="ai-actions">
                <button className="btn primary sm" onClick={() => { setShowReply(true); setReplyText(""); }}>
                  Zelf antwoorden
                </button>
                {aiStatus?.llm && (
                  <button
                    className="btn ghost sm"
                    disabled={regenerate.isPending}
                    onClick={() =>
                      regenerate.mutate([active.id], {
                        onSuccess: () => toast("Voorstel geschreven — kijk het na ✨"),
                        onError: () => toast("Voorstel schrijven mislukte — probeer opnieuw"),
                      })
                    }
                  >
                    {regenerate.isPending ? "Schrijven…" : "✨ Laat Staybase een voorstel schrijven"}
                  </button>
                )}
              </div>
            </div>
          )}

          {active.status === "done" && !showReply && (
            <div style={{ padding: "0 20px 20px" }}>
              <span className="chip good">✓ Beantwoord</span>
            </div>
          )}

          {showReply && (
            <div className="reply-box">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onReply()}
                placeholder="Schrijf je antwoord…"
                autoFocus
              />
              <button className="btn primary sm" onClick={onReply} disabled={reply.isPending || !replyText.trim()}>
                {reply.isPending ? "…" : "Verstuur"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
