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
  "YOUR_API_KEY",

  authDomain:
  "YOUR_PROJECT.firebaseapp.com",

  projectId:
  "YOUR_PROJECT",

  storageBucket:
  "YOUR_PROJECT.appspot.com",

  messagingSenderId:
  "XXXXXXXX",

  appId:
  "XXXXXXXX"

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
  "YOUR_OPENWEATHER_KEY";

/* ELEMENTS */

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

const speedStat =
  document.getElementById(
    "speedStat"
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

const onlineList =
  document.getElementById(
    "onlineList"
  );

/* PLAYERS */

let onlinePlayers = [];

let myLat = 0;
let myLon = 0;

/* CLICK TARGET */

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
          (mouseX-px)**
          2 +
          (mouseY-py)**
          2
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

        /* LOCK EFFECT */

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

          ctx.beginPath();

          ctx.moveTo(px-30,py);
          ctx.lineTo(px-15,py);

          ctx.moveTo(px+15,py);
          ctx.lineTo(px+30,py);

          ctx.moveTo(px,py-30);
          ctx.lineTo(px,py-15);

          ctx.moveTo(px,py+15);
          ctx.lineTo(px,py+30);

          ctx.stroke();

        }

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

  async pos=>{

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

    let cityName =
      "UNKNOWN";

    try{

      const geo =
        await fetch(

          `https://api.openweathermap.org/geo/1.0/reverse?lat=${myLat}&lon=${myLon}&limit=1&appid=${weatherKey}`

        );

      const geoData =
        await geo.json();

      if(geoData[0]){

        cityName =
          geoData[0].name;

      }

    }

    catch(err){

      console.log(err);

    }

    db.ref(
      "players/" + playerCode
    ).set({

      name:
        playerCode,

      squad:
        squadCode,

      city:
        cityName,

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
  data[id].squad === squadCode
){

        onlinePlayers.push({

          name:
            data[id].name,

          squad:
            data[id].squad,

          city:
            data[id].city,

          lat:
            data[id].lat,

          lon:
            data[id].lon,

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
  SQUAD : ${player.squad}
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
