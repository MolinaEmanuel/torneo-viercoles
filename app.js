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
  if (typeof j === "string") return { nombre: j, altura: "-", nacimiento: "-", foto: "" };
  return {
    nombre:     j?.nombre     || "-",
    altura:     j?.altura     || "-",
    nacimiento: j?.nacimiento || "-",
    foto:       j?.foto       || ""
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
    document.querySelector(".modal-jugador")?.remove();
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

// Enter key en login
passwordInput.addEventListener("keydown", e => {
  if (e.key === "Enter") window.verificarLogin();
});

// Cerrar modal login al hacer click fuera
modalLogin.addEventListener("click", e => {
  if (e.target === modalLogin) modalLogin.style.display = "none";
});

/* ── NAVEGACIÓN ───────────────────────────────────── */
window.mostrarSeccion = (id) => {
  const secciones = document.querySelectorAll(".seccion");

  // Actualizar botón activo
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
  const altura     = prompt("Altura (ej: 1.75)") || "-";
  const nacimiento = prompt("Fecha de nacimiento (dd/mm/aaaa)") || "-";
  const foto       = prompt("URL o ruta de la foto (dejar vacío para avatar)") || "";
  if (!planteles[equipo]) planteles[equipo] = [];
  planteles[equipo].push({ nombre, altura, nacimiento, foto });
  guardar();
  renderPlanteles();
};

window.eliminarJugador = (equipo, index) => {
  if (!confirm(`¿Eliminar a ${planteles[equipo][index]?.nombre}?`)) return;
  planteles[equipo].splice(index, 1);
  guardar();
  renderPlanteles();
  document.querySelector(".modal-jugador")?.remove();
};

window.guardarEdicionJugador = (equipo, index) => {
  planteles[equipo][index] = {
    nombre:     $("editNombre").value,
    altura:     $("editAltura").value,
    nacimiento: $("editNacimiento").value,
    foto:       $("editFoto").value,
  };
  guardar();
  renderPlanteles();
  document.querySelector(".modal-jugador")?.remove();
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

/* ── MODAL JUGADOR ────────────────────────────────── */
window.abrirJugador = (j, index, equipo) => {
  const isAdmin = window.admin === true;
  const modal   = document.createElement("div");
  modal.className = "modal-jugador activo";

  modal.innerHTML = `
    <div class="overlay"></div>
    <div class="card-jugador" onclick="event.stopPropagation()">
      <img src="${avatarUrl(j.foto)}" alt="${j.nombre}" onerror="this.src='${avatarUrl('')}'">
      ${isAdmin ? `
        <input id="editNombre"     value="${j.nombre}"     placeholder="Nombre">
        <input id="editAltura"     value="${j.altura}"     placeholder="Altura">
        <input id="editNacimiento" value="${j.nacimiento}" placeholder="Nacimiento">
        <input id="editFoto"       value="${j.foto}"       placeholder="URL foto">
        <div class="modal-btns">
          <button onclick="guardarEdicionJugador('${equipo}',${index})">💾 Guardar</button>
          <button onclick="eliminarJugador('${equipo}',${index})" style="background:var(--accent-dark)">🗑 Eliminar</button>
        </div>
      ` : `
        <h2>${j.nombre}</h2>
        <p>📏 ${j.altura}</p>
        <p>🎂 ${j.nacimiento}</p>
        <div class="modal-btns">
          <button onclick="document.querySelector('.modal-jugador')?.remove()">Cerrar</button>
        </div>
      `}
    </div>
  `;

  modal.addEventListener("click", e => {
    if (e.target === modal || e.target.classList.contains("overlay")) modal.remove();
  });

  // Escape key
  const onKey = e => { if (e.key === "Escape") { modal.remove(); document.removeEventListener("keydown", onKey); } };
  document.addEventListener("keydown", onKey);

  document.body.appendChild(modal);
};

window.abrirJugadorIndex = (equipo, index) => {
  abrirJugador(planteles[equipo][index], index, equipo);
};

// Delegación de click en jugador-cards
document.addEventListener("click", e => {
  const card = e.target.closest(".jugador-card");
  if (card) abrirJugadorIndex(card.dataset.equipo, parseInt(card.dataset.index));
});

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
      if      (p.golesA > p.golesB) res = `🏆 ${EQUIPO_A} ${p.golesA}–${p.golesB}`;
      else if (p.golesB > p.golesA) res = `🏆 ${EQUIPO_B} ${p.golesB}–${p.golesA}`;
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
        <span class="fila-pos">${i === 0 ? "🥇" : "🥈"}</span>
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
    lista.innerHTML = (planteles[eq] || []).map((j, i) => `
      <div class="card jugador-card" data-equipo="${eq}" data-index="${i}">
        <img src="${avatarUrl(j.foto)}" alt="${j.nombre}" onerror="this.src='${avatarUrl('')}'">
        <div>
          <strong>${j.nombre}</strong>
          <div>${j.altura !== "-" ? "📏 " + j.altura : ""}</div>
        </div>
      </div>
    `).join("");

    const adminDiv = $("admin" + eq);
    if (adminDiv) adminDiv.style.display = isAdmin ? "flex" : "none";
  });
}

/* ── INIT ─────────────────────────────────────────── */
cargarDatos();

