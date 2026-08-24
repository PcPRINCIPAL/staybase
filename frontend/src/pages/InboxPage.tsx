import { useState } from "react";
import type { Conversation } from "@shared/types";
import {
  useAiStatus, useApproveConversation, useConversations, useOverview,
  useRegenerateDraft, useReplyConversation,
} from "../lib/api";
import { CHANNEL_META } from "../lib/format";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { Translatable } from "../components/TranslateButton";
import { useT } from "../i18n";
import { useBrand } from "../components/OriginGate";
import { BRAND_LABEL } from "@shared/types";

function StatusChip({ c }: { c: Conversation }) {
  const t = useT();
  if (c.status === "draft") return <span className="chip coral">{t("inbox.status.draft")}</span>;
  if (c.status === "guard") return <span className="chip warn">{t("inbox.status.guard")}</span>;
  return <span className="chip good">{t("inbox.status.done")}</span>;
}

export function InboxPage() {
  const { data: convos, isLoading } = useConversations();
  const { data: overview } = useOverview();
  const [propertyId, setPropertyId] = useState("");   // "" = alle panden
  const [activeId, setActiveId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);
  const approve = useApproveConversation();
  const reply = useReplyConversation();
  const regenerate = useRegenerateDraft();
  const { data: aiStatus } = useAiStatus();
  const toast = useToast();
  const t = useT();
  const brand = BRAND_LABEL[useBrand()];

  if (isLoading || !convos) return <div className="loading">{t("inbox.title")}…</div>;

  if (convos.length === 0) {
    return (
      <section className="page">
        <h1>{t("inbox.title")}</h1>
        <p className="sub">{t("inbox.sub", { brand })}</p>
        <div className="card" style={{ marginTop: 24, padding: "28px 24px", textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>📭</div>
          <b style={{ color: "var(--ink)" }}>{t("inbox.empty.title")}</b>
          <p style={{ fontSize: 14, margin: "6px auto 0", maxWidth: 420 }}>{t("inbox.empty.body")}</p>
        </div>
      </section>
    );
  }

  // Panden met gesprekken, met hoeveel er nog op antwoord wachten. Alleen
  // panden die echt berichten hebben komen in de filter — een leeg pand
  // kiezen levert toch niets op.
  const perProperty = new Map<string, { name: string; total: number; open: number }>();
  for (const c of convos) {
    const e = perProperty.get(c.propertyId) ?? { name: c.propertyName, total: 0, open: 0 };
    e.total += 1;
    if (c.status !== "done") e.open += 1;
    perProperty.set(c.propertyId, e);
  }
  const properties = [...perProperty.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, "nl"));
  const openAll = convos.filter((c) => c.status !== "done").length;

  const shown = propertyId ? convos.filter((c) => c.propertyId === propertyId) : convos;
  // Het actieve gesprek moet in de filter passen; anders valt de keuze terug
  // op het eerste gesprek dat nog een antwoord nodig heeft.
  const active =
    shown.find((c) => c.id === activeId) ?? shown.find((c) => c.status === "draft") ?? shown[0] ?? null;
  const trust = overview?.trust ?? { count: 13, target: 20 };

  const filterBar = (
    <div className="inbox-filter">
      <label htmlFor="inbox-pand">{t("common.property")}</label>
      <select id="inbox-pand" className="plan-select" value={propertyId}
        onChange={(e) => { setPropertyId(e.target.value); setActiveId(null); setShowReply(false); }}>
        <option value="">{t("inbox.filter.all", { n: convos.length })}</option>
        {properties.map(([id, p]) => (
          <option key={id} value={id}>{p.name} ({p.total})</option>
        ))}
      </select>
      <span className="inbox-filter-count">
        {t(shown.length === 1 ? "inbox.filter.count" : "inbox.filter.countPlural", { n: shown.length })}
        {(propertyId ? shown.filter((c) => c.status !== "done").length : openAll) > 0 && (
          <> · <b>{propertyId ? shown.filter((c) => c.status !== "done").length : openAll}</b> {t("inbox.filter.waiting")}</>
        )}
      </span>
      {propertyId && (
        <button className="btn ghost sm" onClick={() => { setPropertyId(""); setActiveId(null); }}>
          {t("inbox.filter.showAll")}
        </button>
      )}
    </div>
  );

  if (!active) {
    return (
      <section className="page inbox-page">
        <h1>{t("inbox.title")}</h1>
        <p className="sub">{t("inbox.sub", { brand })}</p>
        {filterBar}
        <div className="card" style={{ padding: "28px 24px", textAlign: "center", color: "var(--muted)" }}>
          {t("inbox.filter.noneForProperty")}
        </div>
      </section>
    );
  }

  const onApprove = () => {
    approve.mutate([active.id], {
      onSuccess: () => toast(t("inbox.sentVia", { channel: CHANNEL_META[active.channel].name })),
    });
  };

  const onReply = () => {
    const body = replyText.trim();
    if (!body) return;
    reply.mutate([active.id, body], {
      onSuccess: () => {
        setReplyText("");
        setShowReply(false);
        toast(t("inbox.sentVia", { channel: CHANNEL_META[active.channel].name }));
      },
    });
  };

  return (
    <section className="page inbox-page">
      <h1>{t("inbox.title")}</h1>
      <p className="sub">{t("inbox.sub", { brand })}</p>

      {filterBar}

      <div className="inbox-grid">
        <div className="inbox-left">
          <div className="card convo-list">
            {shown.map((c) => (
              <button
                key={c.id}
                className={`convo ${c.id === active.id ? "on" : ""}`}
                onClick={() => { setActiveId(c.id); setShowReply(false); }}
              >
                <span className="avat">{c.avatar}</span>
                <span style={{ minWidth: 0 }}>
                  <b>{c.guest}</b>
                  {!propertyId && <span className="snip convo-prop">{c.propertyName}</span>}
                  <span className="snip">{c.snippet}</span>
                </span>
                <span className="meta">
                  <time>{c.timeLabel}</time>
                  <StatusChip c={c} />
                </span>
              </button>
            ))}
          </div>
          <div className="card trust">
            <span style={{ fontSize: 20 }}>🎓</span>
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 13.5 }}>{t("inbox.trust", { brand })} · <span className="num">{trust.count}</span>/{trust.target}</b>
              <div className="bar-track" style={{ marginTop: 6 }}>
                <div className="bar-fill" style={{ width: `${(trust.count / trust.target) * 100}%` }} />
              </div>
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                {t("inbox.trustBody", { brand, target: trust.target })}
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
                {/* Het origineel blijft staan; de vertaling komt eronder. */}
                <Translatable key={`${active.id}-${m.id}`} text={m.body} tone={m.sender === "guest" ? "guest" : "host"} />
                <span className="mt">
                  {m.timeLabel}{m.auto ? t("inbox.autoSent") : ""}
                </span>
              </div>
            ))}
          </div>

          {active.status === "draft" && active.draft && (
            <div className="ai-card">
              <div className="ai-top"><Icon name="sparkle" /> {t("inbox.proposal", { brand })}</div>
              <p>{active.draft}</p>
              <Translatable key={`draft-${active.id}`} text={active.draft} tone="ai" />
              {active.draftNote && <div className="ai-note">💡 {active.draftNote}</div>}
              <div className="ai-actions">
                <button className="btn coral sm" onClick={onApprove} disabled={approve.isPending}>
                  <Icon name="check" /> {approve.isPending ? t("inbox.approving") : t("inbox.approve")}
                </button>
                <button className="btn ghost sm" onClick={() => { setShowReply(true); setReplyText(active.draft ?? ""); }}>
                  {t("inbox.edit")}
                </button>
                {aiStatus?.llm && (
                  <button
                    className="btn ghost sm"
                    disabled={regenerate.isPending}
                    onClick={() =>
                      regenerate.mutate([active.id], {
                        onSuccess: () => toast(t("inbox.rewritten")),
                        onError: () => toast(t("inbox.rewriteFailed")),
                      })
                    }
                  >
                    {regenerate.isPending ? t("inbox.rewriting") : t("inbox.rewrite")}
                  </button>
                )}
              </div>
            </div>
          )}

          {active.status === "guard" && (
            <div className="ai-card guard">
              <div className="ai-top">{t("inbox.waitingTitle")}</div>
              <p>{active.guardReason ?? t("inbox.waitingBody")}</p>
              <div className="ai-actions">
                <button className="btn primary sm" onClick={() => { setShowReply(true); setReplyText(""); }}>
                  {t("inbox.answerSelf")}
                </button>
                {aiStatus?.llm && (
                  <button
                    className="btn ghost sm"
                    disabled={regenerate.isPending}
                    onClick={() =>
                      regenerate.mutate([active.id], {
                        onSuccess: () => toast(t("inbox.drafted")),
                        onError: () => toast(t("inbox.draftFailed")),
                      })
                    }
                  >
                    {regenerate.isPending ? t("inbox.rewriting") : t("inbox.letAiWrite", { brand })}
                  </button>
                )}
              </div>
            </div>
          )}

          {active.status === "done" && !showReply && (
            <div style={{ padding: "0 20px 20px" }}>
              <span className="chip good">{t("inbox.status.done")}</span>
            </div>
          )}

          {showReply && (
            <div className="reply-box">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onReply()}
                placeholder={t("inbox.replyPlaceholder")}
                autoFocus
              />
              <button className="btn primary sm" onClick={onReply} disabled={reply.isPending || !replyText.trim()}>
                {reply.isPending ? "…" : t("common.send")}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
