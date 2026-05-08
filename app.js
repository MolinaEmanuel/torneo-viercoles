const modalLogin = document.getElementById("modalLogin");
const passwordInput = document.getElementById("passwordInput");
const partidos = document.getElementById("partidos");
const tabla = document.getElementById("tabla");
const fechaActual = document.getElementById("fechaActual");
const jugadorTexto = document.getElementById("jugadorTexto");
const adminJugador = document.getElementById("adminJugador");
const historialContenido = document.getElementById("historialContenido");
const rankingContenido = document.getElementById("rankingContenido");
const loader = document.getElementById("loader");
const listaA = document.getElementById("listaA");
const listaB = document.getElementById("listaB");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAY-F10jVa_KTRtIjm4GNupFQ_UR1TsJVw",
  authDomain: "torneo-viercoles.firebaseapp.com",
  projectId: "torneo-viercoles",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const equipoA = "Equipo SEBA";
const equipoB = "Equipo HEBER";

window.admin = localStorage.getItem("admin") === "true";

let datos = [];
let jugadores = [];
let planteles = { A: [], B: [] };

function generarFechas(){
  const fechas = [];
  let actual = new Date(2026, 3, 1);

  while (fechas.length < 18) {
    if (actual.getDay() === 3) {
      fechas.push({
        fecha: actual.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit'}),
        golesA:null,
        golesB:null
      });
    }
    actual.setDate(actual.getDate()+1);
  }

  return fechas;
}

/* FIREBASE */
function cargarDatos(){
  const ref = doc(db,"torneo","datos");

  onSnapshot(ref,(docSnap)=>{
    if(docSnap.exists()){
      const data = docSnap.data();

      datos = data.partidos || generarFechas();
      jugadores = data.jugadores || new Array(datos.length).fill("");

      planteles = data.planteles || { A: [], B: [] };

      ["A","B"].forEach(eq=>{
        planteles[eq] = (planteles[eq] || []).map(j=>{
          if(typeof j === "string"){
            return { nombre: j, altura: "-", nacimiento: "-", foto: "" };
          }
          return {
            nombre: j?.nombre || "-",
            altura: j?.altura || "-",
            nacimiento: j?.nacimiento || "-",
            foto: j?.foto || ""
          };
        });
      });

    } else {
      datos = generarFechas();
      jugadores = new Array(18).fill("");
      planteles = { A: [], B: [] };
      guardar();
    }

    renderAll();
    setTimeout(()=> loader.classList.add("hidden"),300);
  });
}

function guardar(){
  setDoc(doc(db,"torneo","datos"),{
    partidos:datos,
    jugadores:jugadores,
    planteles:planteles
  });
}

/* LOGIN */
window.abrirLogin = () => modalLogin.style.display="flex";

window.verificarLogin = () => {
  if(passwordInput.value==="cogi2"){
    window.admin = true;
    localStorage.setItem("admin","true");
    modalLogin.style.display="none";

    renderAll(); // OK

    // 🔥 AGREGAR ESTO
    document.querySelector(".modal-jugador")?.remove();

  } else alert("Incorrecto");
};

window.logout = () => {
  window.admin = false;
  localStorage.removeItem("admin");
  renderAll();
};

/* RESULTADO */
window.guardarResultado = (i)=>{
  let a=parseInt(document.getElementById("a"+i).value);
  let b=parseInt(document.getElementById("b"+i).value);

  if(isNaN(a)||isNaN(b)) return alert("Ingresá goles");

  datos[i].golesA=a;
  datos[i].golesB=b;

  guardar();
};

window.mostrarSeccion = (id) => {
  const secciones = document.querySelectorAll(".seccion");

  secciones.forEach(sec => {
    if(sec.classList.contains("activa")){
      sec.classList.remove("activa");
      sec.classList.add("saliendo");

      setTimeout(()=>{
        sec.classList.remove("saliendo");
        sec.style.display = "none";
      }, 400);
    } else {
      sec.style.display = "none";
    }
  });

  const nueva = document.getElementById(id);

  setTimeout(()=>{
    nueva.style.display = "block";
    setTimeout(()=> nueva.classList.add("activa"), 50);
  }, 400);
};

