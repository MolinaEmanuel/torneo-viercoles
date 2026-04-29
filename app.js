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
  storageBucket: "torneo-viercoles.firebasestorage.app",
  messagingSenderId: "233402812946",
  appId: "1:233402812946:web:f1b9acd1f95f243200e6cb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const equipoA = "Equipo SEBA";
const equipoB = "Equipo HEBER";

let admin = localStorage.getItem("admin") === "true";
let datos = [];
let jugadores = [];
let planteles = { A: [], B: [] };

/* NAV */
window.mostrarSeccion = (id) => {
  loader.classList.remove("hidden");

  const secciones = document.querySelectorAll(".seccion");

  secciones.forEach(sec => {
    if (sec.classList.contains("activa")) {
      sec.classList.remove("activa");
      sec.classList.add("saliendo");

      setTimeout(() => {
        sec.style.display = "none";
        sec.classList.remove("saliendo");
      }, 300);
    } else {
      sec.style.display = "none";
    }
  });

  const nueva = document.getElementById(id);
  nueva.style.display = "block";

  setTimeout(() => {
    nueva.classList.add("activa");
    loader.classList.add("hidden");
  }, 200);
};

/* LOGIN */
window.abrirLogin = () => modalLogin.style.display="flex";

window.verificarLogin = () => {
  if(passwordInput.value==="cogi2"){
    admin=true;
    localStorage.setItem("admin","true");
    modalLogin.style.display="none";
    renderAll();
  } else alert("Incorrecto");
};

window.logout = () => {
  admin=false;
  localStorage.removeItem("admin");
  renderAll();
};

/* FECHAS */
function generarFechas(){
  const fechas = [];
  let actual = new Date(2026, 3, 1); // Abril (0-index)

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

      datos = data.partidos || [];

      if(datos.length < 18){
        const nuevas = generarFechas();
        datos = nuevas.map((f,i)=> datos[i] || f);
      }

      jugadores = data.jugadores || new Array(datos.length).fill("");
      planteles = data.planteles || { A: [], B: [] };

    } else {
      datos = generarFechas();
      jugadores = new Array(18).fill("");
      planteles = { A: [], B: [] };
      guardar();
    }

    renderAll();

    // 🔥 loader se oculta cuando realmente terminó
    setTimeout(() => {
      loader.classList.add("hidden");
    }, 300);
  });
}

function guardar(){
  setDoc(doc(db,"torneo","datos"),{
    partidos:datos,
    jugadores:jugadores,
    planteles:planteles
  });
}

/* RESULTADO */
window.guardarResultado = (i)=>{
  let a=parseInt(document.getElementById("a"+i).value);
  let b=parseInt(document.getElementById("b"+i).value);

  if(isNaN(a)||isNaN(b)) return alert("Ingresá goles");

  datos[i].golesA=a;
  datos[i].golesB=b;

  guardar();
};

/* ✅ MVP FIX REAL */
window.guardarJugador = () => {
  let nombre = document.getElementById("inputJugador").value;

  if (!nombre) return alert("Ingresá un nombre");

  let index = datos.findLastIndex(p => p.golesA != null);

  if (index === -1) return alert("Primero cargá un resultado");

  // 🔥 CLAVE: asegurar tamaño
  if (jugadores.length < datos.length) {
    jugadores = new Array(datos.length).fill("");
  }

  jugadores[index] = nombre;

  document.getElementById("inputJugador").value = "";

  guardar();
};

