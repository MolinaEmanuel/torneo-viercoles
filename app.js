import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const equipoA = "Equipo SEBA";
const equipoB = "Equipo HEBER";

let admin = localStorage.getItem("admin") === "true";
let datos = [];
let jugadores = [];

// NAV
window.mostrarSeccion = (sec) => {
  ["inicio","historial","ranking"].forEach(s=>{
    document.getElementById(s).style.display = s===sec ? "block":"none";
  });
};

// LOGIN
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

// FECHAS
function generarFechas(){
  let fechas=[], actual=new Date("2026-04-01");
  while(fechas.length<18){
    if(actual.getDay()===3) fechas.push(new Date(actual));
    actual.setDate(actual.getDate()+1);
  }
  return fechas;
}

// FIREBASE
function cargarDatos(){
  const ref=doc(db,"torneo","datos");

  onSnapshot(ref,(docSnap)=>{
    if(docSnap.exists()){
      datos=docSnap.data().partidos;
      jugadores=docSnap.data().jugadores||[];
    } else {
      datos=generarFechas().map(f=>({
        fecha:f.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit'}),
        golesA:null,
        golesB:null
      }));
      jugadores=new Array(18).fill("");
      guardar();
    }
    renderAll();
  });
}

function guardar(){
  setDoc(doc(db,"torneo","datos"),{
    partidos:datos,
    jugadores:jugadores
  });
}

// RESULTADO
window.guardarResultado = (i)=>{
  let a=parseInt(document.getElementById("a"+i).value);
  let b=parseInt(document.getElementById("b"+i).value);
  if(isNaN(a)||isNaN(b)) return alert("Ingresá goles");

  datos[i].golesA=a;
  datos[i].golesB=b;
  guardar();
};

// MVP
window.guardarJugador=()=>{
  let jugados=datos.filter(p=>p.golesA!=null).length;
  if(jugados===0) return;

  let nombre=inputJugador.value;
  if(!nombre) return;

  jugadores[jugados-1]=nombre;
  guardar();
};

// RENDER
function renderAll(){
  renderPartidos();
  renderTabla();
  renderInfo();
  renderHistorial();
  renderRanking();
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
  let jugados=datos.filter(p=>p.golesA!=null).length;
  fechaActual.innerText="Fecha "+jugados;
  jugadorTexto.innerHTML="<b>"+(jugadores[jugados-1]||"-")+"</b>";
  adminJugador.style.display=admin?"block":"none";
}

function renderHistorial(){
  let html="";
  datos.forEach((p,i)=>{
    if(p.golesA==null) return;

    html+=`<div class="fila">
    Fecha ${i+1} (${p.fecha})<br>
    ${p.golesA}-${p.golesB}<br>
    MVP: ${jugadores[i]||"-"}
    </div>`;
  });
  historialContenido.innerHTML=html;
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

// INIT
cargarDatos();