/* MVP */
window.guardarJugador = () => {
  let nombre = document.getElementById("inputJugador").value;
  if (!nombre) return;

  let index = datos.findLastIndex(p => p.golesA != null);
  if (index === -1) return;

  jugadores[index] = nombre;
  document.getElementById("inputJugador").value = "";
  guardar();
};

window.agregarJugador = (equipo) => {
  let nombre = prompt("Nombre completo");
  if (!nombre) return;

  let altura = prompt("Altura (ej: 1.75)") || "-";
  let nacimiento = prompt("Fecha nacimiento (dd/mm/aaaa)") || "-";
  let foto = prompt("Ruta imagen (assets/images/...)") || "";

  if(!planteles[equipo]) planteles[equipo] = [];

  planteles[equipo].push({ nombre, altura, nacimiento, foto });

  guardar();
  renderPlanteles();
};

window.eliminarJugador = function(equipo, index) {
  if(!confirm("Eliminar jugador?")) return;

  planteles[equipo].splice(index, 1);
  guardar();
  renderPlanteles();

  document.querySelector(".modal-jugador")?.remove();
};

window.guardarEdicionJugador = function(equipo, index) {

  const nombre = document.getElementById("editNombre").value;
  const altura = document.getElementById("editAltura").value;
  const nacimiento = document.getElementById("editNacimiento").value;
  const foto = document.getElementById("editFoto").value;

  planteles[equipo][index] = {
    nombre,
    altura,
    nacimiento,
    foto
  };

  guardar();
  renderPlanteles();

  document.querySelector(".modal-jugador")?.remove();
};

/* 🔥 SOLUCIÓN REAL */
function toggleEquipo(eq) {
  const el = document.getElementById("lista" + eq);
  el.style.display = el.style.display === "block" ? "none" : "block";
}

window.toggleEquipo = toggleEquipo;

/* RENDER */
function renderAll(){
  renderPartidos();
  renderTabla();
  renderInfo();
  renderHistorial();
  renderRanking();
  renderPlanteles();
}

function renderPartidos(){
  let html=`<tr>
  <th>Fecha</th><th>Día</th><th>Resultado</th><th>Cargar</th></tr>`;

  datos.forEach((p,i)=>{
    let res="-";

    if(p.golesA!=null){
      if(p.golesA>p.golesB) res=`${equipoA} ganó ${p.golesA}-${p.golesB}`;
      else if(p.golesB>p.golesA) res=`${equipoB} ganó ${p.golesB}-${p.golesA}`;
      else res=`Empate ${p.golesA}-${p.golesB}`;
    }

    html+=`<tr>
    <td>Fecha ${i+1}</td>
    <td>${p.fecha}</td>
    <td>${res}</td>
    <td>${window.admin?`
      <input id="a${i}" type="number">
      vs
      <input id="b${i}" type="number">
      <button onclick="guardarResultado(${i})">OK</button>
    `:'-'}</td>
    </tr>`;
  });

  partidos.innerHTML=html;
}

function renderTabla(){
  let equipos = [
    { nombre: equipoA, pts: 0, gf: 0, gc: 0 },
    { nombre: equipoB, pts: 0, gf: 0, gc: 0 }
  ];

  datos.forEach(p=>{
    if(p.golesA == null) return;

    equipos[0].gf += p.golesA;
    equipos[0].gc += p.golesB;
    equipos[1].gf += p.golesB;
    equipos[1].gc += p.golesA;

    if(p.golesA > p.golesB) equipos[0].pts += 3;
    else if(p.golesB > p.golesA) equipos[1].pts += 3;
    else { equipos[0].pts += 1; equipos[1].pts += 1; }
  });

  equipos.forEach(e=> e.gd = e.gf - e.gc);

  equipos.sort((a,b)=> b.pts !== a.pts ? b.pts - a.pts : b.gd - a.gd);

  tabla.innerHTML = equipos.map((eq,i)=>`
    <div class="fila ${i===0 ? 'lider' : ''}">
      ${eq.nombre}: ${eq.pts} pts (${eq.gd >= 0 ? '+' : ''}${eq.gd} GD)
    </div>
  `).join("");
}

