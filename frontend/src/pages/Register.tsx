import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Logo } from "../components/Icon";
import { register } from "../lib/api";
import { useAuth } from "../auth";

export function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { setUser } = useAuth();
  const qc = useQueryClient();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("De wachtwoorden komen niet overeen.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const user = await register(name, email, password);
      qc.clear();
      setUser(user); // meteen ingelogd — de router stuurt door naar het dashboard
    } catch (err) {
      // De API stuurt een leesbare Nederlandse melding mee in {"error": "..."}.
      const msg = err instanceof Error ? /"error":"([^"]+)"/.exec(err.message)?.[1] : null;
      setError(msg ?? "Registreren lukte niet — probeer opnieuw.");
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
        <h1 style={{ fontSize: 22, textAlign: "center", marginTop: 18 }}>Maak je account aan ✨</h1>
        <p className="sub" style={{ textAlign: "center", marginBottom: 22 }}>
          Binnen een minuut zie je hoe je panden ervoor staan.
        </p>
        <div className="fld" style={{ marginTop: 0 }}>
          <label htmlFor="name">Naam</label>
          <input id="name" type="text" value={name} autoComplete="name" placeholder="Voornaam Achternaam"
            onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="fld">
          <label htmlFor="email">E-mailadres</label>
          <input id="email" type="email" value={email} autoComplete="email" placeholder="jij@voorbeeld.be"
            onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="fld">
          <label htmlFor="password">Wachtwoord</label>
          <input id="password" type="password" value={password} autoComplete="new-password" placeholder="Minstens 8 tekens"
            onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="fld">
          <label htmlFor="confirm">Bevestig wachtwoord</label>
          <input id="confirm" type="password" value={confirm} autoComplete="new-password" placeholder="Typ je wachtwoord nog eens"
            onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <div className="banner warn" style={{ marginTop: 14 }}>⚠️ <span>{error}</span></div>}
        <button className="btn coral" type="submit" disabled={busy}
          style={{ width: "100%", justifyContent: "center", marginTop: 20, padding: "13px 16px" }}>
          {busy ? "Account aanmaken…" : "Maak account aan"}
        </button>
        <p className="login-hint">
          Al een account? <Link to="/login" style={{ fontWeight: 700, color: "var(--coral-deep)" }}>Log in</Link>
        </p>
      </form>
      <p className="foot" style={{ padding: 0, marginTop: 18 }}>
        <Link to="/" style={{ color: "var(--muted)", fontWeight: 600 }}>← Terug naar de website</Link>
      </p>
    </div>
  );
}
