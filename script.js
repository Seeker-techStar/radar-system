const canvas =
  document.getElementById("radar");

const ctx =
  canvas.getContext("2d");

/* RADAR SIZE */

let cx = 0;
let cy = 0;

function resizeRadar(){

  const size =
    Math.min(
      window.innerWidth,
      window.innerHeight
    ) * 0.82;

  canvas.width = size;
  canvas.height = size;

  cx = canvas.width / 2;
  cy = canvas.height / 2;

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

  databaseURL:
  "https://radarsystem-8475f-default-rtdb.firebaseio.com",

  projectId:
  "radarsystem-8475f",

  storageBucket:
  "radarsystem-8475f.appspot.com",

  messagingSenderId:
  "914143995056",

  appId:
  "1:914143995056:web:df9b96174e3d279fbac775"

};

firebase.initializeApp(
  firebaseConfig
);

const db =
  firebase.database();

/* PLAYER */

const playerCode =

  (
    prompt(
      "ENTER YOUR CALLSIGN"
    ) || "UNKNOWN"
  )

  .trim()

  .toUpperCase();

const squadCode =

  (
    prompt(
      "ENTER SQUAD CODE"
    ) || "PUBLIC"
  )

  .trim()

  .toUpperCase();

/* WEATHER */

const weatherKey =
  "aa84b92b3af4e4a431faab10d96d21eb";

/* HUD */

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

const targetCount =
  document.getElementById(
    "targetCount"
  );

const onlineList =
  document.getElementById(
    "onlineList"
  );

/* PLAYER DATA */

let onlinePlayers = [];

let myLat = 0;
let myLon = 0;

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

    speedStat.innerText =
      Math.round(
        data.wind.speed * 3.6
      ) + " km/h";

    statusText.innerText =
      data.weather[0]
      .main
      .toUpperCase();

  }

  catch(err){

    console.log(err);

  }

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

    /* GET CITY */

    let cityName =
      "UNKNOWN";

    try{

      const cityRes =
        await fetch(

          `https://api.openweathermap.org/geo/1.0/reverse?lat=${myLat}&lon=${myLon}&limit=1&appid=${weatherKey}`

        );

      const cityData =
        await cityRes.json();

      if(
        cityData[0]
      ){

        cityName =
          cityData[0].name
          .toUpperCase();

      }

    }

    catch(err){

      console.log(err);

    }

    /* SEND PLAYER */

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

      city:
        cityName,

      updated:
        Date.now()

    });

  },

  err=>{

    console.log(err);

  },

  {

    enableHighAccuracy:true

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

        console.log(
          "PLAYER DETECTED",
          data[id]
        );

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
            data[id].city,

          selected:false

        });

      }

    }

    /* TARGET COUNT */

    targetCount.innerText =
      onlinePlayers.length;

    /* ONLINE PILOTS PANEL */

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

          <div class="player-location">
            SQUAD : ${player.squad}
          </div>

        </div>

      </div>

      `;

    });

  }

);

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

  /* BACKGROUND NOISE */

  for(let i=0;i<20;i++){

    ctx.fillStyle =
      "rgba(255,255,255,0.02)";

    ctx.fillRect(

      Math.random()
      * canvas.width,

      Math.random()
      * canvas.height,

      Math.random()
      * 80,

      1

    );

  }

  /* PULSE */

  pulse += 0.25 * scale;

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
    Math.PI * 2
  );

  ctx.strokeStyle =
    `rgba(220,120,255,${
      1-pulse/(330*scale)
    })`;

  ctx.lineWidth = 3;

  ctx.stroke();

  /* GRID */

  for(let i=1;i<=6;i++){

    ctx.beginPath();

    ctx.arc(
      cx,
      cy,
      i * 55 * scale,
      0,
      Math.PI*2
    );

    ctx.strokeStyle =
      "rgba(200,120,255,0.2)";

    ctx.stroke();

  }

  /* SWEEP */

  for(let i=0;i<40;i++){

    const a =
      angle - i * 0.02;

    const x =
      cx +
      330 * scale *
      Math.cos(a);

    const y =
      cy +
      330 * scale *
      Math.sin(a);

    ctx.beginPath();

    ctx.moveTo(cx,cy);

    ctx.lineTo(x,y);

    ctx.strokeStyle =
      `rgba(220,120,255,${
        1-i/40
      })`;

    ctx.lineWidth = 4;

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

      const px =
        cx + dx * scale;

      const py =
        cy + dy * scale;

      ctx.beginPath();

      ctx.arc(
        px,
        py,
        10 * scale,
        0,
        Math.PI*2
      );

      ctx.fillStyle =
        "#00d5ff";

      ctx.shadowBlur =
        20;

      ctx.shadowColor =
        "#00d5ff";

      ctx.fill();

      ctx.font =
        `${12*scale}px Arial`;

      ctx.fillStyle =
        "#00d5ff";

      ctx.fillText(
        player.name,
        px + 15,
        py - 10
      );

    }
  );

  /* CENTER */

  ctx.beginPath();

  ctx.arc(
    cx,
    cy,
    10,
    0,
    Math.PI*2
  );

  ctx.fillStyle =
    "#cc88ff";

  ctx.fill();

  angle += 0.002;

  requestAnimationFrame(
    drawRadar
  );

}

/* START */

updateWeather();

setInterval(
  updateWeather,
  60000
);

drawRadar();
