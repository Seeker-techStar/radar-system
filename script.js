window.onload = () => {

  console.log("RADAR SYSTEM STARTED");

  /* =========================================
     DOM
  ========================================= */

  const canvas =
    document.getElementById("radar");

  if (!canvas) {
    console.error("Canvas radar introuvable");
    return;
  }

  const ctx =
    canvas.getContext("2d");

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

  const disconnectBtn =
    document.getElementById("disconnectBtn");

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

  if (!firebase.apps.length) {

    firebase.initializeApp(
      firebaseConfig
    );

  }

  const db =
    firebase.database();

  console.log(
    "Firebase connecté"
  );

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

  const isAdmin =
    playerCode === "STARSCREAM";

  console.log(
    "PLAYER =",
    playerCode
  );

  console.log(
    "SQUAD =",
    squadCode
  );

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
        Math.floor(altitude)
        + " m";
    }

    db.ref(
      "players/" + playerCode
    )

    .set({

      name:
        playerCode,

      squad:
        squadCode,

      lat:
        lat,

      lon:
        lon,

      updated:
        Date.now()

    })

    .then(() => {

      console.log(
        "PLAYER SAVED"
      );

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

        console.log(
          "GPS OK"
        );

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

  }

  /* =========================================
     READ PLAYERS
  ========================================= */

  db.ref("players").on(

    "value",

    snapshot => {

      const data =
        snapshot.val();

      onlinePlayers = [];

      if (!data) {
        return;
      }

      for (let id in data) {

        const p =
          data[id];

        if (!p) continue;

        const age =
          Date.now() -
          (p.updated || 0);

        /* remove offline */

        if (age > 60000) {
          continue;
        }

        const sameSquad =
          p.squad === squadCode;

        onlinePlayers.push({

          name:
            p.name || "UNKNOWN",

          squad:
            p.squad || "NO SQUAD",

          lat:
            p.lat || 0,

          lon:
            p.lon || 0,

          sameSquad:
            sameSquad,

          self:
            id === playerCode

        });

      }

      /* =========================================
         TARGET COUNT
      ========================================= */

      if (targetCount) {

        targetCount.innerText =
          onlinePlayers.length;

      }

      /* =========================================
         ONLINE PILOTS
      ========================================= */

      if (onlineList) {

        onlineList.innerHTML = "";

        onlinePlayers.forEach(player => {

          const color =
            player.sameSquad
            ? "#00d5ff"
            : "#ff4444";

          const label =
            player.self
            ? " (YOU)"
            : "";

          onlineList.innerHTML += `

            <div class="player-card">

              <div
                class="player-jet"
                style="
                  color:${color};
                "
              >
                ✈
              </div>

              <div class="player-info">

                <div
                  class="player-name"
                  style="
                    color:${color};
                  "
                >

                  ${player.name}${label}

                </div>

                <div style="
                  color:${color};
                  font-size:11px;
                  margin-top:4px;
                  letter-spacing:1px;
                ">

                  ✦ ${player.squad}

                </div>

              </div>

              ${

                isAdmin

                &&

                !player.self

                ?

                `

                <div
                  class="kick-btn"
                  onclick="kickPlayer('${player.name}')"
                >
                  ✖
                </div>

                `

                :

                ""

              }

            </div>

          `;

        });

      }

    }

  );

  /* =========================================
     ADMIN REMOVE PLAYER
  ========================================= */

  window.kickPlayer = function(name) {

    const confirmKick =
      confirm(
        "REMOVE " + name + " ?"
      );

    if (!confirmKick) {
      return;
    }

    db.ref(
      "players/" + name
    )

    .remove()

    .then(() => {

      console.log(
        name + " REMOVED"
      );

    });

  };

  /* =========================================
     DISCONNECT BUTTON
  ========================================= */

  if (disconnectBtn) {

    disconnectBtn.onclick = () => {

      db.ref(
        "players/" + playerCode
      )

      .remove()

      .then(() => {

        alert(
          "DISCONNECTED"
        );

        location.reload();

      });

    };

  }

  /* =========================================
     AUTO REMOVE
  ========================================= */

  window.addEventListener(

    "beforeunload",

    () => {

      db.ref(
        "players/" + playerCode
      ).remove();

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

      const radarRange = 0.02;

      const dx =
        (
          (player.lon - myLon)
          / radarRange
        )
        * (canvas.width / 2);

      const dy =
        (
          (player.lat - myLat)
          / radarRange
        )
        * -(canvas.height / 2);

      const px =
        cx + dx;

      const py =
        cy + dy;

      const dist =
        Math.sqrt(
          Math.pow(px - cx, 2)
          +
          Math.pow(py - cy, 2)
        );

      if (
        dist >
        canvas.width / 2.2
      ) {
        return;
      }

      const color =
        player.sameSquad
        ? "#00d5ff"
        : "#ff4444";

      ctx.beginPath();

      ctx.arc(
        px,
        py,
        player.self ? 10 : 7,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        color;

      ctx.shadowBlur =
        15;

      ctx.shadowColor =
        color;

      ctx.fill();

      ctx.font =
        "12px Arial";

      ctx.fillStyle =
        color;

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

    ctx.shadowBlur =
      25;

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
document
  .querySelectorAll(".box-header)
                    .forEach(header=>{
                      header.addEventListener(
                        "click",
                        ()=>{
                          const content =
                            header.nextElementSiblling;
                          content.classList.toggle(
                            "hidden"
                            );
                        }
                        );
                    });
  drawRadar();

};
