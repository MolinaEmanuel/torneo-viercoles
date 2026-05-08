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
const EQUIPO_A  = "Equipo SEBA";
const EQUIPO_B  = "Equipo HEBER";
const PASS      = "cogi2";
const DB_DOC    = doc(db, "torneo", "datos");

/* ── ESCUDOS (ruta local) ─────────────────────────── */
const ESCUDOS = {
  "River Plate":   "assets/images/escudos/river.png",
  "Boca Juniors":  "assets/images/escudos/boca.png",
  "Independiente": "assets/images/escudos/independiente.png",
  "Racing":        "assets/images/escudos/racing.png",
  "San Lorenzo":   "assets/images/escudos/sanlorenzo.png",
  "Huracán":       "assets/images/escudos/huracan.png",
};

/* ── COLORES DOT POR CLUB ─────────────────────────── */
// River y Boca usan clases CSS con degradado diagonal
// El resto reciben color sólido inline
const CLUB_COLORS = {
  "Independiente": "#CC0000",
  "Racing":        "#6BBFFF",
  "San Lorenzo":   "#CC0000",
  "Huracán":       "#e0e0e0",
};

/* ── DOM ──────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const modalLogin        = $("modalLogin");
const passwordInput     = $("passwordInput");
const tablaEl           = $("tabla");
const partidosEl        = $("partidos");
const fechaActualEl     = $("fechaActual");
const jugadorTextoEl    = $("jugadorTexto");
const adminJugadorEl    = $("adminJugador");
const historialEl       = $("historialContenido");
const rankingEl         = $("rankingContenido");
const loaderEl          = $("loader");
const listaA            = $("listaA");
const listaB            = $("listaB");

/* ── ESTADO ───────────────────────────────────────── */
window.admin = localStorage.getItem("admin") === "true";
let datos    = [];
let jugadores = [];
let planteles = { A: [], B: [] };

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
  if (typeof j === "string") return { nombre: j, altura: "-", nacimiento: "-", foto: "", dorsal: "", escudo: "" };
  return {
    nombre:     j?.nombre     || "-",
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

/* ── DOT DE CLUB ──────────────────────────────────── */
function clubDotHTML(escudo) {
  if (!escudo) return "";
  if (escudo === "River Plate") {
    return `<span class="jugador-club-dot dot-river" title="River Plate"></span>`;
  }
  if (escudo === "Boca Juniors") {
    return `<span class="jugador-club-dot dot-boca" title="Boca Juniors"></span>`;
  }
  const color = CLUB_COLORS[escudo] || "rgba(255,255,255,0.3)";
  return `<span class="jugador-club-dot" style="background:${color}" title="${escudo}"></span>`;
}

/* ── FIFA CARD STYLES ─────────────────────────────── */
(function inyectarEstilosFIFA() {
  if (document.getElementById("fv-fifa-styles")) return;
  const style = document.createElement("style");
  style.id = "fv-fifa-styles";
  style.textContent = `
    .modal-fifa {
      position: fixed;
      inset: 0;
      display: none;
      z-index: 999999;
    }
    .modal-fifa.activo { display: block; }

    .modal-fifa .overlay {
      position: absolute;
      inset: 0;
      background: rgba(2,6,23,0.88);
      backdrop-filter: blur(8px);
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .modal-fifa.activo .overlay { opacity: 1; }

    .fifa-card-wrap {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 2;
    }

    /* ── FLIP DE CARTA ── */
    .flip-scene {
      perspective: 1000px;
      width: 240px;
    }

    .flip-inner {
      position: relative;
      width: 100%;
      -webkit-transform-style: preserve-3d;
      transform-style: preserve-3d;
      will-change: transform;
      -webkit-animation: cartaFlip 0.72s cubic-bezier(0.4, 0, 0.2, 1) 0.08s both;
      animation: cartaFlip 0.72s cubic-bezier(0.4, 0, 0.2, 1) 0.08s both;
    }

    @-webkit-keyframes cartaFlip {
      0%   { -webkit-transform: rotateY(-180deg) scale(0.85); opacity: 0.5; }
      60%  { -webkit-transform: rotateY(8deg)    scale(1.02); opacity: 1;   }
      80%  { -webkit-transform: rotateY(-4deg)   scale(0.99);               }
      100% { -webkit-transform: rotateY(0deg)    scale(1);                  }
    }

    @keyframes cartaFlip {
      0%   { transform: rotateY(-180deg) scale(0.85); opacity: 0.5; }
      60%  { transform: rotateY(8deg)    scale(1.02); opacity: 1;   }
      80%  { transform: rotateY(-4deg)   scale(0.99);               }
      100% { transform: rotateY(0deg)    scale(1);                  }
    }

    .flip-dorso {
      position: absolute;
      inset: 0;
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
      -webkit-transform: rotateY(180deg);
      transform: rotateY(180deg);
      background: linear-gradient(145deg, #0f172a, #1e293b);
      border-radius: 20px;
      border: 1.5px solid rgba(239,68,68,0.45);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      pointer-events: none;
    }

    .flip-dorso-lines {
      position: absolute;
      inset: 0;
      border-radius: 20px;
      background:
        repeating-linear-gradient(
          45deg,
          rgba(239,68,68,0.04) 0px, rgba(239,68,68,0.04) 1px,
          transparent 1px, transparent 18px
        );
    }

    .flip-dorso-logo {
      font-size: 42px;
      opacity: 0.18;
      position: relative;
      z-index: 1;
    }

    .flip-dorso-texto {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: rgba(239,68,68,0.45);
      position: relative;
      z-index: 1;
    }

    .flip-dorso-linea {
      width: 40px;
      height: 1px;
      background: rgba(239,68,68,0.25);
      position: relative;
      z-index: 1;
    }

    .fifa-card {
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
      width: 240px;
      border-radius: 20px;
      overflow: hidden;
      border: 1.5px solid rgba(239,68,68,0.45);
      background: #0f172a;
      box-shadow:
        0 0 0 1px rgba(239,68,68,0.08),
        0 30px 70px rgba(0,0,0,0.75),
        inset 0 1px 0 rgba(255,255,255,0.05);
      font-family: 'Segoe UI', Arial, sans-serif;
    }

    .fcard-top {
      position: relative;
      height: 255px;
      background: linear-gradient(160deg, #0a0f1e 0%, #1a2540 50%, #0a0f1e 100%);
    }

    .flip-inner.animacion-completa .fcard-top {
      overflow: hidden;
    }

    .fcard-lines {
      position: absolute;
      inset: 0;
      background:
        repeating-linear-gradient(
          112deg,
          rgba(239,68,68,0.04) 0px, rgba(239,68,68,0.04) 1px,
          transparent 1px, transparent 52px
        ),
        repeating-linear-gradient(
          22deg,
          rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px,
          transparent 1px, transparent 68px
        );
    }

    .fcard-accent-bar {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(239,68,68,0.4) 15%,
        #ef4444 50%,
        rgba(239,68,68,0.4) 85%,
        transparent 100%
      );
    }

    /* Barra dorada para capitán en la FIFA card */
    .fcard-accent-bar.capitan {
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(245,158,11,0.4) 15%,
        #f59e0b 50%,
        rgba(245,158,11,0.4) 85%,
        transparent 100%
      );
    }

    .fcard-dorsal {
      position: absolute;
      top: 12px; left: 14px;
      font-size: 38px;
      font-weight: 900;
      color: #ef4444;
      font-family: 'Arial Black', Arial, sans-serif;
      line-height: 1;
      letter-spacing: -2px;
      text-shadow: 0 2px 16px rgba(239,68,68,0.35);
    }

    .fcard-capitan-badge {
      position: absolute;
      bottom: 12px; left: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(245,158,11,0.15);
      border: 1px solid rgba(245,158,11,0.5);
      border-radius: 6px;
      padding: 3px 7px;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #f59e0b;
    }

    .fcard-escudo-box {
      position: absolute;
      top: 12px; right: 12px;
      width: 40px; height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.35);
      border: 1px solid rgba(255,255,255,0.1);
      overflow: hidden;
    }
    .fcard-escudo-box img {
      width: 32px; height: 32px;
      object-fit: contain;
    }
    .fcard-escudo-fallback {
      font-size: 8px; font-weight: 800;
      color: rgba(255,255,255,0.6);
      text-align: center; letter-spacing: 0.5px;
      padding: 2px;
    }

    .fcard-photo-wrap {
      position: absolute;
      bottom: 0; left: 50%;
      transform: translateX(-50%);
      width: 165px; height: 210px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .fcard-photo-wrap img {
      width: 100%; height: 100%;
      object-fit: cover;
      object-position: top center;
      filter: grayscale(15%) contrast(1.05);
    }
    .fcard-silhouette {
      width: 100px; height: 165px;
      opacity: 0.15;
    }

    .fcard-bottom {
      background: linear-gradient(to bottom, #0f172a, #020617);
      padding: 14px 16px 18px;
      border-top: 1px solid rgba(239,68,68,0.2);
    }

    .fcard-nombre-box {
      text-align: center;
      padding-bottom: 12px;
      margin-bottom: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .fcard-nombre {
      font-size: 19px;
      font-weight: 900;
      color: #f1f5f9;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1.15;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    .fcard-sub {
      font-size: 10px;
      color: rgba(239,68,68,0.7);
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 3px;
    }

    .fcard-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .fcard-stat {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 8px;
      padding: 8px 10px;
      text-align: center;
    }
    .fcard-stat-label {
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #ef4444;
      margin-bottom: 4px;
    }
    .fcard-stat-val {
      font-size: 13px;
      font-weight: 700;
      color: #f1f5f9;
    }

    .fcard-footer {
      text-align: center;
      margin-top: 12px;
      font-size: 8px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: rgba(239,68,68,0.3);
      font-weight: 700;
    }

    .fcard-close {
      position: absolute;
      top: -13px; right: -13px;
      width: 30px; height: 30px;
      border-radius: 50%;
      background: #ef4444;
      border: 2px solid #020617;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 900;
      color: white;
      line-height: 1;
      transition: background 0.15s, transform 0.15s;
      z-index: 3;
    }
    .fcard-close:hover { background: #ff6b6b; transform: scale(1.12); }

    .fcard-admin {
      margin-top: 14px;
      border-top: 1px solid rgba(255,255,255,0.07);
      padding-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .fcard-admin input {
      width: 100%;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      color: #f1f5f9;
      padding: 7px 10px;
      font-size: 0.85rem;
      outline: none;
      transition: border-color 0.2s;
      font-family: inherit;
    }
    .fcard-admin input:focus { border-color: #ef4444; }
    .fcard-admin .admin-btns {
      display: flex;
      gap: 8px;
    }
    .fcard-admin .admin-btns button { flex: 1; font-size: 0.78rem; padding: 8px 6px; }

    @media (max-width: 480px) {
      .fifa-card-wrap {
        max-height: 90vh;
        overflow-y: auto;
        border-radius: 20px;
      }
    }
  `;
  document.head.appendChild(style);
})();

/* ── MODAL FIFA CARD ──────────────────────────────── */
function siluetaSVG() {
  return `<svg class="fcard-silhouette" viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="32" rx="23" ry="26" fill="white"/>
    <path d="M8 160 Q14 102 50 92 Q86 102 92 160Z" fill="white"/>
  </svg>`;
}

window.abrirJugador = (j, index, equipo, esCapitan = false) => {
  document.querySelector(".modal-fifa")?.remove();

  const isAdmin    = window.admin === true;
  const escudoPath = ESCUDOS[j.escudo] || "";
  const fotoPath   = j.foto || "";

  const adminHTML = isAdmin ? `
    <div class="fcard-admin">
      <input id="editNombre"     value="${j.nombre}"     placeholder="Nombre">
      <input id="editAltura"     value="${j.altura}"     placeholder="Altura (ej: 1.75)">
      <input id="editNacimiento" value="${j.nacimiento}" placeholder="Nacimiento (dd/mm/aaaa)">
      <input id="editDorsal"     value="${j.dorsal}"     placeholder="Dorsal (ej: 10)">
      <input id="editEscudo"     value="${j.escudo}"     placeholder="Club (ej: River Plate)">
      <input id="editFoto"       value="${j.foto}"       placeholder="Ruta foto (assets/images/jugadores/...)">
      <div class="admin-btns">
        <button onclick="guardarEdicionJugador('${equipo}',${index})">Guardar</button>
        <button onclick="eliminarJugador('${equipo}',${index})" style="background:var(--accent-dark)">Eliminar</button>
      </div>
    </div>
  ` : "";

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
              <div class="fcard-nombre">${j.nombre}</div>
              <div class="fcard-sub">${j.escudo || "Fútbol Viércoles"}</div>
            </div>
            <div class="fcard-stats">
              <div class="fcard-stat">
                <div class="fcard-stat-label">Altura</div>
                <div class="fcard-stat-val">${j.altura !== "-" ? j.altura : "—"}</div>
              </div>
              <div class="fcard-stat">
                <div class="fcard-stat-label">Nacimiento</div>
                <div class="fcard-stat-val">${j.nacimiento !== "-" ? j.nacimiento : "—"}</div>
              </div>
            </div>
            ${adminHTML}
            <div class="fcard-footer">Torneo Apertura 2026</div>
          </div>
        </div>
      </div>
    </div>
  `;

  modal.addEventListener("click", e => {
    if (e.target === modal || e.target.classList.contains("overlay")) modal.remove();
  });

  const onKey = e => {
    if (e.key === "Escape") { modal.remove(); document.removeEventListener("keydown", onKey); }
  };
  document.addEventListener("keydown", onKey);

  document.body.appendChild(modal);

  const flipInner = modal.querySelector(".flip-inner");
  flipInner.addEventListener("animationend", () => {
    flipInner.classList.add("animacion-completa");
  }, { once: true });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => modal.classList.add("activo"));
  });

  // Escudo
  const escudoBox = modal.querySelector("#fcEscudo");
  if (escudoPath) {
    const img = document.createElement("img");
    img.alt = j.escudo || "";
    img.onerror = () => {
      escudoBox.innerHTML = `<span class="fcard-escudo-fallback">${(j.escudo || "").slice(0,3).toUpperCase()}</span>`;
    };
    img.src = escudoPath;
    escudoBox.appendChild(img);
  } else if (j.escudo) {
    escudoBox.innerHTML = `<span class="fcard-escudo-fallback">${j.escudo.slice(0,3).toUpperCase()}</span>`;
  }

  // Foto
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
  const esCapitan = index === 0;
  abrirJugador(planteles[equipo][index], index, equipo, esCapitan);
};

document.addEventListener("click", e => {
  const card = e.target.closest(".jugador-card");
  if (card) abrirJugadorIndex(card.dataset.equipo, parseInt(card.dataset.index));
});

/* ── FIREBASE: CARGA & GUARDADO ───────────────────── */
function cargarDatos() {
  onSnapshot(DB_DOC, snap => {
    if (snap.exists()) {
      const data  = snap.data();
      datos     = data.partidos  || generarFechas();
      jugadores = data.jugadores || new Array(datos.length).fill("");
      planteles = data.planteles || { A: [], B: [] };
      ["A","B"].forEach(eq => {
        planteles[eq] = (planteles[eq] || []).map(normalizarJugador);
      });
    } else {
      datos     = generarFechas();
      jugadores = new Array(18).fill("");
      planteles = { A: [], B: [] };
      guardar();
    }
    renderAll();
    setTimeout(() => loaderEl.classList.add("hidden"), 300);
  });
}

function guardar() {
  setDoc(DB_DOC, { partidos: datos, jugadores, planteles });
}

/* ── AUTENTICACIÓN ────────────────────────────────── */
window.abrirLogin = () => {
  modalLogin.style.display = "flex";
  passwordInput.value = "";
  setTimeout(() => passwordInput.focus(), 50);
};

window.verificarLogin = () => {
  if (passwordInput.value === PASS) {
    window.admin = true;
    localStorage.setItem("admin", "true");
    modalLogin.style.display = "none";
    renderAll();
    updateAdminUI();
    document.querySelector(".modal-fifa")?.remove();
  } else {
    passwordInput.value = "";
    passwordInput.placeholder = "Contraseña incorrecta";
    passwordInput.focus();
    setTimeout(() => passwordInput.placeholder = "Contraseña", 1500);
  }
};

window.logout = () => {
  window.admin = false;
  localStorage.removeItem("admin");
  renderAll();
  updateAdminUI();
};

passwordInput.addEventListener("keydown", e => {
  if (e.key === "Enter") window.verificarLogin();
});

modalLogin.addEventListener("click", e => {
  if (e.target === modalLogin) modalLogin.style.display = "none";
});

/* ── NAVEGACIÓN ───────────────────────────────────── */
window.mostrarSeccion = (id) => {
  const secciones = document.querySelectorAll(".seccion");

  document.querySelectorAll(".nav-btn[data-section]").forEach(btn => {
    btn.classList.toggle("active-nav", btn.dataset.section === id);
  });

  secciones.forEach(sec => {
    if (sec.classList.contains("activa")) {
      sec.classList.remove("activa");
      sec.classList.add("saliendo");
      setTimeout(() => {
        sec.classList.remove("saliendo");
        sec.style.display = "none";
      }, 400);
    } else {
      sec.style.display = "none";
    }
  });

  const nueva = document.getElementById(id);
  setTimeout(() => {
    nueva.style.display = "block";
    setTimeout(() => nueva.classList.add("activa"), 50);
  }, 400);
};

/* ── RESULTADOS ───────────────────────────────────── */
window.guardarResultado = (i) => {
  const a = parseInt($("a" + i).value);
  const b = parseInt($("b" + i).value);
  if (isNaN(a) || isNaN(b)) return alert("Ingresá los goles de ambos equipos");
  datos[i].golesA = a;
  datos[i].golesB = b;
  guardar();
};

/* ── MVP ──────────────────────────────────────────── */
window.guardarJugador = () => {
  const nombre = $("inputJugador").value.trim();
  if (!nombre) return;
  const index = datos.findLastIndex(p => p.golesA != null);
  if (index === -1) return;
  jugadores[index] = nombre;
  $("inputJugador").value = "";
  guardar();
};

window.editarMVP = (index, nombre) => {
  jugadores[index] = nombre;
  guardar();
};

/* ── PLANTEL ──────────────────────────────────────── */
window.agregarJugador = (equipo) => {
  const nombre = prompt("Nombre completo");
  if (!nombre) return;
  const dorsal     = prompt("Dorsal (número de camiseta)") || "";
  const altura     = prompt("Altura (ej: 1.75)") || "-";
  const nacimiento = prompt("Fecha de nacimiento (dd/mm/aaaa)") || "-";
  const escudo     = prompt("Club (ej: River Plate, Boca Juniors, Independiente...)") || "";
  const foto       = "";
  if (!planteles[equipo]) planteles[equipo] = [];
  planteles[equipo].push({ nombre, dorsal, altura, nacimiento, escudo, foto });
  guardar();
  renderPlanteles();
};

window.eliminarJugador = (equipo, index) => {
  if (!confirm(`¿Eliminar a ${planteles[equipo][index]?.nombre}?`)) return;
  planteles[equipo].splice(index, 1);
  guardar();
  renderPlanteles();
  document.querySelector(".modal-fifa")?.remove();
};

window.guardarEdicionJugador = (equipo, index) => {
  planteles[equipo][index] = {
    nombre:     $("editNombre").value.trim(),
    altura:     $("editAltura").value.trim(),
    nacimiento: $("editNacimiento").value.trim(),
    dorsal:     $("editDorsal").value.trim(),
    escudo:     $("editEscudo").value.trim(),
    foto:       $("editFoto").value.trim(),
  };
  guardar();
  renderPlanteles();
  document.querySelector(".modal-fifa")?.remove();
};

window.setFotoEquipo = (equipo) => {
  const url = prompt("URL o ruta de la foto del equipo");
  if (!url) return;
  const img = $("imgEquipo" + equipo);
  img.src = url;
  img.style.display = "block";
};

function toggleEquipo(eq) {
  const lista  = $("lista" + eq);
  const titulo = $("title" + eq);
  const abierto = lista.style.display === "block";
  lista.style.display = abierto ? "none" : "block";
  titulo.classList.toggle("abierto", !abierto);
  titulo.setAttribute("aria-expanded", String(!abierto));
}
window.toggleEquipo = toggleEquipo;

/* ── RENDER ───────────────────────────────────────── */
function renderAll() {
  renderPartidos();
  renderTabla();
  renderInfo();
  renderHistorial();
  renderRanking();
  renderPlanteles();
  updateAdminUI();
}

function renderPartidos() {
  let html = `
    <thead>
      <tr>
        <th>#</th><th>Día</th><th>Resultado</th><th>${window.admin ? "Cargar" : ""}</th>
      </tr>
    </thead>
    <tbody>
  `;
  datos.forEach((p, i) => {
    let res = `<span style="color:var(--text-muted)">Sin jugar</span>`;
    if (p.golesA != null) {
      if      (p.golesA > p.golesB) res = `${EQUIPO_A} ${p.golesA}–${p.golesB}`;
      else if (p.golesB > p.golesA) res = `${EQUIPO_B} ${p.golesB}–${p.golesA}`;
      else                          res = `Empate ${p.golesA}–${p.golesB}`;
    }
    html += `
      <tr>
        <td><strong>F${i+1}</strong></td>
        <td>${p.fecha}</td>
        <td>${res}</td>
        <td>${window.admin ? `
          <input id="a${i}" type="number" min="0" max="99" placeholder="${p.golesA ?? ""}">
          vs
          <input id="b${i}" type="number" min="0" max="99" placeholder="${p.golesB ?? ""}">
          <button onclick="guardarResultado(${i})">OK</button>
        ` : ""}</td>
      </tr>
    `;
  });
  html += "</tbody>";
  partidosEl.innerHTML = html;
}

function renderTabla() {
  const equipos = [
    { nombre: EQUIPO_A, pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0 },
    { nombre: EQUIPO_B, pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0 },
  ];
  datos.forEach(p => {
    if (p.golesA == null) return;
    equipos[0].pj++; equipos[1].pj++;
    equipos[0].gf += p.golesA; equipos[0].gc += p.golesB;
    equipos[1].gf += p.golesB; equipos[1].gc += p.golesA;
    if      (p.golesA > p.golesB) { equipos[0].pts += 3; equipos[0].pg++; equipos[1].pp++; }
    else if (p.golesB > p.golesA) { equipos[1].pts += 3; equipos[1].pg++; equipos[0].pp++; }
    else                          { equipos[0].pts += 1; equipos[1].pts += 1; equipos[0].pe++; equipos[1].pe++; }
  });
  equipos.forEach(e => e.gd = e.gf - e.gc);
  equipos.sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : b.gd - a.gd);

  tablaEl.innerHTML = equipos.map((eq, i) => `
    <div class="fila ${i === 0 ? "lider" : ""}">
      <div class="fila-tabla">
        <span class="fila-pos">${i === 0 ? "1°" : "2°"}</span>
        <span class="fila-nombre">${eq.nombre}</span>
        <span class="fila-pts">${eq.pts} pts</span>
        <span class="fila-gd">${eq.gd >= 0 ? "+" : ""}${eq.gd} GD</span>
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;padding-left:34px">
        PJ ${eq.pj} &nbsp;|&nbsp; G ${eq.pg} &nbsp;E ${eq.pe} &nbsp;P ${eq.pp}
        &nbsp;|&nbsp; ${eq.gf}:${eq.gc}
      </div>
    </div>
  `).join("");
}

function renderInfo() {
  const index = datos.findLastIndex(p => p.golesA != null);
  fechaActualEl.textContent = index >= 0 ? "Fecha " + (index + 1) : "-";
  jugadorTextoEl.innerHTML  = `<strong>${jugadores[index] || "-"}</strong>`;
  adminJugadorEl.style.display = window.admin ? "flex" : "none";
}

function renderHistorial() {
  historialEl.innerHTML = datos.map((p, i) => `
    <div class="fila">
      <strong>Fecha ${i+1} &mdash; ${p.fecha}</strong>
      ${p.golesA != null
        ? `${EQUIPO_A} ${p.golesA}–${p.golesB} ${EQUIPO_B}`
        : `<span style="color:var(--text-muted)">Sin jugar</span>`}
      <br>
      MVP: ${window.admin
        ? `<input type="text" value="${jugadores[i] || ""}" placeholder="Nombre MVP"
             onchange="editarMVP(${i}, this.value)">`
        : `<strong>${jugadores[i] || "–"}</strong>`}
    </div>
  `).join("");
}

function renderRanking() {
  const count = {};
  jugadores.forEach(j => { if (j) count[j] = (count[j] || 0) + 1; });
  const ranking = Object.entries(count)
    .map(([nombre, puntos]) => ({ nombre, puntos }))
    .sort((a, b) => b.puntos - a.puntos);
  const medals = ["🥇","🥈","🥉"];
  rankingEl.innerHTML = ranking.length
    ? ranking.map((j, i) => `
        <div class="fila ${i === 0 ? "lider" : ""}">
          ${medals[i] || (i+1) + "."} &nbsp;<strong>${j.nombre}</strong>
          &nbsp;&mdash;&nbsp; ${j.puntos} MVP${j.puntos > 1 ? "s" : ""}
        </div>
      `).join("")
    : `<p style="text-align:center;color:var(--text-muted)">Aún no hay MVPs registrados.</p>`;
}

function renderPlanteles() {
  const isAdmin = window.admin === true;
  ["A","B"].forEach(eq => {
    const lista = eq === "A" ? listaA : listaB;
    lista.innerHTML = (planteles[eq] || []).map((j, i) => {
      const esCapitan = i === 0;
      return `
        <div class="card jugador-card${esCapitan ? " capitan" : ""}" data-equipo="${eq}" data-index="${i}">
          <img src="${avatarUrl(j.foto)}" alt="${j.nombre}" onerror="this.src='${avatarUrl('')}'">
          <div style="flex:1">
            <strong>${j.nombre}</strong>
            ${esCapitan
              ? `<div class="capitan-badge">Capitán</div>`
              : `<div>${j.altura !== "-" ? "📏 " + j.altura : ""}</div>`
            }
          </div>
          ${j.dorsal ? `<span style="font-size:13px;font-weight:700;color:var(--accent);margin-right:4px">#${j.dorsal}</span>` : ""}
          ${clubDotHTML(j.escudo)}
        </div>
      `;
    }).join("");

    const adminDiv = $("admin" + eq);
    if (adminDiv) adminDiv.style.display = isAdmin ? "flex" : "none";
  });
}

/* ── INIT ─────────────────────────────────────────── */
cargarDatos();

