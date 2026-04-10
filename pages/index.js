import { useState, useCallback, useEffect, useRef } from "react";
import Head from "next/head";

const PIPELINE_KEY = "ct-pipeline-v4";
const HISTORY_KEY = "ct-history-v4";
const MAX_HISTORY = 8;

const SECTORS = ["IT & Numérique","Banque & Finance","Assurance","Énergie","Transport & Logistique","Industrie / R&D","Télécoms & Médias","Retail & Distribution","Santé","Secteur public"];
const REGIONS = ["Île-de-France","Auvergne-Rhône-Alpes","Occitanie","Nouvelle-Aquitaine","Grand Est","Hauts-de-France","Normandie","Bretagne","Pays de la Loire","PACA","Centre-Val de Loire"];
const SIZES = ["PME (10–50 sal.)","PME (50–200 sal.)","ETI (200–500 sal.)","ETI (500–1000 sal.)","Grand compte (1000+)"];
const STATUSES = [
  { key:"to_contact", label:"À contacter",  color:"#0047B0", bg:"#EAF0FC" },
  { key:"contacted",  label:"Contacté J0",  color:"#6B4BB0", bg:"#F0EBF8" },
  { key:"following",  label:"En relance",   color:"#B85800", bg:"#FEF0E0" },
  { key:"meeting",    label:"RDV planifié", color:"#0E7490", bg:"#E0F7FA" },
  { key:"qualified",  label:"Qualifié ✓",   color:"#1A7040", bg:"#E6F4ED" },
  { key:"no_go",      label:"No-go",        color:"#B01C1C", bg:"#FDEAEA" },
];
const SORT_OPTIONS = [
  { value:"priority", label:"Priorité" },
  { value:"meddic",   label:"Score MEDDIC" },
  { value:"signal",   label:"Force signal" },
  { value:"ca",       label:"CA potentiel" },
];

const P = {
  bg:"#F5F0E6", surface:"#FDFAF3", card:"#FFFDF7",
  border:"#DDD6C4", bdk:"#C4BAA4",
  t:"#1E1A14", tm:"#4A3F30", tmt:"#8A7A62", tf:"#B5A890",
  a:"#0047B0", ab:"#EAF0FC",
  g:"#1A7040", gb:"#E6F4ED",
  o:"#B85800", ob:"#FEF0E0",
  r:"#B01C1C", rb:"#FDEAEA",
  te:"#0E7490", teb:"#E0F7FA",
  mono:"'IBM Plex Mono',monospace",
  sans:"'IBM Plex Sans',sans-serif",
};

const SEARCH_SYS = `Tu es directeur commercial senior chez Consultime (Groupe Freeland, ~500M€ CA). Tu connais parfaitement le marché B2B français de l'intermédiation freelance et les cycles d'achat DSI/DA.

CONSULTIME = intermédiation pure. On place des freelances IT (FI), ingénierie (FE) et fonctionnel (FC) chez des clients. Commission transparente 8-12% sur TJM. Sourcing en 24-48h. 176 000 profils vérifiés. Titulaire CANUT (accès marchés publics sans AO). JAMAIS de portage salarial.

Génère des entreprises françaises RÉELLES correspondant aux critères. Pour chaque compte, produis une analyse commerciale de niveau expert.

Retourne UNIQUEMENT JSON valide sans markdown :
{"leads":[{
  "nom": "Nom exact",
  "secteur": "Secteur précis",
  "ca_estime": "ex: 80-150M€",
  "effectif": "ex: 200-400 salariés",
  "siege": "Ville (département)",
  "dirigeant": "Prénom Nom si connu",
  "contact_cible": "Poste exact à contacter (DSI / DA / Directeur R&D / DRH...)",
  "champion_interne": "Poste de l allié opérationnel probable",
  "economic_buyer": "Qui signe le bon de commande",
  "signal": "Signal d intention TRÈS CONCRET, fait précis",
  "signal_force": 4,
  "source_signal": "Où détecter ce signal exactement",
  "meddic": {
    "metrics": true,
    "metrics_why": "Pourquoi en 1 phrase",
    "economic_buyer": true,
    "economic_buyer_why": "Raison précise",
    "identify_pain": true,
    "identify_pain_why": "Raison précise",
    "global": "CHAUD"
  },
  "tjm_marche": "TJM marché pour le profil cible, ex: 700-850€/j Paris",
  "potentiel_ca": "CA annuel estimé si 1-3 missions, ex: 180-450k€/an",
  "angle_consultime": "Quel argument Consultime mettre EN PREMIER",
  "risque_concurrent": "Risque principal et comment le gérer",
  "type_contrat": "Direct ou Accord-cadre ou AO ou CANUT",
  "timing_optimal": "Meilleur moment pour contacter",
  "profil_type": "Profil freelance le plus probable à placer",
  "questions_qualification": ["Q1 spécifique", "Q2 budget/décision", "Q3 urgence/timing"],
  "accroche_linkedin": "5 lignes MAX. Fait concret. Valeur. CTA. Consultime. Jamais FI/FE/FC. Jamais portage salarial.",
  "accroche_email": {"objet": "8 mots max", "corps": "100 mots max"},
  "plateforme": "FI",
  "priorite": 1
}],"resume":"2 phrases.","total_ca_potentiel":"ex: 800k-2M€/an"}

RÈGLES: CHAUD=3 vrais,TIEDE=2,FROID<=1. Références secteur uniquement. Lyon/Bordeaux/Toulouse TJM -10-15% vs Paris. CANUT uniquement secteur public.`;

