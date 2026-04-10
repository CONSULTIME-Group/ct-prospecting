import { useState } from "react";
import Head from "next/head";

export default function Login() {
  const [pwd, setPwd]       = useState("");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!pwd.trim()) return;
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      if (r.ok) { window.location.href = "/"; }
      else { setError("Mot de passe incorrect."); setLoading(false); }
    } catch {
      setError("Erreur réseau."); setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Consultime — Accès</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;600;700&display=swap" />
      </Head>
      <style>{`*{box-sizing:border-box;margin:0;padding:0} body{background:#F5F0E6;font-family:'IBM Plex Sans',sans-serif}`}</style>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40, justifyContent: "center" }}>
            <div style={{ width: 40, height: 40, background: "#0047B0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "'IBM Plex Mono',monospace" }}>CT</div>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#8A7A62", letterSpacing: "0.18em", textTransform: "uppercase" }}>CONSULTIME</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1E1A14" }}>Prospecting Engine</div>
            </div>
          </div>

          {/* Card */}
          <div style={{ background: "#FDFAF3", border: "1px solid #DDD6C4", padding: "32px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#8A7A62", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>Accès équipe</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1E1A14", marginBottom: 24 }}>Connexion</div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#8A7A62", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Mot de passe</label>
              <input
                type="password"
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleLogin(); }}
                placeholder="••••••••"
                autoFocus
                style={{ width: "100%", background: "#F5F0E6", border: `1px solid ${error ? "#B01C1C" : "#DDD6C4"}`, color: "#1E1A14", padding: "11px 14px", fontSize: 14, fontFamily: "'IBM Plex Sans',sans-serif", outline: "none" }}
              />
              {error && <div style={{ color: "#B01C1C", fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, marginTop: 6 }}>✕ {error}</div>}
            </div>

            <button
              onClick={handleLogin}
              disabled={loading || !pwd.trim()}
              style={{ width: "100%", background: loading || !pwd.trim() ? "#C4BAA4" : "#0047B0", border: "none", color: "#fff", padding: "12px 0", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: loading || !pwd.trim() ? "not-allowed" : "pointer", fontFamily: "'IBM Plex Sans',sans-serif" }}
            >
              {loading ? "Connexion…" : "Accéder"}
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: 20, fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#B5A890" }}>
            Accès réservé à l'équipe Consultime
          </div>
        </div>
      </div>
    </>
  );
}
