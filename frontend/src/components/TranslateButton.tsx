import { useState } from "react";
import { LANGUAGE_LABEL } from "@shared/types";
import { translateText } from "../lib/api";
import { useLocale } from "../i18n";
import { useToast } from "./Toast";
import { Icon } from "./Icon";

/**
 * Vertaalknop bij één bericht of AI-voorstel.
 *
 * Het origineel blijft altijd staan: de vertaling verschijnt eronder in een
 * apart blok. Bewust zo, want de host wil kunnen nakijken wat de gast écht
 * schreef. Een vertaling wordt per doeltaal onthouden, dus verbergen en weer
 * tonen kost geen tweede oproep; wissel je van taal, dan vertaalt hij opnieuw.
 */
export function Translatable({ text, tone = "guest" }: { text: string; tone?: "guest" | "host" | "ai" }) {
  const { lang, t } = useLocale();
  const toast = useToast();
  const [cache, setCache] = useState<Record<string, string>>({});
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);

  const translation = cache[lang];
  // Wissel je van taal terwijl een vertaling openstaat, dan is er voor de
  // nieuwe taal nog niets: de knop moet dan weer "Vertaal" zeggen.
  const visible = shown && Boolean(translation);

  const onClick = async () => {
    if (visible) {
      setShown(false);
      return;
    }
    if (translation) {
      setShown(true);
      return;
    }
    setBusy(true);
    try {
      const { text: out } = await translateText(text, lang);
      setCache((c) => ({ ...c, [lang]: out }));
      setShown(true);
    } catch (err) {
      // De API stuurt een leesbare melding mee; 503 betekent: geen AI-sleutel.
      const msg = err instanceof Error ? /"error":"([^"]+)"/.exec(err.message)?.[1] : null;
      toast(msg ?? t("translate.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className={`translate-btn ${tone}`} onClick={onClick} disabled={busy}>
        <Icon name="translate" size={13} />
        {busy ? t("translate.busy") : visible ? t("translate.hide") : t("translate.action")}
      </button>
      {visible && (
        <div className={`translation ${tone}`}>
          <span className="translation-lbl">{t("translate.label", { lang: LANGUAGE_LABEL[lang] })}</span>
          {translation}
        </div>
      )}
    </>
  );
}
