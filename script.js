window.onload = () => {

  console.log("RADAR SYSTEM START");

  /* =========================
     DOM
  ========================= */

  const canvas = document.getElementById("radar");

  if (!canvas) {
    console.error("Canvas radar introuvable");
    return;
  }

  const ctx = canvas.getContext("2d");

  const onlineList = document.getElementById("onlineList");
  const targetCount = document.getElementById("targetCount");
  const latStat = document.getElementById("latStat");
  const lonStat = document.getElementById("lonStat");
  const altStat = document.getElementById("altStat");
  const statusText = document.getElementById("statusText");

  /* =========================
     RADAR SIZE
  ========================= */

  let cx = 0;
  let cy = 0;

  function resizeRadar() {

    const size = Math.min(
      window.innerWidth * 0.6,
      window.innerHeight * 0.8
    );

    canvas.width = size;
    canvas.height = size;

    cx = size / 2;
    cy = size / 2;
  }

  resizeRadar();

  window.addEventListener(
    "resize",
    resizeRadar
  );

  /* =========================
     FIREBASE
  ========================= */

  if (!window.firebase) {
    console.error("Firebase non chargé");
    return;
  }

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

  firebase.initializeApp(firebaseConfig);

  const db = firebase.database();

  console.log("Firebase OK");

  /* =========================
     PLAYER
  ========================= */

  const playerCode = (
    prompt("ENTER CALLSIGN")
    || "UNKNOWN"
  )
  .trim()
  .toUpperCase();

  const squadCode = (
    prompt("ENTER SQUAD")
    || "PUBLIC"
  )
  .trim()
  .toUpperCase();

  console.log("PLAYER =", playerCode);
  console.log("SQUAD =", squadCode);

  /* =========================
     STATE
  ========================= */

  let myLat = 0;
  let myLon = 0;

  let onlinePlayers = [];

  /* =========================
     GPS
  ========================= */

  function updatePlayer(lat, lon, altitude = 0) {

    myLat = lat;
    myLon = lon;

    if (latStat) {
      latStat.innerText = lat.toFixed(4);
    }

    if (lonStat) {
      lonStat.innerText = lon.toFixed(4);
    }

    if (altStat) {
      altStat.innerText =
        Math.floor(altitude) + " m";
    }

    db.ref("players/" + playerCode).set({

      name: playerCode,

      squad: squadCode,

      lat: lat,

      lon: lon,

      updated: Date.now()

    })
    .then(() => {

      console.log("PLAYER SAVED");

    })
    .catch(err => {

      console.error(
        "FIREBASE WRITE ERROR",
        err
      );

    });

  }

  if (navigator.geolocation) {

    navigator.geolocation.watchPosition(

      pos => {

        console.log("GPS OK");

        updatePlayer(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.altitude || 0
        );

      },

      err => {

        console.error(
          "GPS ERROR",
          err
        );

        /* fallback */
        updatePlayer(0, 0, 0);

      },

      {

        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0

      }

    );

  } else {

    console.error(
      "Geolocation non supportée"
    );

  }

  /* =========================
     FIREBASE READ
  ========================= */

  db.ref("players").on(

    "value",

    snapshot => {

      const data =
        snapshot.val();

      console.log(
        "DATABASE =",
        data
      );

      onlinePlayers = [];

      if (!data) {
        return;
      }

      for (let id in data) {

        const p = data[id];

        if (!p) continue;

        /* TEST MODE :
           affiche TOUT
        */

        onlinePlayers.push({

          name:
            p.name || "UNKNOWN",

          squad:
            p.squad || "NO SQUAD",

          lat:
            p.lat || 0,

          lon:
            p.lon || 0

        });

      }

      console.log(
        "ONLINE PLAYERS =",
        onlinePlayers
      );

      /* =========================
         UI
      ========================= */

      if (targetCount) {

        targetCount.innerText =
          onlinePlayers.length;

      }

      if (onlineList) {

        onlineList.innerHTML = "";

        onlinePlayers.forEach(player => {

          onlineList.innerHTML += `

            <div class="player-card">

              <div class="player-jet">
                ✈
              </div>

              <div class="player-info">

                <div class="player-name">
                  ${player.name}
                </div>

                <div style="
                  color:#00d5ff;
                  font-size:11px;
                  margin-top:4px;
                  letter-spacing:1px;
                ">

                  ✦ ${player.squad}

                </div>

              </div>

            </div>

          `;

        });

      }

    }

  );

  /* =========================
     RADAR
  ========================= */

  let angle = 0;

  function drawRadar() {

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    /* GRID */

    for (let i = 1; i <= 6; i++) {

      ctx.beginPath();

      ctx.arc(

        cx,
        cy,

        i * (
          canvas.width / 14
        ),

        0,
        Math.PI * 2

      );

      ctx.strokeStyle =
        "rgba(200,120,255,0.2)";

      ctx.lineWidth = 1;

      ctx.stroke();

    }

    /* SWEEP */

    for (let i = 0; i < 45; i++) {

      const a =
        angle - i * 0.02;

      const x =
        cx +
        Math.cos(a)
        * (canvas.width / 2.2);

      const y =
        cy +
        Math.sin(a)
        * (canvas.width / 2.2);

      ctx.beginPath();

      ctx.moveTo(cx, cy);

      ctx.lineTo(x, y);

      ctx.strokeStyle =
        `rgba(220,120,255,${
          1 - i / 45
        })`;

      ctx.lineWidth = 3;

      ctx.stroke();

    }

    /* PLAYERS */

    onlinePlayers.forEach(player => {

      const dx =
        (player.lon - myLon)
        * 50000;

      const dy =
        (player.lat - myLat)
        * -50000;

      const px =
        cx + dx;

      const py =
        cy + dy;

      ctx.beginPath();

      ctx.arc(
        px,
        py,
        7,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        "#00d5ff";

      ctx.shadowBlur = 15;
      ctx.shadowColor = "#00d5ff";

      ctx.fill();

      ctx.font =
        "12px Arial";

      ctx.fillStyle =
        "#00d5ff";

      ctx.fillText(
        player.name,
        px + 10,
        py - 8
      );

    });

    /* CENTER */

    ctx.beginPath();

    ctx.arc(
      cx,
      cy,
      9,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      "#cc88ff";

    ctx.shadowBlur = 25;
    ctx.shadowColor = "#cc88ff";

    ctx.fill();

    /* STATUS */

    if (statusText) {

      statusText.innerText =
        "TRACKING " +
        onlinePlayers.length +
        " TARGET(S)";

    }

    angle += 0.003;

    requestAnimationFrame(
      drawRadar
    );

  }

  drawRadar();

};
