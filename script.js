window.onload = () => {

  console.log("RADAR SYSTEM STARTED");

  /* =========================================
     DOM
  ========================================= */

  const canvas = document.getElementById("radar");

  if (!canvas) {
    console.error("Canvas radar introuvable");
    return;
  }

  const ctx = canvas.getContext("2d");

  const onlineList =
    document.getElementById("onlineList");

  const targetCount =
    document.getElementById("targetCount");

  const latStat =
    document.getElementById("latStat");

  const lonStat =
    document.getElementById("lonStat");

  const altStat =
    document.getElementById("altStat");

  const statusText =
    document.getElementById("statusText");

  /* =========================================
     RADAR SIZE
  ========================================= */

  let cx = 0;
  let cy = 0;

  function resizeRadar() {

    const size = Math.min(
      window.innerWidth * 0.75,
      window.innerHeight * 0.82
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

  /* =========================================
     FIREBASE
  ========================================= */

  if (!window.firebase) {

    console.error("Firebase non chargé");

    return;
  }

  const firebaseConfig = {

    apiKey:
      "AIzaSyABz5zXmBbdzcaU92fRwRyjSlx3v6UD0E8",

    authDomain:
      "radarsystem-2c230.firebaseapp.com",

    databaseURL:
      "https://radarsystem-2c230-default-rtdb.europe-west1.firebasedatabase.app",

    projectId:
      "radarsystem-2c230",

    storageBucket:
      "radarsystem-2c230.firebasestorage.app",

    messagingSenderId:
      "741179182413",

    appId:
      "1:741179182413:web:cb930bd52f33527d3a3b04",

    measurementId:
      "G-BB01PEM4WE"

  };

  firebase.initializeApp(firebaseConfig);

  const db = firebase.database();

  console.log("Firebase connecté");

  /* =========================================
     PLAYER
  ========================================= */

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

  /* =========================================
     DATA
  ========================================= */

  let myLat = 0;
  let myLon = 0;

  let onlinePlayers = [];

  /* =========================================
     SAVE PLAYER
  ========================================= */

  function savePlayer(
    lat,
    lon,
    altitude = 0
  ) {

    myLat = lat;
    myLon = lon;

    if (latStat) {
      latStat.innerText =
        lat.toFixed(4);
    }

    if (lonStat) {
      lonStat.innerText =
        lon.toFixed(4);
    }

    if (altStat) {
      altStat.innerText =
        Math.floor(altitude) + " m";
    }

    db.ref(
      "players/" + playerCode
    )

    .set({

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

  /* =========================================
     GPS
  ========================================= */

  if (navigator.geolocation) {

    navigator.geolocation.watchPosition(

      pos => {

        console.log("GPS OK");

        savePlayer(

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

  /* =========================================
     READ PLAYERS
  ========================================= */

  db.ref("players").on(

    "value",

    snapshot => {

      const data = snapshot.val();

      console.log(
        "DATABASE =",
        data
      );

      onlinePlayers = [];

      if (!data) {

        console.log(
          "AUCUN JOUEUR"
        );

        return;
      }

      for (let id in data) {

        const p = data[id];

        if (!p) continue;

        /* affiche tous les joueurs */

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

      /* =========================================
         UI
      ========================================= */

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

  /* =========================================
     RADAR
  ========================================= */

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

      ctx.moveTo(
        cx,
        cy
      );

      ctx.lineTo(
        x,
        y
      );

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

      ctx.shadowColor =
        "#00d5ff";

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
      10,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      "#cc88ff";

    ctx.shadowBlur = 25;

    ctx.shadowColor =
      "#cc88ff";

    ctx.fill();

    /* STATUS */

    if (statusText) {

      statusText.innerText =
        "TRACKING "
        + onlinePlayers.length
        + " TARGET(S)";

    }

    angle += 0.003;

    requestAnimationFrame(
      drawRadar
    );

  }

  drawRadar();

};
