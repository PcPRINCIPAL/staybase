import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Logo } from "../components/Icon";
import { register } from "../lib/api";
import { useAuth } from "../auth";
import { useLocale } from "../i18n";
import { LanguagePicker } from "../components/LanguagePicker";

export function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { setUser } = useAuth();
  const qc = useQueryClient();
  const { lang, t } = useLocale();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // De taal waarin iemand zich inschrijft wordt meteen zijn voorkeurstaal.
      const user = await register(name, email, password, lang);
      qc.clear();
      setUser(user); // meteen ingelogd — de router stuurt door naar het dashboard
    } catch (err) {
      // De API stuurt een leesbare Nederlandse melding mee in {"error": "..."}.
      const msg = err instanceof Error ? /"error":"([^"]+)"/.exec(err.message)?.[1] : null;
      setError(msg ?? t("auth.registerFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-lang"><LanguagePicker /></div>
      <form className="card login-card" onSubmit={submit}>
        <div className="logo" style={{ justifyContent: "center", fontSize: 24 }}>
          <Logo size={34} /> staybase
        </div>
        <h1 style={{ fontSize: 22, textAlign: "center", marginTop: 18 }}>{t("auth.registerTitle")} ✨</h1>
        <p className="sub" style={{ textAlign: "center", marginBottom: 22 }}>
          {t("auth.registerSub")}
        </p>
        <div className="fld" style={{ marginTop: 0 }}>
          <label htmlFor="name">{t("auth.name")}</label>
          <input id="name" type="text" value={name} autoComplete="name" placeholder={t("auth.namePlaceholder")}
            onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="fld">
          <label htmlFor="email">{t("auth.email")}</label>
          <input id="email" type="email" value={email} autoComplete="email" placeholder={t("auth.emailPlaceholder")}
            onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="fld">
          <label htmlFor="password">{t("auth.password")}</label>
          <input id="password" type="password" value={password} autoComplete="new-password" placeholder={t("auth.passwordPlaceholder")}
            onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="fld">
          <label htmlFor="confirm">{t("auth.confirm")}</label>
          <input id="confirm" type="password" value={confirm} autoComplete="new-password" placeholder={t("auth.confirmPlaceholder")}
            onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <div className="banner warn" style={{ marginTop: 14 }}>⚠️ <span>{error}</span></div>}
        <button className="btn coral" type="submit" disabled={busy}
          style={{ width: "100%", justifyContent: "center", marginTop: 20, padding: "13px 16px" }}>
          {busy ? t("auth.registering") : t("auth.register")}
        </button>
        <p className="login-hint">
          {t("auth.haveAccount")} <Link to="/login" style={{ fontWeight: 700, color: "var(--coral-deep)" }}>{t("auth.toLogin")}</Link>
        </p>
      </form>
      <p className="foot" style={{ padding: 0, marginTop: 18 }}>
        <Link to="/" style={{ color: "var(--muted)", fontWeight: 600 }}>{t("auth.backToSite")}</Link>
      </p>
    </div>
  );
}