const SEQ_SYS = `Tu es directeur commercial senior Consultime. Génère une séquence prospection B2B J0-J21 personnalisée.
RETOURNE UNIQUEMENT JSON sans markdown :
{"sequence":[
  {"jour":0,"canal":"LinkedIn","action":"Connexion","message":"1 phrase contextuelle"},
  {"jour":3,"canal":"LinkedIn","action":"Message","message":"5 lignes MAX"},
  {"jour":7,"canal":"Email","action":"Cold email","objet":"8 mots max","message":"100 mots max"},
  {"jour":12,"canal":"LinkedIn","action":"Relance valeur","message":"3 lignes + insight"},
  {"jour":16,"canal":"Téléphone","action":"Script appel","message":"script 30 sec mot pour mot"},
  {"jour":21,"canal":"Email","action":"Dernier contact","message":"question ouverte + fermeture"}
],"objections":[
  {"objection":"objection probable secteur","reponse":"script mot pour mot","question_retour":"question"},
  {"objection":"On utilise Malt","reponse":"Malt et Consultime sont complémentaires...","question_retour":"question"},
  {"objection":"Pas de budget","reponse":"script","question_retour":"question"},
  {"objection":"Trop chers","reponse":"Par rapport à quoi exactement ?...","question_retour":"ancrage prix"}
],"post_rdv":{"j1_objet":"objet","j1_corps":"récap + prochaine étape datée","j7_sans_reponse":"contenu valeur + CTA"},"disqualification":"critères précis pour passer en veille"}`;