function renderInfo(){
  let index = datos.findLastIndex(p => p.golesA != null);

  fechaActual.innerText = index >= 0 ? "Fecha " + (index + 1) : "-";
  jugadorTexto.innerHTML = "<b>" + (jugadores[index] || "-") + "</b>";

  adminJugador.style.display = window.admin ? "block" : "none";
}

function renderHistorial() {
  historialContenido.innerHTML = datos.map((p, i) => `
    <div class="fila">
      <strong>Fecha ${i+1} - ${p.fecha}</strong><br>
      ${p.golesA!=null ? `${p.golesA}-${p.golesB}` : "Sin jugar"} <br>

      MVP: ${
        window.admin
        ? `<input type="text" value="${jugadores[i] || ''}" onchange="editarMVP(${i}, this.value)">`
        : `<b>${jugadores[i] || "-"}</b>`
      }
    </div>
  `).join("");
}

window.editarMVP = (index, nombre) => {
  jugadores[index] = nombre;
  guardar();
};

function renderRanking(){
  let count = {};

  jugadores.forEach(j=>{
    if(!j) return;
    count[j] = (count[j] || 0) + 1;
  });

  let ranking = Object.entries(count)
    .map(([nombre, puntos]) => ({ nombre, puntos }))
    .sort((a,b) => b.puntos - a.puntos);

  rankingContenido.innerHTML = ranking.map((j,i)=>`
    <div class="fila ${i===0 ? 'lider' : ''}">
      ${i+1}. ${j.nombre} - ${j.puntos} MVP
    </div>
  `).join("");
}

function renderPlanteles() {

  listaA.innerHTML = (planteles.A || []).map((j, i) => `
    <div class="card jugador-card" data-equipo="A" data-index="${i}">
      <img src="${j.foto || 'https://via.placeholder.com/100'}">
      <div>
        <strong>${j.nombre}</strong>
        <div>${j.altura}</div>
      </div>
    </div>
  `).join("");

  listaB.innerHTML = (planteles.B || []).map((j, i) => `
    <div class="card jugador-card" data-equipo="B" data-index="${i}">
      <img src="${j.foto || 'https://via.placeholder.com/100'}">
      <div>
        <strong>${j.nombre}</strong>
        <div>${j.altura}</div>
      </div>
    </div>
  `).join("");

  const isAdmin = window.admin === true;

  document.getElementById("btnA").style.display = isAdmin ? "inline-block" : "none";
  document.getElementById("btnB").style.display = isAdmin ? "inline-block" : "none";
  document.getElementById("fotoA").style.display = isAdmin ? "inline-block" : "none";
  document.getElementById("fotoB").style.display = isAdmin ? "inline-block" : "none";
}

/* MODAL */
window.abrirJugador = function(j, index, equipo){

  const isAdmin = window.admin === true;

  const modal = document.createElement("div");
  modal.className = "modal-jugador activo";

  modal.innerHTML = `
    <div class="overlay"></div>

    <div class="card-jugador" onclick="event.stopPropagation()">
      <img src="${j.foto || 'https://via.placeholder.com/200'}">

      ${
        isAdmin
        ? `
          <input id="editNombre" value="${j.nombre}">
          <input id="editAltura" value="${j.altura}">
          <input id="editNacimiento" value="${j.nacimiento}">
          <input id="editFoto" value="${j.foto}">

          <button onclick="guardarEdicionJugador('${equipo}', ${index})">Guardar</button>
          <button onclick="eliminarJugador('${equipo}', ${index})">Eliminar</button>
        `
        : `
          <h2>${j.nombre}</h2>
          <p>Altura: ${j.altura}</p>
          <p>Nacimiento: ${j.nacimiento}</p>
          <button onclick="document.querySelector('.modal-jugador')?.remove()">Cerrar</button>
        `
      }
    </div>
  `;

  // cerrar modal al hacer click afuera
  modal.addEventListener("click", () => {
    modal.remove();
  });

  document.body.appendChild(modal);
};

window.abrirJugadorIndex = (equipo, index) => {
  abrirJugador(planteles[equipo][index], index, equipo);
};

document.addEventListener("click", function(e){

  const card = e.target.closest(".jugador-card");

  if(card){
    const equipo = card.dataset.equipo;
    const index = parseInt(card.dataset.index);

    abrirJugadorIndex(equipo, index);
  }

});

/* INIT */
cargarDatos();

