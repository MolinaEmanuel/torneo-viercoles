import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ── FIREBASE ─────────────────────────────────────── */
const firebaseConfig = {
  apiKey:      "AIzaSyAY-F10jVa_KTRtIjm4GNupFQ_UR1TsJVw",
  authDomain:  "torneo-viercoles.firebaseapp.com",
  projectId:   "torneo-viercoles",
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

/* ── CONSTANTES ───────────────────────────────────── */
const EQUIPO_A = "Equipo SEBA";
const EQUIPO_B = "Equipo HEBER";
const PASS     = "cogi2";
const DB_DOC   = doc(db, "torneo", "datos");

const MESES       = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                     "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_SEMANA = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const EQUIPOS_OPCIONES = ["", EQUIPO_A, EQUIPO_B];

/* ── ESCUDOS ──────────────────────────────────────── */
const ESCUDOS = {
  "River Plate":   "assets/images/escudos/river.png",
  "Boca Juniors":  "assets/images/escudos/boca.png",
  "Independiente": "assets/images/escudos/independiente.png",
  "Racing":        "assets/images/escudos/racing.png",
  "San Lorenzo":   "assets/images/escudos/sanlorenzo.png",
  "Huracán":       "assets/images/escudos/huracan.png",
};

const CLUB_COLORS = {
  "Independiente": "#CC0000",
  "Racing":        "#6BBFFF",
  "San Lorenzo":   "#CC0000",
  "Huracán":       "#e0e0e0",
};

/* ── DOM ──────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const modalLogin     = $("modalLogin");
const passwordInput  = $("passwordInput");
const tablaEl        = $("tabla");
const partidosEl     = $("partidos");
const fechaActualEl  = $("fechaActual");
const jugadorTextoEl = $("jugadorTexto");
const adminJugadorEl = $("adminJugador");
const historialEl    = $("historialContenido");
const rankingEl      = $("rankingContenido");
const cumpleEl       = $("cumpleContenido");
const palmaresEl     = $("palmaresContenido");
const loaderEl       = $("loader");
const listaA         = $("listaA");
const listaB         = $("listaB");

/* ── ESTADO ───────────────────────────────────────── */
window.admin  = localStorage.getItem("admin") === "true";
let datos     = [];
let jugadores = [];
let planteles = { A: [], B: [] };
let videos    = {};
let palmares  = {};
let cumpleMesActual = new Date().getMonth();

/* ── HELPERS ──────────────────────────────────────── */
function generarFechas() {
  const fechas = [];
  let d = new Date(2026, 3, 1);
  while (fechas.length < 18) {
    if (d.getDay() === 3) {
      fechas.push({ fecha: d.toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit"}), golesA: null, golesB: null });
    }
    d.setDate(d.getDate() + 1);
  }
  return fechas;
}

function normalizarJugador(j) {
  if (typeof j === "string") return { nombre: j, apodo: "", altura: "-", nacimiento: "-", foto: "", dorsal: "", escudo: "" };
  return {
    nombre:     j?.nombre     || "-",
    apodo:      j?.apodo      || "",
    altura:     j?.altura     || "-",
    nacimiento: j?.nacimiento || "-",
    foto:       j?.foto       || "",
    dorsal:     j?.dorsal     || "",
    escudo:     j?.escudo     || "",
  };
}

function avatarUrl(foto) {
  return foto || "https://ui-avatars.com/api/?background=1e293b&color=ef4444&bold=true&size=128&name=FV";
}

function updateAdminUI() {
  const isAdmin = window.admin === true;
  $("btnAdminLogin").style.display  = isAdmin ? "none"         : "inline-block";
  $("btnAdminLogout").style.display = isAdmin ? "inline-block" : "none";
}

function clubDotHTML(escudo) {
  if (!escudo) return "";
  if (escudo === "River Plate")  return `<span class="jugador-club-dot dot-river" title="River Plate"></span>`;
  if (escudo === "Boca Juniors") return `<span class="jugador-club-dot dot-boca"  title="Boca Juniors"></span>`;
  const color = CLUB_COLORS[escudo] || "rgba(255,255,255,0.3)";
  return `<span class="jugador-club-dot" style="background:${color}" title="${escudo}"></span>`;
}

function parsearNacimiento(str) {
  if (!str || str === "-") return null;
  const p = str.split("/");
  if (p.length < 2) return null;
  const dia = parseInt(p[0]), mes = parseInt(p[1]) - 1;
  if (isNaN(dia) || isNaN(mes)) return null;
  return { dia, mes };
}

function youtubeEmbedUrl(url) {
  if (!url) return "";
  const m = url.match(/(?:youtu\.be\/|watch\?v=|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}

function buscarJugadorPorNombre(texto) {
  const t = texto.trim().toLowerCase();
  for (const eq of ["A","B"]) {
    const idx = (planteles[eq] || []).findIndex(j => j.apodo?.trim().toLowerCase() === t);
    if (idx !== -1) return { equipo: eq, index: idx };
  }
  for (const eq of ["A","B"]) {
    const idx = (planteles[eq] || []).findIndex(j => j.nombre.trim().toLowerCase() === t);
    if (idx !== -1) return { equipo: eq, index: idx };
  }
  return null;
}

/* ── CLICK EN LOGO FV → INICIO ────────────────────── */
document.querySelector(".logo-principal")?.addEventListener("click", () => {
  mostrarSeccion("inicio");
});

/* ── LOGO CONMEBOL: activar hover después de la animación de entrada ── */
const logoConmebol = document.querySelector(".logo-secundario");
if (logoConmebol) {
  logoConmebol.addEventListener("animationend", () => {
    logoConmebol.classList.add("listo");
  }, { once: true });
}

/* ── SVG TROFEOS ──────────────────────────────────── */

// Apertura → AZUL (era rojo, ahora azul/índigo)
function svgCopaApertura() {
  return `<svg width="100" height="120" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="32" y="108" width="36" height="7" rx="3" fill="url(#baseA)"/>
    <rect x="27" y="104" width="46" height="6" rx="2" fill="url(#baseA)"/>
    <rect x="44" y="82" width="12" height="24" rx="3" fill="url(#talloA)"/>
    <path d="M22 18 C22 14 26 10 50 10 C74 10 78 14 78 18 L70 72 C68 78 60 82 50 82 C40 82 32 78 30 72 Z" fill="url(#copaA)"/>
    <path d="M32 20 C32 17 36 14 50 14 C64 14 68 17 68 20 L62 66 C60 71 56 74 50 74 C44 74 40 71 38 66 Z" fill="url(#brilloA)" opacity="0.3"/>
    <path d="M22 26 C10 28 6 40 10 52 C12 58 18 62 24 60" stroke="url(#asaA)" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M78 26 C90 28 94 40 90 52 C88 58 82 62 76 60" stroke="url(#asaA)" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M36 36 Q50 32 64 36" stroke="rgba(255,255,255,0.22)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M34 48 Q50 44 66 48" stroke="rgba(255,255,255,0.15)" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <defs>
      <linearGradient id="copaA" x1="22" y1="10" x2="78" y2="82" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="#818cf8"/>
        <stop offset="50%"  stop-color="#6366f1"/>
        <stop offset="100%" stop-color="#4338ca"/>
      </linearGradient>
      <linearGradient id="brilloA" x1="32" y1="14" x2="68" y2="74" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="white" stop-opacity="1"/>
        <stop offset="100%" stop-color="white" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="talloA" x1="44" y1="82" x2="56" y2="106" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="#4338ca"/>
        <stop offset="100%" stop-color="#312e81"/>
      </linearGradient>
      <linearGradient id="baseA" x1="27" y1="104" x2="73" y2="115" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="#3730a3"/>
        <stop offset="100%" stop-color="#1e1b4b"/>
      </linearGradient>
      <linearGradient id="asaA" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
        <stop offset="0%"   stop-color="#a5b4fc"/>
        <stop offset="100%" stop-color="#4338ca"/>
      </linearGradient>
    </defs>
  </svg>`;
}

// Clausura → ROJO (era azul, ahora rojo)
function svgCopaClausura() {
  return `<svg width="100" height="120" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="32" y="108" width="36" height="7" rx="3" fill="url(#baseC)"/>
    <rect x="27" y="104" width="46" height="6" rx="2" fill="url(#baseC)"/>
    <rect x="44" y="82" width="12" height="24" rx="3" fill="url(#talloC)"/>
    <path d="M22 18 C22 14 26 10 50 10 C74 10 78 14 78 18 L70 72 C68 78 60 82 50 82 C40 82 32 78 30 72 Z" fill="url(#copaC)"/>
    <path d="M32 20 C32 17 36 14 50 14 C64 14 68 17 68 20 L62 66 C60 71 56 74 50 74 C44 74 40 71 38 66 Z" fill="url(#brilloC)" opacity="0.35"/>
    <path d="M22 26 C10 28 6 40 10 52 C12 58 18 62 24 60" stroke="url(#asaC)" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M78 26 C90 28 94 40 90 52 C88 58 82 62 76 60" stroke="url(#asaC)" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M36 36 Q50 32 64 36" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M34 48 Q50 44 66 48" stroke="rgba(255,255,255,0.18)" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <defs>
      <linearGradient id="copaC" x1="22" y1="10" x2="78" y2="82" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="#ef4444"/>
        <stop offset="50%"  stop-color="#dc2626"/>
        <stop offset="100%" stop-color="#991b1b"/>
      </linearGradient>
      <linearGradient id="brilloC" x1="32" y1="14" x2="68" y2="74" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="white" stop-opacity="1"/>
        <stop offset="100%" stop-color="white" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="talloC" x1="44" y1="82" x2="56" y2="106" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="#b91c1c"/>
        <stop offset="100%" stop-color="#7f1d1d"/>
      </linearGradient>
      <linearGradient id="baseC" x1="27" y1="104" x2="73" y2="115" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="#9f1239"/>
        <stop offset="100%" stop-color="#6b1a1a"/>
      </linearGradient>
      <linearGradient id="asaC" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
        <stop offset="0%"   stop-color="#f87171"/>
        <stop offset="100%" stop-color="#991b1b"/>
      </linearGradient>
    </defs>
  </svg>`;
}

function svgSupercopa() {
  return `<svg width="120" height="148" viewBox="0 0 120 148" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="36" y="136" width="48" height="8" rx="3.5" fill="url(#baseS2)"/>
    <rect x="30" y="128" width="60" height="10" rx="3" fill="url(#baseS1)"/>
    <rect x="52" y="98" width="16" height="32" rx="4" fill="url(#talloS)"/>
    <path d="M18 20 C18 14 24 8 60 8 C96 8 102 14 102 20 L92 86 C89 95 74 100 60 100 C46 100 31 95 28 86 Z" fill="url(#copaS)"/>
    <path d="M30 22 C30 17 36 12 60 12 C84 12 90 17 90 22 L82 80 C80 88 72 92 60 92 C48 92 40 88 38 80 Z" fill="url(#brilloS)" opacity="0.28"/>
    <path d="M18 30 C2 33 -2 52 4 68 C7 76 16 82 24 79" stroke="url(#asaS)" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M102 30 C118 33 122 52 116 68 C113 76 104 82 96 79" stroke="url(#asaS)" stroke-width="7" stroke-linecap="round" fill="none"/>
    <circle cx="21" cy="30" r="5" fill="url(#nudoS)"/>
    <circle cx="99" cy="30" r="5" fill="url(#nudoS)"/>
    <path d="M40 42 Q60 36 80 42" stroke="rgba(255,255,255,0.28)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M38 58 Q60 52 82 58" stroke="rgba(255,255,255,0.2)"  stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M38 74 Q60 68 82 74" stroke="rgba(255,255,255,0.13)" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <path d="M60 30 L62.4 37.3 L70 37.3 L64 41.8 L66.4 49.1 L60 44.6 L53.6 49.1 L56 41.8 L50 37.3 L57.6 37.3 Z" fill="url(#estrellaS)" filter="url(#glow)"/>
    <defs>
      <linearGradient id="copaS" x1="18" y1="8" x2="102" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="#fde68a"/>
        <stop offset="35%"  stop-color="#facc15"/>
        <stop offset="65%"  stop-color="#d97706"/>
        <stop offset="100%" stop-color="#92400e"/>
      </linearGradient>
      <linearGradient id="brilloS" x1="30" y1="12" x2="90" y2="92" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="white" stop-opacity="1"/>
        <stop offset="100%" stop-color="white" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="talloS" x1="52" y1="98" x2="68" y2="130" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="#b45309"/>
        <stop offset="100%" stop-color="#78350f"/>
      </linearGradient>
      <linearGradient id="baseS1" x1="30" y1="128" x2="90" y2="138" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="#d97706"/>
        <stop offset="100%" stop-color="#78350f"/>
      </linearGradient>
      <linearGradient id="baseS2" x1="36" y1="136" x2="84" y2="144" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="#b45309"/>
        <stop offset="100%" stop-color="#451a03"/>
      </linearGradient>
      <linearGradient id="asaS" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
        <stop offset="0%"   stop-color="#fde68a"/>
        <stop offset="100%" stop-color="#b45309"/>
      </linearGradient>
      <linearGradient id="nudoS" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
        <stop offset="0%"   stop-color="#fef3c7"/>
        <stop offset="100%" stop-color="#f59e0b"/>
      </linearGradient>
      <linearGradient id="estrellaS" x1="50" y1="30" x2="70" y2="50" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#fde68a"/>
      </linearGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
  </svg>`;
}

/* ── FIFA CARD STYLES ─────────────────────────────── */
(function inyectarEstilosFIFA() {
  if ($("fv-fifa-styles")) return;
  const style = document.createElement("style");
  style.id = "fv-fifa-styles";
  style.textContent = `
    .modal-fifa { position:fixed; inset:0; display:none; z-index:999999; }
    .modal-fifa.activo { display:block; }
    .modal-fifa .overlay { position:absolute; inset:0; background:rgba(2,6,23,0.88); backdrop-filter:blur(8px); opacity:0; transition:opacity 0.3s ease; }
    .modal-fifa.activo .overlay { opacity:1; }
    .fifa-card-wrap { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:2; }
    .flip-scene { perspective:1000px; width:240px; }
    .flip-inner { position:relative; width:100%; -webkit-transform-style:preserve-3d; transform-style:preserve-3d; will-change:transform; -webkit-animation:cartaFlip 1.1s cubic-bezier(0.4,0,0.2,1) 0.08s both; animation:cartaFlip 1.1s cubic-bezier(0.4,0,0.2,1) 0.08s both; }
    @-webkit-keyframes cartaFlip { 0%{-webkit-transform:rotateY(-180deg) scale(0.85);opacity:0.5} 60%{-webkit-transform:rotateY(8deg) scale(1.02);opacity:1} 80%{-webkit-transform:rotateY(-4deg) scale(0.99)} 100%{-webkit-transform:rotateY(0deg) scale(1)} }
    @keyframes cartaFlip { 0%{transform:rotateY(-180deg) scale(0.85);opacity:0.5} 60%{transform:rotateY(8deg) scale(1.02);opacity:1} 80%{transform:rotateY(-4deg) scale(0.99)} 100%{transform:rotateY(0deg) scale(1)} }
    .flip-dorso { position:absolute; inset:0; -webkit-backface-visibility:hidden; backface-visibility:hidden; -webkit-transform:rotateY(180deg); transform:rotateY(180deg); background:linear-gradient(145deg,#0f172a,#1e293b); border-radius:20px; border:1.5px solid rgba(239,68,68,0.45); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; pointer-events:none; }
    .flip-dorso-lines { position:absolute; inset:0; border-radius:20px; background:repeating-linear-gradient(45deg,rgba(239,68,68,0.04) 0px,rgba(239,68,68,0.04) 1px,transparent 1px,transparent 18px); }
    .flip-dorso-logo { font-size:42px; opacity:0.18; position:relative; z-index:1; }
    .flip-dorso-texto { font-size:9px; font-weight:800; letter-spacing:3px; text-transform:uppercase; color:rgba(239,68,68,0.45); position:relative; z-index:1; }
    .flip-dorso-linea { width:40px; height:1px; background:rgba(239,68,68,0.25); position:relative; z-index:1; }
    .fifa-card { -webkit-backface-visibility:hidden; backface-visibility:hidden; width:240px; border-radius:20px; overflow:hidden; border:1.5px solid rgba(239,68,68,0.45); background:#0f172a; box-shadow:0 0 0 1px rgba(239,68,68,0.08),0 30px 70px rgba(0,0,0,0.75),inset 0 1px 0 rgba(255,255,255,0.05); font-family:'Segoe UI',Arial,sans-serif; }
    .fcard-top { position:relative; height:255px; background:linear-gradient(160deg,#0a0f1e 0%,#1a2540 50%,#0a0f1e 100%); }
    .flip-inner.animacion-completa .fcard-top { overflow:hidden; }
    .fcard-lines { position:absolute; inset:0; background:repeating-linear-gradient(112deg,rgba(239,68,68,0.04) 0px,rgba(239,68,68,0.04) 1px,transparent 1px,transparent 52px),repeating-linear-gradient(22deg,rgba(255,255,255,0.015) 0px,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 68px); }
    .fcard-accent-bar { position:absolute; bottom:0; left:0; right:0; height:3px; background:linear-gradient(90deg,transparent 0%,rgba(239,68,68,0.4) 15%,#ef4444 50%,rgba(239,68,68,0.4) 85%,transparent 100%); }
    .fcard-accent-bar.capitan { background:linear-gradient(90deg,transparent 0%,rgba(245,158,11,0.4) 15%,#f59e0b 50%,rgba(245,158,11,0.4) 85%,transparent 100%); }
    .fcard-dorsal { position:absolute; top:12px; left:14px; font-size:38px; font-weight:900; color:#ef4444; font-family:'Arial Black',Arial,sans-serif; line-height:1; letter-spacing:-2px; text-shadow:0 2px 16px rgba(239,68,68,0.35); }
    .fcard-capitan-badge { position:absolute; bottom:12px; left:12px; display:flex; align-items:center; gap:4px; background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.5); border-radius:6px; padding:3px 7px; font-size:9px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; color:#f59e0b; }
    .fcard-escudo-box { position:absolute; top:12px; right:12px; width:52px; height:52px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.1); overflow:hidden; }
    .fcard-escudo-box img { width:42px; height:42px; object-fit:contain; }
    .fcard-escudo-fallback { font-size:8px; font-weight:800; color:rgba(255,255,255,0.6); text-align:center; letter-spacing:0.5px; padding:2px; }
    .fcard-photo-wrap { position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:165px; height:210px; display:flex; align-items:flex-end; justify-content:center; }
    .fcard-photo-wrap img { width:100%; height:100%; object-fit:cover; object-position:top center; filter:grayscale(15%) contrast(1.05); }
    .fcard-silhouette { width:100px; height:165px; opacity:0.15; }
    .fcard-bottom { background:linear-gradient(to bottom,#0f172a,#020617); padding:14px 16px 18px; border-top:1px solid rgba(239,68,68,0.2); }
    .fcard-nombre-box { text-align:center; padding-bottom:12px; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.06); }
    .fcard-apodo { font-size:20px; font-weight:900; color:#f1f5f9; text-transform:uppercase; letter-spacing:0.5px; line-height:1.15; font-family:'Segoe UI',Arial,sans-serif; }
    .fcard-nombre-completo { font-size:11px; color:rgba(241,245,249,0.55); font-weight:500; margin-top:4px; letter-spacing:0.3px; }
    .fcard-capitan-label { font-size:9px; font-weight:800; letter-spacing:2px; text-transform:uppercase; color:#f59e0b; margin-top:5px; }
    .fcard-sub { font-size:10px; color:rgba(239,68,68,0.7); font-weight:700; letter-spacing:2px; text-transform:uppercase; margin-top:3px; }
    .fcard-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .fcard-stat { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:8px; padding:8px 10px; text-align:center; }
    .fcard-stat-label { font-size:8px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#ef4444; margin-bottom:4px; }
    .fcard-stat-val { font-size:13px; font-weight:700; color:#f1f5f9; }
    .fcard-footer { text-align:center; margin-top:12px; font-size:8px; letter-spacing:2px; text-transform:uppercase; color:rgba(239,68,68,0.3); font-weight:700; }
    .fcard-close { position:absolute; top:-13px; right:-13px; width:30px; height:30px; border-radius:50%; background:#ef4444; border:2px solid #020617; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:900; color:white; line-height:1; transition:background 0.15s,transform 0.15s; z-index:3; }
    .fcard-close:hover { background:#ff6b6b; transform:scale(1.12); }
    .fcard-admin { margin-top:14px; border-top:1px solid rgba(255,255,255,0.07); padding-top:12px; display:flex; flex-direction:column; gap:8px; }
    .fcard-admin input { width:100%; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#f1f5f9; padding:7px 10px; font-size:0.85rem; outline:none; transition:border-color 0.2s; font-family:inherit; }
    .fcard-admin input:focus { border-color:#ef4444; }
    .fcard-admin .admin-btns { display:flex; gap:8px; }
    .fcard-admin .admin-btns button { flex:1; font-size:0.78rem; padding:8px 6px; }
    #jugadorTexto { cursor:pointer; transition:color 0.2s ease; }
    #jugadorTexto:hover { color:#ef4444; }
    @media (max-width:480px) { .fifa-card-wrap { max-height:90vh; overflow-y:auto; border-radius:20px; } }
  `;
  document.head.appendChild(style);
})();

/* ── SILUETA ──────────────────────────────────────── */
function siluetaSVG() {
  return `<svg class="fcard-silhouette" viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="32" rx="23" ry="26" fill="white"/>
    <path d="M8 160 Q14 102 50 92 Q86 102 92 160Z" fill="white"/>
  </svg>`;
}

/* ── MODAL FIFA ───────────────────────────────────── */
window.abrirJugador = (j, index, equipo, esCapitan = false) => {
  document.querySelector(".modal-fifa")?.remove();
  const isAdmin      = window.admin === true;
  const escudoPath   = ESCUDOS[j.escudo] || "";
  const fotoPath     = j.foto || "";
  const apodoMostrar = j.apodo || j.nombre;

  const adminHTML = isAdmin ? `
    <div class="fcard-admin">
      <input id="editNombre"     value="${j.nombre}"     placeholder="Nombre completo">
      <input id="editApodo"      value="${j.apodo}"      placeholder="Apodo / Nickname">
      <input id="editAltura"     value="${j.altura}"     placeholder="Altura (ej: 1.75)">
      <input id="editNacimiento" value="${j.nacimiento}" placeholder="Nacimiento (dd/mm/aaaa)">
      <input id="editDorsal"     value="${j.dorsal}"     placeholder="Dorsal (ej: 10)">
      <input id="editEscudo"     value="${j.escudo}"     placeholder="Club (ej: River Plate)">
      <input id="editFoto"       value="${j.foto}"       placeholder="Ruta foto (assets/images/jugadores/...)">
      <div class="admin-btns">
        <button onclick="guardarEdicionJugador('${equipo}',${index})">Guardar</button>
        <button onclick="eliminarJugador('${equipo}',${index})" style="background:var(--accent-dark)">Eliminar</button>
      </div>
    </div>` : "";

  const modal = document.createElement("div");
  modal.className = "modal-fifa";
  modal.innerHTML = `
    <div class="overlay"></div>
    <div class="fifa-card-wrap flip-scene" onclick="event.stopPropagation()">
      <div class="flip-inner">
        <div class="flip-dorso">
          <div class="flip-dorso-lines"></div>
          <div class="flip-dorso-logo">⚽</div>
          <div class="flip-dorso-linea"></div>
          <div class="flip-dorso-texto">Fútbol Viércoles</div>
        </div>
        <div class="fifa-card">
          <button class="fcard-close" onclick="document.querySelector('.modal-fifa')?.remove()" aria-label="Cerrar">&#x2715;</button>
          <div class="fcard-top">
            <div class="fcard-lines"></div>
            <div class="fcard-dorsal">${j.dorsal || ""}</div>
            <div class="fcard-escudo-box" id="fcEscudo"></div>
            <div class="fcard-photo-wrap" id="fcFoto"></div>
            ${esCapitan ? `<div class="fcard-capitan-badge">Capitán</div>` : ""}
            <div class="fcard-accent-bar ${esCapitan ? "capitan" : ""}"></div>
          </div>
          <div class="fcard-bottom">
            <div class="fcard-nombre-box">
              <div class="fcard-apodo">${apodoMostrar}</div>
              <div class="fcard-nombre-completo">${j.nombre}</div>
              ${esCapitan ? `<div class="fcard-capitan-label">Capitán</div>` : ""}
              <div class="fcard-sub">${j.escudo || "Fútbol Viércoles"}</div>
            </div>
            <div class="fcard-stats">
              <div class="fcard-stat"><div class="fcard-stat-label">Altura</div><div class="fcard-stat-val">${j.altura !== "-" ? j.altura : "—"}</div></div>
              <div class="fcard-stat"><div class="fcard-stat-label">Nacimiento</div><div class="fcard-stat-val">${j.nacimiento !== "-" ? j.nacimiento : "—"}</div></div>
            </div>
            ${adminHTML}
            <div class="fcard-footer">Torneo Apertura 2026</div>
          </div>
        </div>
      </div>
    </div>`;

  modal.addEventListener("click", e => {
    if (e.target === modal || e.target.classList.contains("overlay")) modal.remove();
  });
  const onKey = e => { if (e.key === "Escape") { modal.remove(); document.removeEventListener("keydown", onKey); } };
  document.addEventListener("keydown", onKey);
  document.body.appendChild(modal);
  modal.querySelector(".flip-inner").addEventListener("animationend", () => {
    modal.querySelector(".flip-inner").classList.add("animacion-completa");
  }, { once: true });
  requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add("activo")));

  const escudoBox = modal.querySelector("#fcEscudo");
  if (escudoPath) {
    const img = document.createElement("img");
    img.alt = j.escudo || "";
    img.onerror = () => { escudoBox.innerHTML = `<span class="fcard-escudo-fallback">${(j.escudo||"").slice(0,3).toUpperCase()}</span>`; };
    img.src = escudoPath;
    escudoBox.appendChild(img);
  } else if (j.escudo) {
    escudoBox.innerHTML = `<span class="fcard-escudo-fallback">${j.escudo.slice(0,3).toUpperCase()}</span>`;
  }

  const fotoWrap = modal.querySelector("#fcFoto");
  if (fotoPath) {
    const fotoImg = document.createElement("img");
    fotoImg.alt = j.nombre;
    fotoImg.onerror = () => { fotoWrap.innerHTML = siluetaSVG(); };
    fotoImg.src = fotoPath;
    fotoWrap.appendChild(fotoImg);
  } else {
    fotoWrap.innerHTML = siluetaSVG();
  }
};

window.abrirJugadorIndex = (equipo, index) => {
  abrirJugador(planteles[equipo][index], index, equipo, index === 0);
};

document.addEventListener("click", e => {
  const card = e.target.closest(".jugador-card");
  if (card) abrirJugadorIndex(card.dataset.equipo, parseInt(card.dataset.index));
});

/* ── FIREBASE ─────────────────────────────────────── */
function cargarDatos() {
  onSnapshot(DB_DOC, snap => {
    if (snap.exists()) {
      const data = snap.data();
      datos     = data.partidos  || generarFechas();
      jugadores = data.jugadores || new Array(datos.length).fill("");
      videos    = data.videos    || {};
      planteles = data.planteles || { A: [], B: [] };
      palmares  = data.palmares  || { "2025": { apertura: "Equipo SEBA", clausura: "Equipo HEBER", supercopa: "Equipo HEBER" } };
      ["A","B"].forEach(eq => { planteles[eq] = (planteles[eq] || []).map(normalizarJugador); });
    } else {
      datos     = generarFechas();
      jugadores = new Array(18).fill("");
      videos    = {};
      planteles = { A: [], B: [] };
      palmares  = { "2025": { apertura: "Equipo SEBA", clausura: "Equipo HEBER", supercopa: "Equipo HEBER" } };
      guardar();
    }
    renderAll();
    setTimeout(() => loaderEl.classList.add("hidden"), 300);
  });
}

function guardar() {
  setDoc(DB_DOC, { partidos: datos, jugadores, planteles, videos, palmares });
}

/* ── AUTH ─────────────────────────────────────────── */
window.abrirLogin = () => { modalLogin.style.display = "flex"; passwordInput.value = ""; setTimeout(() => passwordInput.focus(), 50); };
window.verificarLogin = () => {
  if (passwordInput.value === PASS) {
    window.admin = true; localStorage.setItem("admin","true");
    modalLogin.style.display = "none";
    renderAll(); updateAdminUI();
    document.querySelector(".modal-fifa")?.remove();
  } else {
    passwordInput.value = ""; passwordInput.placeholder = "Contraseña incorrecta"; passwordInput.focus();
    setTimeout(() => passwordInput.placeholder = "Contraseña", 1500);
  }
};
window.logout = () => { window.admin = false; localStorage.removeItem("admin"); renderAll(); updateAdminUI(); };
passwordInput.addEventListener("keydown", e => { if (e.key === "Enter") window.verificarLogin(); });
modalLogin.addEventListener("click", e => { if (e.target === modalLogin) modalLogin.style.display = "none"; });

/* ── NAVEGACIÓN ───────────────────────────────────── */
function mostrarSeccion(id) {
  document.querySelectorAll(".nav-btn[data-section]").forEach(btn => btn.classList.toggle("active-nav", btn.dataset.section === id));
  document.querySelectorAll(".seccion").forEach(sec => {
    if (sec.classList.contains("activa")) {
      sec.classList.remove("activa"); sec.classList.add("saliendo");
      setTimeout(() => { sec.classList.remove("saliendo"); sec.style.display = "none"; }, 400);
    } else { sec.style.display = "none"; }
  });
  const nueva = $(id);
  setTimeout(() => { nueva.style.display = "block"; setTimeout(() => nueva.classList.add("activa"), 50); }, 400);
}
window.mostrarSeccion = mostrarSeccion;

/* ── RESULTADOS ───────────────────────────────────── */
window.guardarResultado = (i) => {
  const a = parseInt($("a"+i).value), b = parseInt($("b"+i).value);
  if (isNaN(a)||isNaN(b)) return alert("Ingresá los goles de ambos equipos");
  datos[i].golesA = a; datos[i].golesB = b; guardar();
};
window.guardarVideo = (i) => {
  const url = $("vid"+i)?.value.trim(); if (!url) return;
  videos[String(i)] = url; guardar();
};

/* ── MVP ──────────────────────────────────────────── */
window.guardarJugador = () => {
  const nombre = $("inputJugador").value.trim(); if (!nombre) return;
  const index = datos.findLastIndex(p => p.golesA != null); if (index === -1) return;
  jugadores[index] = nombre; $("inputJugador").value = ""; guardar();
};
window.editarMVP = (index, nombre) => { jugadores[index] = nombre; guardar(); };

/* ── PLANTEL ──────────────────────────────────────── */
window.agregarJugador = (equipo) => {
  const nombre = prompt("Nombre completo"); if (!nombre) return;
  const apodo      = prompt("Apodo / Nickname (dejar vacío si no tiene)") || "";
  const dorsal     = prompt("Dorsal (número de camiseta)") || "";
  const altura     = prompt("Altura (ej: 1.75)") || "-";
  const nacimiento = prompt("Fecha de nacimiento (dd/mm/aaaa)") || "-";
  const escudo     = prompt("Club (ej: River Plate, Boca Juniors, Independiente...)") || "";
  if (!planteles[equipo]) planteles[equipo] = [];
  planteles[equipo].push({ nombre, apodo, dorsal, altura, nacimiento, escudo, foto: "" });
  guardar(); renderPlanteles();
};
window.eliminarJugador = (equipo, index) => {
  if (!confirm(`¿Eliminar a ${planteles[equipo][index]?.nombre}?`)) return;
  planteles[equipo].splice(index,1); guardar(); renderPlanteles();
  document.querySelector(".modal-fifa")?.remove();
};
window.guardarEdicionJugador = (equipo, index) => {
  planteles[equipo][index] = {
    nombre: $("editNombre").value.trim(), apodo: $("editApodo").value.trim(),
    altura: $("editAltura").value.trim(), nacimiento: $("editNacimiento").value.trim(),
    dorsal: $("editDorsal").value.trim(), escudo: $("editEscudo").value.trim(),
    foto:   $("editFoto").value.trim(),
  };
  guardar(); renderPlanteles(); document.querySelector(".modal-fifa")?.remove();
};
window.setFotoEquipo = (equipo) => {
  const url = prompt("URL o ruta de la foto del equipo"); if (!url) return;
  const img = $("imgEquipo"+equipo); img.src = url; img.style.display = "block";
};
window.moverJugador = (equipo, index, dir) => {
  const arr = planteles[equipo], dest = index + dir;
  if (dest < 0 || dest >= arr.length) return;
  [arr[index], arr[dest]] = [arr[dest], arr[index]];
  guardar(); renderPlanteles();
};
function toggleEquipo(eq) {
  const lista = $("lista"+eq), titulo = $("title"+eq);
  const abierto = lista.classList.contains("abierto");
  lista.classList.toggle("abierto", !abierto);
  titulo.classList.toggle("abierto", !abierto);
  titulo.setAttribute("aria-expanded", String(!abierto));
}
window.toggleEquipo = toggleEquipo;

/* ── PALMARÉS ─────────────────────────────────────── */
window.guardarTrofeo = (anio, tipo) => {
  const sel = $(`sel-${anio}-${tipo}`); if (!sel) return;
  if (!palmares[anio]) palmares[anio] = {};
  palmares[anio][tipo] = sel.value;
  guardar(); renderPalmares();
};
window.agregarAnio = () => {
  const anio = prompt("Ingresá el año (ej: 2024)");
  if (!anio || isNaN(anio)) return;
  if (palmares[anio]) return alert("Ese año ya existe.");
  palmares[anio] = { apertura: "", clausura: "", supercopa: "" };
  guardar(); renderPalmares();
};

/* ── RENDER ALL ───────────────────────────────────── */
function renderAll() {
  renderPartidos(); renderTabla(); renderInfo();
  renderHistorial(); renderRanking(); renderPlanteles();
  renderCumples(); renderPalmares(); updateAdminUI();
}

/* ── PARTIDOS ─────────────────────────────────────── */
function renderPartidos() {
  let html = `<thead><tr><th>#</th><th>Día</th><th>Resultado</th><th>Video</th>${window.admin?"<th>Cargar</th>":""}</tr></thead><tbody>`;
  datos.forEach((p,i) => {
    let res = `<span style="color:var(--text-muted)">Sin jugar</span>`;
    if (p.golesA!=null) {
      if      (p.golesA>p.golesB) res=`${EQUIPO_A} ${p.golesA}–${p.golesB}`;
      else if (p.golesB>p.golesA) res=`${EQUIPO_B} ${p.golesB}–${p.golesA}`;
      else                        res=`Empate ${p.golesA}–${p.golesB}`;
    }
    const videoUrl  = videos[String(i)] || "";
    const embedUrl  = youtubeEmbedUrl(videoUrl);
    const videoCell = videoUrl
      ? `<a class="video-link" href="${embedUrl}" target="_blank">▶ Ver</a>`
      : `<span style="color:var(--text-muted);font-size:0.8rem">—</span>`;
    const adminCell = window.admin ? `<td>
      <div class="video-input-wrap">
        <input id="a${i}" type="number" min="0" max="99" placeholder="${p.golesA??""}">&nbsp;vs&nbsp;
        <input id="b${i}" type="number" min="0" max="99" placeholder="${p.golesB??""}">
        <button onclick="guardarResultado(${i})">OK</button>
      </div>
      <div class="video-input-wrap" style="margin-top:6px">
        <input id="vid${i}" type="text" placeholder="URL YouTube" value="${videoUrl}">
        <button onclick="guardarVideo(${i})">Video</button>
      </div></td>` : "";
    html += `<tr><td><strong>F${i+1}</strong></td><td>${p.fecha}</td><td>${res}</td><td>${videoCell}</td>${adminCell}</tr>`;
  });
  html += "</tbody>";
  partidosEl.innerHTML = html;
}

/* ── TABLA ────────────────────────────────────────── */
function renderTabla() {
  const equipos = [
    {nombre:EQUIPO_A,pts:0,pj:0,pg:0,pe:0,pp:0,gf:0,gc:0},
    {nombre:EQUIPO_B,pts:0,pj:0,pg:0,pe:0,pp:0,gf:0,gc:0},
  ];
  datos.forEach(p => {
    if (p.golesA==null) return;
    equipos[0].pj++; equipos[1].pj++;
    equipos[0].gf+=p.golesA; equipos[0].gc+=p.golesB;
    equipos[1].gf+=p.golesB; equipos[1].gc+=p.golesA;
    if      (p.golesA>p.golesB){equipos[0].pts+=3;equipos[0].pg++;equipos[1].pp++;}
    else if (p.golesB>p.golesA){equipos[1].pts+=3;equipos[1].pg++;equipos[0].pp++;}
    else{equipos[0].pts++;equipos[1].pts++;equipos[0].pe++;equipos[1].pe++;}
  });
  equipos.forEach(e=>e.gd=e.gf-e.gc);
  equipos.sort((a,b)=>b.pts!==a.pts?b.pts-a.pts:b.gd-a.gd);
  tablaEl.innerHTML = equipos.map((eq,i)=>`
    <div class="fila ${i===0?"lider":""}">
      <div class="fila-tabla">
        <span class="fila-pos">${i===0?"1°":"2°"}</span>
        <span class="fila-nombre">${eq.nombre}</span>
        <span class="fila-pts">${eq.pts} pts</span>
        <span class="fila-gd">${eq.gd>=0?"+":""}${eq.gd} GD</span>
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;padding-left:34px">
        PJ ${eq.pj} &nbsp;|&nbsp; G ${eq.pg} &nbsp;E ${eq.pe} &nbsp;P ${eq.pp} &nbsp;|&nbsp; ${eq.gf}:${eq.gc}
      </div>
    </div>`).join("");
}

/* ── INFO ─────────────────────────────────────────── */
function renderInfo() {
  const index = datos.findLastIndex(p=>p.golesA!=null);
  fechaActualEl.textContent = index>=0?"Fecha "+(index+1):"-";
  const nombreMVP = jugadores[index]||"-";
  let displayMVP  = nombreMVP;
  if (nombreMVP!=="-") {
    const enc = buscarJugadorPorNombre(nombreMVP);
    if (enc) displayMVP = planteles[enc.equipo][enc.index].apodo || planteles[enc.equipo][enc.index].nombre;
  }
  jugadorTextoEl.innerHTML = `<strong>${displayMVP}</strong>`;
  jugadorTextoEl.onclick = () => {
    if (nombreMVP==="-") return;
    const enc = buscarJugadorPorNombre(nombreMVP);
    if (enc) abrirJugadorIndex(enc.equipo, enc.index);
  };
  adminJugadorEl.style.display = window.admin?"flex":"none";
}

/* ── HISTORIAL ────────────────────────────────────── */
function renderHistorial() {
  historialEl.innerHTML = datos.map((p,i)=>`
    <div class="fila">
      <strong>Fecha ${i+1} &mdash; ${p.fecha}</strong>
      ${p.golesA!=null?`${EQUIPO_A} ${p.golesA}–${p.golesB} ${EQUIPO_B}`:`<span style="color:var(--text-muted)">Sin jugar</span>`}
      <br>MVP: ${window.admin
        ?`<input type="text" value="${jugadores[i]||""}" placeholder="Nombre MVP" onchange="editarMVP(${i},this.value)">`
        :`<strong>${jugadores[i]||"–"}</strong>`}
    </div>`).join("");
}

/* ── RANKING ──────────────────────────────────────── */
function renderRanking() {
  const count={};
  jugadores.forEach(j=>{if(j)count[j]=(count[j]||0)+1;});
  const ranking=Object.entries(count).map(([nombre,puntos])=>({nombre,puntos})).sort((a,b)=>b.puntos-a.puntos);
  const medals=["🥇","🥈","🥉"];
  rankingEl.innerHTML=ranking.length
    ?ranking.map((j,i)=>`<div class="fila ${i===0?"lider":""}">
        ${medals[i]||(i+1)+"."} &nbsp;<strong>${j.nombre}</strong>
        &nbsp;&mdash;&nbsp; ${j.puntos} MVP${j.puntos>1?"s":""}
      </div>`).join("")
    :`<p style="text-align:center;color:var(--text-muted)">Aún no hay MVPs registrados.</p>`;
}

/* ── PLANTELES ────────────────────────────────────── */
function renderPlanteles() {
  const isAdmin = window.admin===true;
  ["A","B"].forEach(eq=>{
    const lista = eq==="A"?listaA:listaB;
    lista.innerHTML=`<div class="equipo-lista-inner">${
      (planteles[eq]||[]).map((j,i)=>{
        const esCapitan=i===0;
        const reorderHTML=isAdmin?`
          <div class="reorder-btns" onclick="event.stopPropagation()">
            <button onclick="moverJugador('${eq}',${i},-1)">▲</button>
            <button onclick="moverJugador('${eq}',${i},1)">▼</button>
          </div>`:"";
        return `
          <div class="card jugador-card${esCapitan?" capitan":""}" data-equipo="${eq}" data-index="${i}">
            <img src="${avatarUrl(j.foto)}" alt="${j.nombre}" onerror="this.src='${avatarUrl("")}'">
            <div style="flex:1">
              <strong>${j.apodo||j.nombre}</strong>
              ${esCapitan
                ?`<div class="capitan-badge">Capitán</div>`
                :`<div style="font-size:0.8rem;color:var(--text-muted)">${j.nombre}</div>`}
            </div>
            ${j.dorsal?`<span style="font-size:13px;font-weight:700;color:var(--accent);margin-right:4px">#${j.dorsal}</span>`:""}
            ${clubDotHTML(j.escudo)}
            ${reorderHTML}
          </div>`;
      }).join("")
    }</div>`;
    const adminDiv=$("admin"+eq);
    if(adminDiv) adminDiv.style.display=isAdmin?"flex":"none";
  });
}

/* ── CUMPLEAÑOS ───────────────────────────────────── */
function renderCumples() {
  const hoy=new Date(), mes=cumpleMesActual, anio=hoy.getFullYear();
  const todos=[...(planteles.A||[]),...(planteles.B||[])];
  const cumplesMes={};
  todos.forEach(j=>{
    const p=parsearNacimiento(j.nacimiento);
    if(p&&p.mes===mes){if(!cumplesMes[p.dia])cumplesMes[p.dia]=[];cumplesMes[p.dia].push(j);}
  });

  const navHTML=`<div class="cumple-nav">
    <button onclick="cambiarMesCumple(-1)">◀</button>
    <span class="cumple-mes-label">${MESES[mes]} ${anio}</span>
    <button onclick="cambiarMesCumple(1)">▶</button>
  </div>`;

  const primerDia=new Date(anio,mes,1).getDay(), diasEnMes=new Date(anio,mes+1,0).getDate();
  let gridHTML=DIAS_SEMANA.map(d=>`<div class="cumple-dia-header">${d}</div>`).join("");
  for(let v=0;v<primerDia;v++) gridHTML+=`<div class="cumple-dia vacio"></div>`;
  for(let d=1;d<=diasEnMes;d++){
    const esHoy=hoy.getDate()===d&&hoy.getMonth()===mes&&hoy.getFullYear()===anio;
    const jjs=cumplesMes[d]||[], tieneCumple=jjs.length>0;
    const nombres=jjs.map(j=>j.apodo||j.nombre).join(", ");
    gridHTML+=`<div class="cumple-dia ${esHoy?"hoy":""} ${tieneCumple?"tiene-cumple":""}">
      ${d}${tieneCumple?`<span class="cumple-dot"></span>`:""}
      ${tieneCumple?`<span class="cumple-tooltip">🎂 ${nombres}</span>`:""}
    </div>`;
  }

  const sortedDias=Object.keys(cumplesMes).map(Number).sort((a,b)=>a-b);
  const listaHTML=sortedDias.length
    ?sortedDias.map(d=>cumplesMes[d].map(j=>{
        // Buscar equipo e índice para abrir la FIFA card
        const enc = buscarJugadorPorNombre(j.apodo || j.nombre);
        const clickAttr = enc
          ? `onclick="abrirJugadorIndex('${enc.equipo}',${enc.index})"`
          : "";
        return `
          <div class="cumple-item" ${clickAttr}>
            <div class="cumple-item-dia">${d}</div>
            <div class="cumple-item-nombre">
              <strong>${j.apodo||j.nombre}</strong>
              <span>${j.nombre}</span>
            </div>
          </div>`;
      }).join("")).join("")
    :`<div class="cumple-empty">No hay cumpleaños en ${MESES[mes]}.</div>`;

  cumpleEl.innerHTML=`${navHTML}<div class="cumple-grid">${gridHTML}</div><div class="cumple-lista">${listaHTML}</div>`;
}
window.cambiarMesCumple=(dir)=>{cumpleMesActual=(cumpleMesActual+dir+12)%12;renderCumples();};

/* ── PALMARÉS ─────────────────────────────────────── */
function renderPalmares() {
  const isAdmin = window.admin === true;
  const anios   = Object.keys(palmares).sort((a,b) => b - a);

  const trofeoHTML = (anio, tipo, svgFn, clase, label) => {
    const ganador = palmares[anio]?.[tipo] || "";
    const selectHTML = isAdmin ? `
      <div class="trofeo-admin visible">
        <select id="sel-${anio}-${tipo}" onchange="guardarTrofeo('${anio}','${tipo}')">
          ${EQUIPOS_OPCIONES.map(e=>`<option value="${e}" ${e===ganador?"selected":""}>${e||"— Sin asignar —"}</option>`).join("")}
        </select>
      </div>` : "";
    return `
      <div class="trofeo-card ${clase}">
        <div class="trofeo-svg-wrap">${svgFn()}</div>
        <div class="trofeo-tipo">${label}</div>
        <div class="trofeo-ganador">${ganador || '<span class="trofeo-vacio">Sin asignar</span>'}</div>
        ${selectHTML}
      </div>`;
  };

  const cuerpo = anios.map(anio => `
    <div class="palmares-anio">
      <div class="palmares-anio-titulo">${anio}</div>
      <div class="palmares-trofeos">
        ${trofeoHTML(anio,"apertura", svgCopaApertura, "apertura", "Apertura "+anio)}
        ${trofeoHTML(anio,"supercopa",svgSupercopa,    "supercopa","Supercopa "+anio)}
        ${trofeoHTML(anio,"clausura", svgCopaClausura, "clausura", "Clausura "+anio)}
      </div>
    </div>`).join("");

  const btnNuevoAnio = isAdmin
    ? `<div class="palmares-nuevo-anio visible"><button onclick="agregarAnio()">+ Agregar año</button></div>`
    : "";

  palmaresEl.innerHTML = `
    <div class="card">
      <h2>Palmarés</h2>
      ${btnNuevoAnio}
      ${cuerpo || '<p style="text-align:center;color:var(--text-muted)">No hay registros aún.</p>'}
    </div>`;
}

/* ── INIT ─────────────────────────────────────────── */
cargarDatos();

