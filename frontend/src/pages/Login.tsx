import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Logo } from "../components/Icon";
import { login } from "../lib/api";
import { useAuth } from "../auth";
import { useT } from "../i18n";
import { LanguagePicker } from "../components/LanguagePicker";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { setUser } = useAuth();
  const qc = useQueryClient();
  const t = useT();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(email, password);
      qc.clear();
      setUser(user);
    } catch {
      setError(t("auth.wrongCredentials"));
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
        <h1 style={{ fontSize: 22, textAlign: "center", marginTop: 18 }}>{t("auth.loginTitle")} 👋</h1>
        <p className="sub" style={{ textAlign: "center", marginBottom: 22 }}>
          {t("auth.loginSub")}
        </p>
        <div className="fld" style={{ marginTop: 0 }}>
          <label htmlFor="email">{t("auth.email")}</label>
          <input id="email" type="text" value={email} autoComplete="username" onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="fld">
          <label htmlFor="password">{t("auth.password")}</label>
          <input id="password" type="password" value={password} autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div className="banner warn" style={{ marginTop: 14 }}>⚠️ <span>{error}</span></div>}
        <button className="btn coral" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 20, padding: "13px 16px" }}>
          {busy ? t("auth.loggingIn") : t("auth.login")}
        </button>
        <p className="login-hint">
          {t("auth.noAccount")} <Link to="/registreer" style={{ fontWeight: 700, color: "var(--coral-deep)" }}>{t("auth.registerFree")}</Link>
        </p>
      </form>
      <p className="foot" style={{ padding: 0, marginTop: 18 }}>
        <Link to="/" style={{ color: "var(--muted)", fontWeight: 600 }}>{t("auth.backToSite")}</Link>
      </p>
    </div>
  );
}