function repairJSON(raw) {
  const txt = raw.replace(/```json\n?|```\n?/g, "").trim();
  try { return JSON.parse(txt); } catch {}
  const s = txt.indexOf("{");
  if (s === -1) throw new Error("Aucun JSON trouvé dans la réponse.");
  let depth = 0, end = -1;
  for (let i = s; i < txt.length; i++) {
    if (txt[i] === "{") depth++;
    else if (txt[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end > -1) { try { return JSON.parse(txt.slice(s, end + 1)); } catch {} }
  const li = txt.indexOf('"leads"');
  if (li > -1) {
    const as = txt.indexOf("[", li);
    if (as > -1) {
      const valid = []; let i = as + 1, d = 0, o = "";
      while (i < txt.length) {
        const c = txt[i]; o += c;
        if (c === "{") d++;
        else if (c === "}") { d--; if (d === 0) { try { JSON.parse(o); valid.push(o); } catch {} o = ""; } }
        i++;
      }
      if (valid.length > 0) return JSON.parse(`{"leads":[${valid.join(",")}],"resume":"Résultats partiels.","total_ca_potentiel":"N/C"}`);
    }
  }
  throw new Error("Réponse tronquée. Réduis le nombre de prospects.");
}

function sortLeads(leads, by) {
  const order = { CHAUD: 3, TIEDE: 2, FROID: 1 };
  const copy = [...leads];
  if (by === "priority") return copy.sort((a, b) => a.priorite - b.priorite);
  if (by === "meddic") return copy.sort((a, b) => (order[b.meddic?.global] || 0) - (order[a.meddic?.global] || 0));
  if (by === "signal") return copy.sort((a, b) => (b.signal_force || 0) - (a.signal_force || 0));
  if (by === "ca") return copy.sort((a, b) => { const p = s => parseInt((s || "0").replace(/[^0-9]/g, "")) || 0; return p(b.potentiel_ca) - p(a.potentiel_ca); });
  return copy.sort((a, b) => a.priorite - b.priorite);
}

async function callAPI(system, content, maxTokens = 8000, nocache = false) {
  const r = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages: [{ role: "user", content }], max_tokens: maxTokens, nocache }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
  const blocks = (d.content || []).filter(b => b.type === "text");
  return repairJSON(blocks[blocks.length - 1]?.text || "");
}

// ── localStorage helpers — SSR safe ──────────────────────────────────────────
function loadLS(key, def) {
  if (typeof window === "undefined") return def;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
  catch { return def; }
}
function saveLS(key, val) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Lbl({ children }) {
  return <div style={{ fontFamily: P.mono, fontSize: 9, color: P.tmt, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 5 }}>{children}</div>;
}

function Sel({ v, on, opts, ph, sm }) {
  return (
    <select value={v} onChange={e => on(e.target.value)} style={{ background: P.surface, border: `1px solid ${P.border}`, color: v ? P.t : P.tmt, padding: sm ? "5px 8px" : "9px 11px", fontSize: sm ? 10 : 12, fontFamily: P.sans, outline: "none", cursor: "pointer", width: "100%" }}>
      <option value="">{ph}</option>
      {opts.map((o, i) => <option key={i} value={typeof o === "string" ? o : o.value}>{typeof o === "string" ? o : o.label}</option>)}
    </select>
  );
}

function MeddicDot({ label, active, color, why }) {
  return <div title={`${label}${why ? ` — ${why}` : ""}`} style={{ width: 22, height: 22, background: active ? color : P.bg, border: `1px solid ${active ? color : P.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontFamily: P.mono, color: active ? "#fff" : P.tf, fontWeight: 700, cursor: "help" }}>{label[0]}</div>;
}

function SignalBar({ force }) {
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }} title={`Force signal : ${force}/5`}>
      {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ width: 6, height: 10, background: i <= force ? (force >= 4 ? P.g : force >= 3 ? P.o : P.r) : P.border }} />)}
    </div>
  );
}

function CopyBtn({ text, id, copied, onCopy, label = "Copier" }) {
  const ok = copied === id;
  return <button onClick={() => onCopy(text, id)} style={{ background: ok ? P.gb : P.surface, border: `1px solid ${ok ? P.g : P.bdk}`, color: ok ? P.g : P.tm, padding: "5px 12px", fontSize: 9, fontFamily: P.mono, letterSpacing: "0.1em", cursor: "pointer", textTransform: "uppercase", whiteSpace: "nowrap" }}>{ok ? "✓ Copié" : label}</button>;
}

function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 8, zIndex: 100 }}>
      {toasts.map(t => <div key={t.id} style={{ background: t.type === "error" ? P.r : P.g, color: "#fff", padding: "10px 16px", fontSize: 12, fontFamily: P.mono, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", animation: "slideIn 0.2s ease" }}>{t.msg}</div>)}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderLeft: `4px solid ${P.border}`, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      {[["60%", 14], ["40%", 10], ["80%", 10]].map(([w, h], i) => (
        <div key={i} style={{ width: w, height: h, background: P.border, marginBottom: 8, animation: "pulse 1.4s ease infinite", animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("search");
  const [sector, setSector] = useState("");
  const [region, setRegion] = useState("");
  const [size, setSize] = useState("");
  const [kw, setKw] = useState("");
  const [count, setCount] = useState(6);
  const [sortBy, setSortBy] = useState("priority");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [resume, setResume] = useState("");
  const [totalCA, setTotalCA] = useState("");
  const [error, setError] = useState("");
  const [pipeline, setPipeline] = useState([]);
  const [history, setHistory] = useState([]);
  const [pFilter, setPFilter] = useState("");
  const [open, setOpen] = useState(null);
  const [tabs, setTabs] = useState({});
  const [copied, setCopied] = useState(null);
  const [seqs, setSeqs] = useState({});
  const [loadSeq, setLoadSeq] = useState(null);
  const [saved, setSaved] = useState(new Set());
  const [toasts, setToasts] = useState([]);
  const progressRef = useRef(null);

  useEffect(() => {
    setPipeline(loadLS(PIPELINE_KEY, []));
    setHistory(loadLS(HISTORY_KEY, []));
  }, []);

  const toast = (msg, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  };

  const cp = (text, id) => { navigator.clipboard.writeText(text); setCopied(id); toast("Copié"); setTimeout(() => setCopied(null), 2000); };
  const getTab = k => tabs[k] || "radar";
  const setTab = (k, t) => setTabs(p => ({ ...p, [k]: t }));

  const sc = g => g === "CHAUD" ? P.g : g === "TIEDE" ? P.o : P.r;
  const scb = g => g === "CHAUD" ? P.gb : g === "TIEDE" ? P.ob : P.rb;
  const pc = p => p === "FI" ? P.a : p === "FE" ? "#006E96" : "#5A3DB5";
  const prc = p => p === 1 ? P.g : p === 2 ? P.o : P.tf;
  const prl = p => p === 1 ? "● Semaine" : p === 2 ? "◐ Ce mois" : "○ Veille";

  const canSearch = !loading && (sector || region || size || kw.trim());

  const doSearch = useCallback(async (overrideQuery = null) => {
    if (!canSearch && !overrideQuery) return;
    setLoading(true); setError(""); setResults([]); setResume(""); setTotalCA(""); setOpen(null); setProgress(0);
    progressRef.current = setInterval(() => setProgress(p => Math.min(p + 8, 88)), 400);
    const q = overrideQuery || [sector && `Secteur : ${sector}`, region && `Région : ${region}`, size && `Taille : ${size}`, kw && `Mots-clés : ${kw}`, `Nombre : ${count}`].filter(Boolean).join("\n");
    try {
      setStep("Analyse du marché et des signaux d intention...");
      const r = await callAPI(SEARCH_SYS, q, 8000);
      setResults(r.leads || []); setResume(r.resume || ""); setTotalCA(r.total_ca_potentiel || "");
      if (!overrideQuery) {
        const entry = { q, sector, region, size, kw, count, at: new Date().toISOString() };
        const nh = [entry, ...history.filter(h => h.q !== q)].slice(0, MAX_HISTORY);
        setHistory(nh); saveLS(HISTORY_KEY, nh);
      }
    } catch (e) { setError(e.message); toast(e.message, "error"); }
    finally { clearInterval(progressRef.current); setProgress(100); setTimeout(() => setProgress(0), 600); setLoading(false); setStep(""); }
  }, [canSearch, sector, region, size, kw, count, history]);

  const saveLead = (lead) => {
    if (saved.has(lead.nom)) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const entry = { ...lead, _id: id, _status: "to_contact", _notes: "", _at: new Date().toISOString() };
    const u = [entry, ...pipeline.filter(p => p.nom !== lead.nom)];
    setPipeline(u); saveLS(PIPELINE_KEY, u); setSaved(s => new Set([...s, lead.nom])); toast(`${lead.nom} ajouté au pipeline`);
  };
  const updStatus = (id, s) => { const u = pipeline.map(l => l._id === id ? { ...l, _status: s } : l); setPipeline(u); saveLS(PIPELINE_KEY, u); };
  const updNotes = (id, n) => { const u = pipeline.map(l => l._id === id ? { ...l, _notes: n } : l); setPipeline(u); saveLS(PIPELINE_KEY, u); };
  const delLead = (id) => { const u = pipeline.filter(l => l._id !== id); setPipeline(u); saveLS(PIPELINE_KEY, u); toast("Lead retiré"); };

  const genSeq = async (lead, key) => {
    setLoadSeq(key);
    try {
      const ctx = `Prospect : ${lead.nom} | Secteur : ${lead.secteur} | Siège : ${lead.siege} | CA : ${lead.ca_estime} | Effectif : ${lead.effectif}\nContact : ${lead.contact_cible} | Champion : ${lead.champion_interne || "N/A"} | Buyer : ${lead.economic_buyer || "N/A"}\nSignal : ${lead.signal} (force : ${lead.signal_force}/5)\nMEDDIC : ${lead.meddic?.global} | Plateforme : ${lead.plateforme} | TJM : ${lead.tjm_marche}\nAngle : ${lead.angle_consultime} | Contrat : ${lead.type_contrat} | Timing : ${lead.timing_optimal}\nProfil : ${lead.profil_type} | Concurrent : ${lead.risque_concurrent}`;
      const r = await callAPI(SEQ_SYS, ctx, 6000, true);
      setSeqs(s => ({ ...s, [key]: r })); toast("Séquence générée");
    } catch (e) { setSeqs(s => ({ ...s, [key]: { error: e.message } })); toast(e.message, "error"); }
    setLoadSeq(null);
  };

  const exportCSV = (data, filename) => {
    const h = ["Nom","Secteur","CA","Effectif","Siège","Contact","Champion","Buyer","Signal","Force","MEDDIC","TJM","CA potentiel","Angle","Contrat","Plateforme","Priorité","Statut","Accroche LI","Email Objet","Email Corps"];
    const rows = data.map(l => [l.nom,l.secteur,l.ca_estime,l.effectif,l.siege,l.contact_cible,l.champion_interne||"",l.economic_buyer||"",l.signal,l.signal_force||"",l.meddic?.global,l.tjm_marche||"",l.potentiel_ca||"",l.angle_consultime||"",l.type_contrat||"",l.plateforme,l.priorite||"",l._status||"",`"${(l.accroche_linkedin||"").replace(/"/g,'""').replace(/\n/g," ")}"`,l.accroche_email?.objet||"",`"${(l.accroche_email?.corps||"").replace(/"/g,'""').replace(/\n/g," ")}"`]);
    const csv = [h, ...rows].map(r => r.join(";")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })); a.download = filename || `ct_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    toast("Export téléchargé");
  };

  const Card = ({ lead, ckey, isPL }) => {
    const m = lead.meddic || {};
    const col = sc(m.global);
    const isOpen = open === ckey;
    const tab = getTab(ckey);
    const seq = seqs[ckey];
    const isSaved = isPL || saved.has(lead.nom);
    const st = STATUSES.find(s => s.key === lead._status) || STATUSES[0];

    return (
      <div style={{ background: P.card, border: `1px solid ${P.border}`, borderLeft: `4px solid ${col}`, boxShadow: "0 1px 5px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "14px 18px 12px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: P.t }}>{lead.nom}</span>
              <span style={{ background: pc(lead.plateforme), color: "#fff", padding: "1px 8px", fontSize: 9, fontFamily: P.mono, letterSpacing: "0.1em", fontWeight: 700 }}>{lead.plateforme}</span>
              {!isPL && <span style={{ fontFamily: P.mono, fontSize: 10, color: prc(lead.priorite) }}>{prl(lead.priorite)}</span>}
              {isPL && <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}44`, padding: "2px 8px", fontSize: 9, fontFamily: P.mono, fontWeight: 600 }}>{st.label}</span>}
              {lead.type_contrat === "CANUT" && <span style={{ background: P.teb, color: P.te, border: `1px solid ${P.te}44`, padding: "1px 7px", fontSize: 9, fontFamily: P.mono, fontWeight: 600 }}>CANUT</span>}
            </div>
            <div style={{ display: "flex", gap: 8, fontFamily: P.mono, fontSize: 10, color: P.tmt, flexWrap: "wrap", marginBottom: 5 }}>
              {[lead.secteur, lead.ca_estime, lead.effectif, lead.siege].filter(Boolean).map((v, i, a) => (
                <span key={i}>{v}{i < a.length - 1 ? <span style={{ color: P.border, margin: "0 2px" }}>·</span> : ""}</span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontFamily: P.mono, fontSize: 11, color: P.a, fontWeight: 600 }}>→ {lead.contact_cible}</span>
              {lead.champion_interne && <span style={{ fontFamily: P.mono, fontSize: 9, color: P.tmt }}>Champion : {lead.champion_interne}</span>}
            </div>
          </div>
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div style={{ display: "flex", gap: 3 }}>
              <MeddicDot label="Metrics"        active={m.metrics}        color={col} why={m.metrics_why} />
              <MeddicDot label="Economic Buyer" active={m.economic_buyer}  color={col} why={m.economic_buyer_why} />
              <MeddicDot label="Identify Pain"  active={m.identify_pain}   color={col} why={m.identify_pain_why} />
            </div>
            <span style={{ background: scb(m.global), color: col, border: `1px solid ${col}44`, padding: "2px 9px", fontSize: 9, fontFamily: P.mono, letterSpacing: "0.1em", fontWeight: 700 }}>{m.global || "—"}</span>
            {!isPL && <button onClick={() => saveLead(lead)} disabled={isSaved} style={{ background: isSaved ? P.gb : P.surface, border: `1px solid ${isSaved ? P.g : P.bdk}`, color: isSaved ? P.g : P.tm, padding: "4px 10px", fontSize: 9, fontFamily: P.mono, cursor: isSaved ? "default" : "pointer", textTransform: "uppercase", whiteSpace: "nowrap" }}>{isSaved ? "✓ Pipeline" : "+ Pipeline"}</button>}
            {isPL && <Sel v={lead._status} on={v => updStatus(lead._id, v)} opts={STATUSES.map(s => ({ label: s.label, value: s.key }))} ph="Statut" sm />}
          </div>
        </div>

        <div style={{ padding: "8px 18px", borderTop: `1px solid ${P.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: P.mono, fontSize: 9, color: P.o, letterSpacing: "0.12em", flexShrink: 0, fontWeight: 600 }}>SIGNAL</span>
          <span style={{ color: P.tm, flex: 1, fontSize: 12, lineHeight: 1.4 }}>{lead.signal}</span>
          <SignalBar force={lead.signal_force || 0} />
          <span style={{ fontFamily: P.mono, fontSize: 9, color: P.tf, flexShrink: 0 }}>via {lead.source_signal}</span>
        </div>

        <div style={{ padding: "8px 18px", borderTop: `1px solid ${P.border}`, display: "flex", gap: 16, flexWrap: "wrap" }}>
          {lead.tjm_marche && <div><div style={{ fontFamily: P.mono, fontSize: 8, color: P.tmt, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>TJM marché</div><div style={{ fontFamily: P.mono, fontSize: 11, fontWeight: 600, color: P.t }}>{lead.tjm_marche}</div></div>}
          {lead.potentiel_ca && <div><div style={{ fontFamily: P.mono, fontSize: 8, color: P.tmt, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>CA potentiel</div><div style={{ fontFamily: P.mono, fontSize: 11, fontWeight: 600, color: P.g }}>{lead.potentiel_ca}</div></div>}
          {lead.profil_type && <div style={{ flex: 1 }}><div style={{ fontFamily: P.mono, fontSize: 8, color: P.tmt, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>Profil cible</div><div style={{ fontSize: 11, color: P.tm }}>{lead.profil_type}</div></div>}
          {lead.timing_optimal && <div style={{ flexShrink: 0 }}><div style={{ fontFamily: P.mono, fontSize: 8, color: P.tmt, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>Timing</div><div style={{ fontSize: 11, color: P.tm }}>{lead.timing_optimal}</div></div>}
        </div>

        {isPL && <div style={{ padding: "6px 18px", borderTop: `1px solid ${P.border}` }}><textarea value={lead._notes || ""} onChange={e => updNotes(lead._id, e.target.value)} placeholder="Notes..." style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: P.tm, fontSize: 11, fontFamily: P.sans, resize: "none", lineHeight: 1.5, boxSizing: "border-box", minHeight: 28 }} /></div>}

        <div style={{ borderTop: `1px solid ${P.border}` }}>
          <button onClick={() => setOpen(isOpen ? null : ckey)} style={{ width: "100%", background: "transparent", border: "none", color: P.tmt, padding: "8px 18px", fontSize: 10, fontFamily: P.mono, letterSpacing: "0.08em", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase" }} onMouseEnter={e => e.currentTarget.style.background = P.bg} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <span>{isOpen ? "▾" : "▸"}</span>Analyse &amp; Outreach
            <span style={{ marginLeft: "auto", fontFamily: P.mono, fontSize: 9, color: P.tf, fontWeight: 400 }}>Radar · LinkedIn · Email · Séquence</span>
          </button>

          {isOpen && (
            <div style={{ borderTop: `1px solid ${P.border}` }}>
              <div style={{ display: "flex", background: P.bg, borderBottom: `1px solid ${P.border}`, overflowX: "auto" }}>
                {[["radar", "🎯 Radar"], ["linkedin", "LinkedIn"], ["email", "Email"], ["sequence", "Séquence J0–J21"]].map(([t, l]) => (
                  <button key={t} onClick={() => setTab(ckey, t)} style={{ background: "transparent", border: "none", borderBottom: tab === t ? `2px solid ${P.a}` : "2px solid transparent", color: tab === t ? P.a : P.tmt, padding: "8px 16px", fontSize: 10, fontFamily: P.mono, letterSpacing: "0.08em", cursor: "pointer", textTransform: "uppercase", marginBottom: -1, whiteSpace: "nowrap" }}>{l}</button>
                ))}
              </div>

              <div style={{ padding: "16px 18px" }}>
                {tab === "radar" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <Lbl>Analyse MEDDIC</Lbl>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {[["M — Metrics", m.metrics, m.metrics_why], ["E — Economic Buyer", m.economic_buyer, m.economic_buyer_why], ["I — Identify Pain", m.identify_pain, m.identify_pain_why]].map(([label, active, why]) => (
                          <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px", background: active ? P.gb : P.rb, border: `1px solid ${active ? P.g + "44" : P.r + "44"}` }}>
                            <span style={{ fontFamily: P.mono, fontSize: 9, color: active ? P.g : P.r, fontWeight: 700, flexShrink: 0, paddingTop: 1 }}>{active ? "✓" : "✗"}</span>
                            <div><div style={{ fontFamily: P.mono, fontSize: 10, color: active ? P.g : P.r, fontWeight: 600, marginBottom: 2 }}>{label}</div><div style={{ fontSize: 12, color: P.tm, lineHeight: 1.5 }}>{why || "—"}</div></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {lead.angle_consultime && (
                      <div style={{ background: P.ab, border: `1px solid ${P.a}33`, borderLeft: `3px solid ${P.a}`, padding: "10px 14px" }}>
                        <Lbl>Angle Consultime à mettre en avant</Lbl>
                        <div style={{ fontSize: 13, color: P.tm, lineHeight: 1.5, fontWeight: 500 }}>{lead.angle_consultime}</div>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {lead.risque_concurrent && <div style={{ background: P.bg, border: `1px solid ${P.border}`, padding: "10px 12px" }}><Lbl>Risque concurrent</Lbl><div style={{ fontSize: 12, color: P.tm, lineHeight: 1.5 }}>{lead.risque_concurrent}</div></div>}
                      {lead.type_contrat && <div style={{ background: P.bg, border: `1px solid ${P.border}`, padding: "10px 12px" }}><Lbl>Type de contrat</Lbl><div style={{ fontFamily: P.mono, fontSize: 13, color: P.t, fontWeight: 600 }}>{lead.type_contrat}</div></div>}
                      {lead.economic_buyer && <div style={{ background: P.bg, border: `1px solid ${P.border}`, padding: "10px 12px" }}><Lbl>Qui signe le BC</Lbl><div style={{ fontSize: 12, color: P.tm }}>{lead.economic_buyer}</div></div>}
                      {lead.dirigeant && <div style={{ background: P.bg, border: `1px solid ${P.border}`, padding: "10px 12px" }}><Lbl>Dirigeant</Lbl><div style={{ fontSize: 12, color: P.tm }}>{lead.dirigeant}</div></div>}
                    </div>
                    {lead.questions_qualification?.length > 0 && (
                      <div>
                        <Lbl>Questions de qualification</Lbl>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {lead.questions_qualification.map((q, qi) => (
                            <div key={qi} style={{ display: "flex", gap: 10, padding: "8px 12px", background: P.bg, border: `1px solid ${P.border}` }}>
                              <span style={{ fontFamily: P.mono, fontSize: 10, color: P.a, fontWeight: 700, flexShrink: 0 }}>Q{qi + 1}</span>
                              <span style={{ fontSize: 12, color: P.tm, lineHeight: 1.5 }}>{q}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tab === "linkedin" && <>
                  <div style={{ background: P.bg, border: `1px solid ${P.border}`, padding: "14px 16px", fontSize: 13, lineHeight: 1.8, color: P.tm, whiteSpace: "pre-wrap", fontFamily: P.sans, marginBottom: 10 }}>{lead.accroche_linkedin}</div>
                  <CopyBtn text={lead.accroche_linkedin} id={`li-${ckey}`} copied={copied} onCopy={cp} />
                </>}

                {tab === "email" && lead.accroche_email && <>
                  <div style={{ marginBottom: 10 }}><Lbl>Objet</Lbl><div style={{ background: P.bg, border: `1px solid ${P.border}`, padding: "10px 14px", fontSize: 13, fontWeight: 600, color: P.t, fontFamily: P.sans }}>{lead.accroche_email.objet}</div></div>
                  <div style={{ marginBottom: 10 }}><Lbl>Corps</Lbl><div style={{ background: P.bg, border: `1px solid ${P.border}`, padding: "14px 16px", fontSize: 13, lineHeight: 1.8, color: P.tm, whiteSpace: "pre-wrap", fontFamily: P.sans }}>{lead.accroche_email.corps}</div></div>
                  <CopyBtn text={`Objet : ${lead.accroche_email.objet}\n\n${lead.accroche_email.corps}`} id={`em-${ckey}`} copied={copied} onCopy={cp} label="Copier email complet" />
                </>}

                {tab === "sequence" && <>
                  {!seq && loadSeq !== ckey && <button onClick={() => genSeq(lead, ckey)} style={{ background: P.a, border: "none", color: "#fff", padding: "10px 20px", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: P.sans }}>Générer la séquence J0–J21</button>}
                  {loadSeq === ckey && <div style={{ display: "flex", alignItems: "center", gap: 10, color: P.tmt, fontFamily: P.mono, fontSize: 11 }}><div style={{ width: 16, height: 16, border: `2px solid ${P.border}`, borderTopColor: P.a, borderRadius: "50%", animation: "spin 0.75s linear infinite" }} /> Génération...</div>}
                  {seq && !seq.error && <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                      {seq.sequence?.map((s, si) => (
                        <div key={si} style={{ background: P.bg, border: `1px solid ${P.border}`, padding: "10px 14px" }}>
                          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: P.mono, fontSize: 10, color: P.a, fontWeight: 700, minWidth: 28 }}>J{s.jour}</span>
                            <span style={{ fontFamily: P.mono, fontSize: 9, color: P.tmt, textTransform: "uppercase" }}>{s.canal}</span>
                            <span style={{ fontFamily: P.mono, fontSize: 9, color: P.tf }}>→ {s.action}</span>
                            <div style={{ marginLeft: "auto" }}><CopyBtn text={s.objet ? `Objet : ${s.objet}\n\n${s.message}` : s.message} id={`sq-${ckey}-${si}`} copied={copied} onCopy={cp} /></div>
                          </div>
                          {s.objet && <div style={{ fontFamily: P.sans, fontSize: 11, fontWeight: 600, color: P.t, marginBottom: 4 }}>Objet : {s.objet}</div>}
                          <div style={{ fontSize: 12, lineHeight: 1.65, color: P.tm, whiteSpace: "pre-wrap", fontFamily: P.sans }}>{s.message}</div>
                        </div>
                      ))}
                    </div>
                    {seq.objections?.length > 0 && <>
                      <Lbl>Scripts objections</Lbl>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                        {seq.objections.map((obj, oi) => (
                          <div key={oi} style={{ background: P.bg, border: `1px solid ${P.border}`, padding: "10px 14px" }}>
                            <div style={{ fontFamily: P.mono, fontSize: 10, color: P.o, fontWeight: 600, marginBottom: 4 }}>"{obj.objection}"</div>
                            <div style={{ fontSize: 12, color: P.tm, lineHeight: 1.5, fontFamily: P.sans, marginBottom: 6 }}>{obj.reponse}</div>
                            <div style={{ fontFamily: P.mono, fontSize: 10, color: P.a }}>→ {obj.question_retour}</div>
                          </div>
                        ))}
                      </div>
                    </>}
                    {seq.post_rdv && <>
                      <Lbl>Post-RDV</Lbl>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        {seq.post_rdv.j1_corps && <div style={{ background: P.bg, border: `1px solid ${P.border}`, padding: "10px 14px" }}><Lbl>J+1</Lbl>{seq.post_rdv.j1_objet && <div style={{ fontFamily: P.sans, fontSize: 11, fontWeight: 600, color: P.t, marginBottom: 4 }}>Objet : {seq.post_rdv.j1_objet}</div>}<div style={{ fontSize: 11, color: P.tm, lineHeight: 1.5 }}>{seq.post_rdv.j1_corps}</div></div>}
                        {seq.disqualification && <div style={{ background: P.rb, border: `1px solid ${P.r}33`, padding: "10px 14px" }}><Lbl>Disqualification</Lbl><div style={{ fontSize: 11, color: P.tm, lineHeight: 1.5 }}>{seq.disqualification}</div></div>}
                      </div>
                    </>}
                  </>}
                  {seq?.error && <div style={{ color: P.r, fontFamily: P.mono, fontSize: 11 }}>✕ {seq.error}</div>}
                </>}
              </div>
            </div>
          )}
        </div>
        {isPL && <div style={{ borderTop: `1px solid ${P.border}`, padding: "5px 18px", display: "flex", justifyContent: "flex-end" }}><button onClick={() => delLead(lead._id)} style={{ background: "transparent", border: "none", color: P.tf, fontSize: 10, fontFamily: P.mono, cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.color = P.r} onMouseLeave={e => e.currentTarget.style.color = P.tf}>× Retirer</button></div>}
      </div>
    );
  };

  const sorted = sortLeads(results, sortBy);
  const filtPL = pFilter ? pipeline.filter(l => l._status === pFilter) : pipeline;
  const plStats = { total: pipeline.length, chaud: pipeline.filter(l => l.meddic?.global === "CHAUD").length, rdv: pipeline.filter(l => l._status === "meeting").length, qualified: pipeline.filter(l => l._status === "qualified").length };

  return (
    <>
      <Head>
        <title>Consultime Prospecting Engine</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap" />
      </Head>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}body{background:${P.bg};font-family:${P.sans}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}textarea::placeholder,input::placeholder{color:${P.tf}}select option{background:${P.surface};color:${P.t}}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:${P.bdk}}.gh:hover{background:${P.ab}!important;border-color:${P.a}!important;color:${P.a}!important}`}</style>

      {progress > 0 && <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 200 }}><div style={{ height: "100%", width: `${progress}%`, background: P.a, transition: "width 0.4s ease" }} /></div>}

      <div style={{ fontFamily: P.sans, background: P.bg, minHeight: "100vh", color: P.t }}>
        <div style={{ background: P.surface, borderBottom: `1px solid ${P.border}`, padding: "13px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 36, height: 36, background: P.a, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: P.mono }}>CT</div>
            <div>
              <div style={{ fontFamily: P.mono, fontSize: 9, color: P.tmt, letterSpacing: "0.18em", textTransform: "uppercase" }}>CONSULTIME</div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Prospecting Engine <span style={{ fontFamily: P.mono, fontSize: 9, color: P.a, fontWeight: 400, marginLeft: 6 }}>v4</span></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {totalCA && <span style={{ fontFamily: P.mono, fontSize: 10, color: P.g, background: P.gb, border: `1px solid ${P.g}44`, padding: "4px 10px" }}>CA potentiel : {totalCA}</span>}
            {pipeline.length > 0 && <button className="gh" onClick={() => exportCSV(pipeline)} style={{ background: P.surface, border: `1px solid ${P.bdk}`, color: P.tm, padding: "6px 12px", fontFamily: P.mono, fontSize: 9, letterSpacing: "0.1em", cursor: "pointer", textTransform: "uppercase" }}>↓ Pipeline CSV</button>}
          </div>
        </div>

        <div style={{ background: P.surface, borderBottom: `1px solid ${P.border}`, padding: "0 24px", display: "flex" }}>
          {[["search", "🔍 Recherche"], ["pipeline", `📋 Pipeline (${pipeline.length})`]].map(([v, l]) => (
            <button key={v} onClick={() => setView(v)} style={{ background: "transparent", border: "none", borderBottom: view === v ? `2px solid ${P.a}` : "2px solid transparent", color: view === v ? P.a : P.tmt, padding: "10px 20px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, marginBottom: -1 }}>{l}</button>
          ))}
        </div>

        {view === "search" && (
          <div style={{ display: "flex", maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ width: 272, flexShrink: 0, padding: "20px 16px", borderRight: `1px solid ${P.border}`, minHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column", gap: 12 }}>
              <div><Lbl>Secteur cible</Lbl><Sel v={sector} on={setSector} opts={SECTORS} ph="Tous secteurs" /></div>
              <div><Lbl>Région</Lbl><Sel v={region} on={setRegion} opts={REGIONS} ph="France entière" /></div>
              <div><Lbl>Taille</Lbl><Sel v={size} on={setSize} opts={SIZES} ph="Toutes tailles" /></div>
              <div><Lbl>Mots-clés / signal</Lbl><input value={kw} onChange={e => setKw(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) doSearch(); }} placeholder="Ex : recrutement IT gelé, ERP, RSSI..." style={{ width: "100%", background: P.surface, border: `1px solid ${P.border}`, color: P.t, padding: "9px 11px", fontSize: 12, fontFamily: P.sans, outline: "none", boxSizing: "border-box" }} /></div>
              <div><Lbl>Nombre de prospects</Lbl><Sel v={String(count)} on={v => setCount(Number(v))} opts={[{label:"4",value:"4"},{label:"6",value:"6"},{label:"8",value:"8"}]} ph="6" /></div>
              <button onClick={() => doSearch()} disabled={!canSearch} style={{ background: canSearch ? P.a : P.bdk, border: "none", color: canSearch ? "#fff" : P.tf, padding: "12px 20px", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: canSearch ? "pointer" : "not-allowed", fontFamily: P.sans, marginTop: 4 }}>{loading ? "Analyse en cours..." : "Trouver des prospects"}</button>
              {results.length > 0 && <button className="gh" onClick={() => exportCSV(results)} style={{ background: P.surface, border: `1px solid ${P.bdk}`, color: P.tm, padding: "8px 12px", fontSize: 9, fontFamily: P.mono, letterSpacing: "0.1em", cursor: "pointer", textTransform: "uppercase" }}>↓ Export résultats ({results.length})</button>}
              {history.length > 0 && (
                <div style={{ marginTop: 8, paddingTop: 12, borderTop: `1px solid ${P.border}` }}>
                  <Lbl>Recherches récentes</Lbl>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {history.slice(0, 5).map((h, i) => (
                      <button key={i} onClick={() => { setSector(h.sector || ""); setRegion(h.region || ""); setSize(h.size || ""); setKw(h.kw || ""); setCount(h.count || 6); doSearch(h.q); }} style={{ background: "transparent", border: `1px solid ${P.border}`, color: P.tmt, padding: "5px 9px", fontSize: 10, fontFamily: P.mono, cursor: "pointer", textAlign: "left", lineHeight: 1.4 }} onMouseEnter={e => e.currentTarget.style.background = P.ab} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        {h.q.slice(0, 48)}{h.q.length > 48 ? "..." : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ flex: 1, padding: "20px", minWidth: 0 }}>
              {loading && <div style={{ marginBottom: 20 }}><div style={{ textAlign: "center", padding: "32px 0 24px" }}><div style={{ display: "inline-block", width: 26, height: 26, border: `2px solid ${P.border}`, borderTopColor: P.a, borderRadius: "50%", animation: "spin 0.75s linear infinite", marginBottom: 16 }} /><div style={{ fontFamily: P.mono, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: P.tm, marginBottom: 6 }}>{step}</div></div><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[1,2,3].map(i => <SkeletonCard key={i} />)}</div></div>}
              {error && <div style={{ background: P.rb, border: `1px solid ${P.r}44`, borderLeft: `3px solid ${P.r}`, padding: "14px 18px", color: P.r, fontFamily: P.mono, fontSize: 11, marginBottom: 20, lineHeight: 1.6 }}>✕ {error}</div>}
              {resume && <div style={{ background: P.ab, border: `1px solid ${P.a}33`, borderLeft: `3px solid ${P.a}`, padding: "12px 18px", marginBottom: 16, fontSize: 13, lineHeight: 1.65, color: P.tm }}><span style={{ fontFamily: P.mono, fontSize: 9, color: P.a, letterSpacing: "0.14em", textTransform: "uppercase", marginRight: 10 }}>SYNTHÈSE</span>{resume}</div>}
              {sorted.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", gap: 14, fontFamily: P.mono, fontSize: 10, color: P.tmt, flexWrap: "wrap" }}>
                    <span>{sorted.length} prospects</span><span>·</span>
                    <span style={{ color: P.g }}>{sorted.filter(l => l.meddic?.global === "CHAUD").length} Chaud</span>
                    <span style={{ color: P.o }}>{sorted.filter(l => l.meddic?.global === "TIEDE").length} Tiède</span>
                    <span style={{ color: P.r }}>{sorted.filter(l => l.meddic?.global === "FROID").length} Froid</span>
                    <span>·</span><span style={{ color: P.g }}>{sorted.filter(l => l.priorite === 1).length} cette semaine</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: P.mono, fontSize: 9, color: P.tmt, letterSpacing: "0.1em" }}>TRIER</span>
                    <Sel v={sortBy} on={setSortBy} opts={SORT_OPTIONS} ph="Priorité" sm />
                  </div>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sorted.map((lead, i) => <Card key={i} lead={lead} ckey={`s-${i}`} isPL={false} />)}
              </div>
              {!loading && results.length === 0 && !error && <div style={{ textAlign: "center", padding: "80px 0", color: P.tf }}><div style={{ fontSize: 48, marginBottom: 14, opacity: 0.25 }}>⌖</div><div style={{ fontFamily: P.mono, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: P.tmt }}>Aucune recherche lancée</div><div style={{ fontFamily: P.mono, fontSize: 9, color: P.tf, marginTop: 8 }}>Renseigne tes critères et lance la recherche</div></div>}
            </div>
          </div>
        )}

        {view === "pipeline" && (
          <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 24px" }}>
            {pipeline.length > 0 && (
              <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                {[{label:"Total",value:plStats.total,color:P.t},{label:"Chaud MEDDIC",value:plStats.chaud,color:P.g},{label:"RDV planifiés",value:plStats.rdv,color:P.te},{label:"Qualifiés",value:plStats.qualified,color:P.g}].map(({label,value,color}) => (
                  <div key={label} style={{ background: P.surface, border: `1px solid ${P.border}`, padding: "10px 16px", textAlign: "center", minWidth: 90 }}>
                    <div style={{ fontFamily: P.mono, fontSize: 20, fontWeight: 700, color }}>{value}</div>
                    <div style={{ fontFamily: P.mono, fontSize: 8, color: P.tmt, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => setPFilter("")} style={{ background: !pFilter ? P.ab : P.surface, border: `1px solid ${!pFilter ? P.a : P.border}`, color: !pFilter ? P.a : P.tmt, padding: "5px 12px", fontSize: 10, fontFamily: P.mono, cursor: "pointer" }}>Tous ({pipeline.length})</button>
                {STATUSES.map(s => { const n = pipeline.filter(l => l._status === s.key).length; if (!n) return null; return <button key={s.key} onClick={() => setPFilter(pFilter === s.key ? "" : s.key)} style={{ background: pFilter === s.key ? s.bg : P.surface, border: `1px solid ${pFilter === s.key ? s.color : P.border}`, color: pFilter === s.key ? s.color : P.tmt, padding: "5px 12px", fontSize: 10, fontFamily: P.mono, cursor: "pointer" }}>{s.label} ({n})</button>; })}
              </div>
              {pipeline.length > 0 && <button className="gh" onClick={() => exportCSV(pipeline)} style={{ background: P.surface, border: `1px solid ${P.bdk}`, color: P.tm, padding: "7px 14px", fontFamily: P.mono, fontSize: 9, letterSpacing: "0.1em", cursor: "pointer", textTransform: "uppercase" }}>↓ Export CSV</button>}
            </div>
            {filtPL.length === 0
              ? <div style={{ textAlign: "center", padding: "80px 0", color: P.tf }}><div style={{ fontSize: 48, marginBottom: 14, opacity: 0.25 }}>📋</div><div style={{ fontFamily: P.mono, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: P.tmt }}>Pipeline vide</div><div style={{ fontFamily: P.mono, fontSize: 9, color: P.tf, marginTop: 8 }}>Sauvegarde des prospects depuis Recherche</div></div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{filtPL.map((lead, i) => <Card key={lead._id || i} lead={lead} ckey={`p-${lead._id || i}`} isPL={true} />)}</div>}
          </div>
        )}
      </div>
      <Toast toasts={toasts} />
    </>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
