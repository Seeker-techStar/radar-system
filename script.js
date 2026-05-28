const canvas =
  document.getElementById("radar");

const ctx =
  canvas.getContext("2d");

/* RESIZE */

let cx = 0;
let cy = 0;

function resizeRadar(){

  const size =
    Math.min(
      window.innerWidth,
      window.innerHeight
    ) * 0.95;

  canvas.width = size;
  canvas.height = size;

  cx =
    canvas.width / 2;

  cy =
    canvas.height / 2;

}

resizeRadar();

window.addEventListener(
  "resize",
  resizeRadar
);

/* RADAR */

let angle = 0;
let pulse = 0;

/* FIREBASE */

const firebaseConfig = {

  apiKey:
  "AIzaSyBdgLpGGlr-OaTJRQu62HwO1b_PJAoQqp4",

  authDomain:
  "radarsystem-8475f.firebaseapp.com",

  projectId:
  "radarsystem-8475f",

  storageBucket:
  "radarsystem-8475f.firebasestorage.app",

  messagingSenderId:
  "914143995056",

  appId:
  "1:914143995056:web:df9b96174e3d279fbac775",

  measurementId:
  "G-KCE3GMEHRY"

};

firebase.initializeApp(
  firebaseConfig
);

const db =
  firebase.database();

/* PLAYER */

const playerCode =
  prompt(
    "ENTER YOUR CALLSIGN"
  ) || "UNKNOWN";

const squadCode =
  prompt(
    "ENTER SQUAD CODE"
  ) || "PUBLIC";

/* WEATHER */

const weatherKey =
  "aa84b92b3af4e4a431faab10d96d21eb";

/* STATS */

const statusText =
  document.getElementById(
    "statusText"
  );

const energyStat =
  document.getElementById(
    "energyStat"
  );

const tempStat =
  document.getElementById(
    "tempStat"
  );

const coreStat =
  document.getElementById(
    "coreStat"
  );

const coordX =
  document.getElementById(
    "coordX"
  );

const coordY =
  document.getElementById(
    "coordY"
  );

const speedStat =
  document.getElementById(
    "speedStat"
  );

const dirStat =
  document.getElementById(
    "dirStat"
  );

const lockStat =
  document.getElementById(
    "lockStat"
  );

const latStat =
  document.getElementById(
    "latStat"
  );

const lonStat =
  document.getElementById(
    "lonStat"
  );

const altStat =
  document.getElementById(
    "altStat"
  );

/* PLAYERS */

let onlinePlayers = [];
const onlineList =
  document.getElementById(
    "onlineList"
  );

let myLat = 0;
let myLon = 0;

/* CLICK */

canvas.addEventListener(
  "click",
  e=>{

    const scale =
      canvas.width / 700;

    const rect =
      canvas.getBoundingClientRect();

    const mouseX =
      e.clientX - rect.left;

    const mouseY =
      e.clientY - rect.top;

    onlinePlayers.forEach(player=>{

      const dx =
        (player.lon - myLon)
        * 50000;

      const dy =
        (player.lat - myLat)
        * -50000;

      const px =
        cx + dx * scale;

      const py =
        cy + dy * scale;

      const dist =
        Math.sqrt(
          (mouseX-px)*
          (mouseX-px)
          +
          (mouseY-py)*
          (mouseY-py)
        );

      if(dist < 20){

        onlinePlayers.forEach(
          p=>p.selected=false
        );

        player.selected = true;

      }

    });

  }
);

/* WEATHER */

async function updateWeather(){

  try{

    const response =
      await fetch(

        `https://api.openweathermap.org/data/2.5/weather?lat=${myLat}&lon=${myLon}&units=metric&appid=${weatherKey}`

      );

    const data =
      await response.json();

    tempStat.innerText =
      Math.round(
        data.main.temp
      ) + "°C";

    statusText.innerText =
      data.weather[0]
      .main.toUpperCase();

    speedStat.innerText =
      Math.round(
        data.wind.speed * 3.6
      ) + " km/h";

  }

  catch(err){

    console.log(err);

  }

}

/* DRAW RADAR */