window.agregarJugador = (equipo) => {
  let input = document.getElementById("input" + equipo);
  let nombre = input.value;

  if (!nombre) return alert("Ingresá un nombre");

  planteles[equipo].push(nombre);

  input.value = "";
  guardar();
};

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
      let dif=Math.abs(p.golesA-p.golesB);

      if(p.golesA>p.golesB){
        res=`${equipoA} ganó ${p.golesA}-${p.golesB} (+${dif})`;
      } else if(p.golesB>p.golesA){
        res=`${equipoB} ganó ${p.golesB}-${p.golesA} (+${dif})`;
      } else {
        res=`Empate ${p.golesA}-${p.golesB}`;
      }
    }

    html+=`<tr>
    <td>Fecha ${i+1}</td>
    <td>${p.fecha}</td>
    <td>${res}</td>
    <td>${admin?`
      ${equipoA} <input id="a${i}" type="number">
      vs
      ${equipoB} <input id="b${i}" type="number">
      <button onclick="guardarResultado(${i})">OK</button>
    `:'-'}</td>
    </tr>`;
  });

  partidos.innerHTML=html;
}

function renderTabla(){
  let a=0,b=0,difA=0,difB=0;

  datos.forEach(p=>{
    if(p.golesA==null) return;

    difA+=p.golesA-p.golesB;
    difB+=p.golesB-p.golesA;

    if(p.golesA>p.golesB) a+=3;
    else if(p.golesB>p.golesA) b+=3;
    else {a++;b++;}
  });

  tabla.innerHTML=`
  <div class="fila ${a>b?'lider':''}">
    ${equipoA}: ${a} pts (DG: ${difA})
  </div>
  <div class="fila ${b>a?'lider':''}">
    ${equipoB}: ${b} pts (DG: ${difB})
  </div>`;
}

function renderInfo(){
  let index = datos.findLastIndex(p => p.golesA != null);

  fechaActual.innerText = index >= 0 ? "Fecha " + (index + 1) : "-";
  jugadorTexto.innerHTML = "<b>" + (jugadores[index] || "-") + "</b>";

  adminJugador.style.display = admin ? "block" : "none";
}

function renderHistorial() {
  historialContenido.innerHTML = datos.map((p, i) => `
    <div class="fila">
      <strong>Fecha ${i + 1} (${p.fecha})</strong><br>

      ${p.golesA != null 
        ? `Equipo Seba ${p.golesA}-${p.golesB} Equipo Heber`
        : "Sin jugar"
      }

      <br>

      ${
        admin 
        ? `<input value="${jugadores[i] || ""}" 
            placeholder="MVP"
            onchange="editarMVP(${i}, this.value)">`
        : `MVP: ${jugadores[i] || "-"}`
      }
    </div>
  `).join("");
}

function renderRanking(){
  let count={};

  jugadores.forEach(j=>{
    if(!j) return;
    count[j]=(count[j]||0)+1;
  });

  rankingContenido.innerHTML = Object.entries(count)
    .sort((a,b)=>b[1]-a[1])
    .map(([n,c])=>`<div class="fila">${n} - ${c}</div>`)
    .join("");
}

function renderPlanteles() {

  listaA.innerHTML = planteles.A.map((j,i) => `
    <div class="fila">
      ${admin ? `
        <input value="${j}" onchange="editarJugador('A',${i},this.value)">
        <button onclick="eliminarJugador('A',${i})">❌</button>
      ` : j}
    </div>
  `).join("");

  listaB.innerHTML = planteles.B.map((j,i) => `
    <div class="fila">
      ${admin ? `
        <input value="${j}" onchange="editarJugador('B',${i},this.value)">
        <button onclick="eliminarJugador('B',${i})">❌</button>
      ` : j}
    </div>
  `).join("");
}

window.editarMVP = (index, valor) => {
  jugadores[index] = valor || "";
  guardar();
};

window.toggleEquipo = (equipo) => {
  const lista = document.getElementById("lista" + equipo);

  if (lista.style.display === "block") {
    lista.style.display = "none";
  } else {
    lista.style.display = "block";
  }
};

window.editarJugador = (equipo, index, valor) => {
  planteles[equipo][index] = valor;
  guardar();
};

window.eliminarJugador = (equipo, index) => {
  planteles[equipo].splice(index, 1);
  guardar();
};

/* INIT */
cargarDatos();

