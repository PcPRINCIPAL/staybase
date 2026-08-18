import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Logo } from "../components/Icon";
import { login } from "../lib/api";
import { useAuth } from "../auth";

export function Login() {
  const [email, setEmail] = useState("julie@staybase.be");
  const [password, setPassword] = useState("staybase2026");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { setUser } = useAuth();
  const qc = useQueryClient();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(email, password);
      qc.clear();
      setUser(user);
    } catch {
      setError("E-mailadres of wachtwoord klopt niet.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={submit}>
        <div className="logo" style={{ justifyContent: "center", fontSize: 24 }}>
          <Logo size={34} /> staybase
        </div>
        <h1 style={{ fontSize: 22, textAlign: "center", marginTop: 18 }}>Welkom terug 👋</h1>
        <p className="sub" style={{ textAlign: "center", marginBottom: 22 }}>
          Log in en zie meteen hoe je panden ervoor staan.
        </p>
        <div className="fld" style={{ marginTop: 0 }}>
          <label htmlFor="email">E-mailadres</label>
          <input id="email" type="text" value={email} autoComplete="username" onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="fld">
          <label htmlFor="password">Wachtwoord</label>
          <input id="password" type="password" value={password} autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div className="banner warn" style={{ marginTop: 14 }}>⚠️ <span>{error}</span></div>}
        <button className="btn coral" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 20, padding: "13px 16px" }}>
          {busy ? "Aanmelden…" : "Log in"}
        </button>
        <p className="login-hint" style={{ marginBottom: 6 }}>
          Nog geen account? <Link to="/registreer" style={{ fontWeight: 700, color: "var(--coral-deep)" }}>Registreer gratis</Link>
        </p>
        <p className="login-hint">
          Demo: <b>julie@staybase.be</b> (beheerder) of <b>maxime@staybase.be</b> (eigenaar) · wachtwoord <b>staybase2026</b>
        </p>
      </form>
      <p className="foot" style={{ padding: 0, marginTop: 18 }}>
        <Link to="/" style={{ color: "var(--muted)", fontWeight: 600 }}>← Terug naar de website</Link>
      </p>
    </div>
  );
}