function drawRadar(){

  const scale =
    canvas.width / 700;

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  /* NOISE */

  for(let i=0;i<20;i++){

    ctx.fillStyle =
      "rgba(255,255,255,0.03)";

    ctx.fillRect(

      Math.random()
      * canvas.width,

      Math.random()
      * canvas.height,

      Math.random()
      * 80
      * scale,

      1

    );

  }

  /* PULSE */

  pulse += 0.3 * scale;

  if(
    pulse > 330 * scale
  ){
    pulse = 0;
  }

  ctx.beginPath();

  ctx.arc(
    cx,
    cy,
    pulse,
    0,
    Math.PI*2
  );

  ctx.strokeStyle =
    `rgba(220,120,255,${
      1-pulse/(330*scale)
    })`;

  ctx.lineWidth =
    3 * scale;

  ctx.stroke();

  /* GRID */

  for(let i=1;i<=6;i++){

    ctx.beginPath();

    ctx.arc(
      cx,
      cy,
      i*55*scale,
      0,
      Math.PI*2
    );

    ctx.strokeStyle =
      "rgba(200,120,255,0.25)";

    ctx.stroke();

  }

  /* SWEEP */

  for(let i=0;i<40;i++){

    const a =
      angle - i*0.02;

    const x =
      cx +
      330*scale
      * Math.cos(a);

    const y =
      cy +
      330*scale
      * Math.sin(a);

    ctx.beginPath();

    ctx.moveTo(cx,cy);

    ctx.lineTo(x,y);

    ctx.strokeStyle =
      `rgba(220,120,255,${
        1-i/40
      })`;

    ctx.lineWidth =
      5 * scale;

    ctx.stroke();

  }

  /* PLAYERS */

  onlinePlayers.forEach(
    player=>{

      const dx =
        (player.lon - myLon)
        * 50000;

      const dy =
        (player.lat - myLat)
        * -50000;

      const distance =
        Math.sqrt(
          dx*dx + dy*dy
        );

      const px =
        cx + dx * scale;

      const py =
        cy + dy * scale;

      if(distance < 250){

        ctx.beginPath();

        ctx.arc(
          px,
          py,
          10*scale,
          0,
          Math.PI*2
        );

        ctx.fillStyle =
          "#00d5ff";

        ctx.shadowBlur =
          20*scale;

        ctx.shadowColor =
          "#00d5ff";

        ctx.fill();

        ctx.font =
          `${12*scale}px Orbitron`;

        ctx.fillStyle =
          "#00d5ff";

        ctx.fillText(
          player.name,
          px + 15*scale,
          py - 10*scale
        );

        if(player.selected){

          const pulseLock =
            (
              22 +
              Math.sin(
                Date.now()*0.01
              )*4
            ) * scale;

          ctx.beginPath();

          ctx.arc(
            px,
            py,
            pulseLock,
            0,
            Math.PI*2
          );

          ctx.strokeStyle =
            "#00d5ff";

          ctx.lineWidth =
            3*scale;

          ctx.stroke();

        }

      }

      else{

        const boxX =
          20 * scale;

        const boxY =
          canvas.height
          - 120*scale;

        ctx.fillStyle =
          "rgba(0,0,0,0.5)";

        ctx.fillRect(
          boxX,
          boxY,
          240*scale,
          80*scale
        );

        ctx.strokeStyle =
          "#00d5ff";

        ctx.strokeRect(
          boxX,
          boxY,
          240*scale,
          80*scale
        );

        ctx.font =
          `${14*scale}px Orbitron`;

        ctx.fillStyle =
          "#00d5ff";

        ctx.fillText(
          player.name,
          boxX + 15*scale,
          boxY + 25*scale
        );

        ctx.fillText(
          "REMOTE SIGNAL",
          boxX + 15*scale,
          boxY + 50*scale
        );

        ctx.fillText(
          `${player.lat.toFixed(2)} / ${player.lon.toFixed(2)}`,
          boxX + 15*scale,
          boxY + 70*scale
        );

      }

    }

  );

  /* CENTER */

  ctx.beginPath();

  ctx.arc(
    cx,
    cy,
    10*scale,
    0,
    Math.PI*2
  );

  ctx.fillStyle =
    "#cc88ff";

  ctx.fill();

  angle += 0.0025;

  requestAnimationFrame(
    drawRadar
  );

}

/* GPS */

navigator.geolocation.watchPosition(

  pos=>{

    myLat =
      pos.coords.latitude;

    myLon =
      pos.coords.longitude;

    latStat.innerText =
      myLat.toFixed(4);

    lonStat.innerText =
      myLon.toFixed(4);

    altStat.innerText =
      Math.floor(
        pos.coords.altitude || 0
      ) + " m";

    db.ref(
      "players/" + playerCode
    ).set({

      name:
        playerCode,

      squad:
        squadCode,

      lat:
        myLat,

      lon:
        myLon,

      updated:
        Date.now()

    });

  }

);

/* RECEIVE PLAYERS */

db.ref("players").on(

  "value",

  snapshot=>{

    onlinePlayers = [];

    const data =
      snapshot.val();

    if(!data){
      return;
    }

    for(let id in data){

      if(

        id !== playerCode

        &&

        data[id].squad === squadCode

      ){

        onlinePlayers.push({

          name:
            data[id].name,

          squad:
            data[id].squad,

          lat:
            data[id].lat,

          lon:
            data[id].lon,

          city:
            data[id].city || "UNKNOWN",

          selected:false

        });

      }

    }

    /* LIVE PANEL */

    onlineList.innerHTML = "";

    onlinePlayers.forEach(player=>{

      onlineList.innerHTML += `

      <div class="player-card">

        <div class="player-jet">
          ✈
        </div>

        <div class="player-info">

          <div class="player-name">
            ${player.name}
          </div>

          <div class="player-location">
            ${player.city}
          </div>

        </div>

      </div>

      `;

    });

  }

);

/* START */

updateWeather();

setInterval(
  updateWeather,
  60000
);

drawRadar();
