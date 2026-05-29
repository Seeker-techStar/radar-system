window.onload = () => {

  /* ===================== INIT ===================== */

  console.log("SYSTEM START");

  /* ===================== CANVAS ===================== */

  const canvas = document.getElementById("radar");
  const ctx = canvas.getContext("2d");

  let cx = 0;
  let cy = 0;

  function resizeRadar() {
    const size = Math.min(
      window.innerWidth * 0.55,
      window.innerHeight * 0.82
    );

    canvas.width = size;
    canvas.height = size;

    cx = canvas.width / 2;
    cy = canvas.height / 2;
  }

  resizeRadar();
  window.addEventListener("resize", resizeRadar);

  /* ===================== FIREBASE ===================== */

  const firebaseConfig = {
    apiKey: "AIzaSyBdgLpGGlr-OaTJRQu62HwO1b_PJAoQqp4",
    authDomain: "radarsystem-8475f.firebaseapp.com",
    databaseURL: "https://radarsystem-8475f-default-rtdb.firebaseio.com",
    projectId: "radarsystem-8475f",
    storageBucket: "radarsystem-8475f.appspot.com",
    messagingSenderId: "914143995056",
    appId: "1:914143995056:web:df9b96174e3d279fbac775"
  };

  if (!window.firebase) {
    console.error("Firebase SDK NOT LOADED");
    return;
  }

  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  console.log("Firebase initialized");

  /* ===================== PLAYER ===================== */

  const playerCode = (prompt("ENTER YOUR CALLSIGN") || "UNKNOWN")
    .trim()
    .toUpperCase();

  const squadCode = (prompt("ENTER YOUR SQUAD") || "PUBLIC")
    .trim()
    .toUpperCase();

  console.log("PLAYER =", playerCode);
  console.log("SQUAD =", squadCode);

  /* ===================== UI ===================== */

  const onlineList = document.getElementById("onlineList");
  const targetCount = document.getElementById("targetCount");
  const latStat = document.getElementById("latStat");
  const lonStat = document.getElementById("lonStat");
  const altStat = document.getElementById("altStat");
  const statusText = document.getElementById("statusText");

  /* ===================== DATA ===================== */

  let myLat = 0;
  let myLon = 0;
  let onlinePlayers = [];

  /* ===================== GPS ===================== */

  if (!navigator.geolocation) {
    console.error("GEOLOCATION NOT SUPPORTED");
  } else {

    console.log("Starting GPS...");

    navigator.geolocation.watchPosition(
      pos => {

        myLat = pos.coords.latitude;
        myLon = pos.coords.longitude;

        console.log("GPS OK:", myLat, myLon);

        latStat.innerText = myLat.toFixed(4);
        lonStat.innerText = myLon.toFixed(4);
        altStat.innerText = Math.floor(pos.coords.altitude || 0) + " m";

        db.ref("players/" + playerCode).set({
          name: playerCode,
          squad: squadCode,
          lat: myLat,
          lon: myLon,
          updated: Date.now()
        });

      },
      err => {
        console.error("GPS ERROR:", err);
      },
      {
        enableHighAccuracy: true
      }
    );
  }

  /* ===================== FIREBASE READ ===================== */

  db.ref("players").on("value", snap => {

    const data = snap.val();
    console.log("FIREBASE DATA:", data);

    onlinePlayers = [];

    if (!data) return;

    for (let id in data) {

      const p = data[id];
      if (!p) continue;

      const squad = (p.squad || "").trim().toUpperCase();

      // TEST SAFE FILTER
      if (id !== playerCode && squad === squadCode) {

        onlinePlayers.push({
          name: p.name || "UNKNOWN",
          squad: squad,
          lat: p.lat || 0,
          lon: p.lon || 0
        });
      }
    }

    targetCount.innerText = onlinePlayers.length;

    onlineList.innerHTML = "";

    onlinePlayers.forEach(player => {
      onlineList.innerHTML += `
        <div class="player-card">
          <div class="player-jet">✈</div>
          <div class="player-info">
            <div class="player-name">${player.name}</div>
            <div style="color:#00d5ff;font-size:11px;margin-top:4px;">
              ✦ ${player.squad}
            </div>
          </div>
        </div>
      `;
    });

  });

  /* ===================== RADAR ===================== */

  let angle = 0;
  let pulse = 0;

  function drawRadar() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* glow */
    const glow = ctx.createRadialGradient(cx, cy, 50, cx, cy, canvas.width / 2);
    glow.addColorStop(0, "rgba(180,100,255,0.18)");
    glow.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, canvas.width / 2.2, 0, Math.PI * 2);
    ctx.fill();

    /* grid */
    for (let i = 1; i <= 6; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, i * (canvas.width / 14), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(200,120,255,0.22)";
      ctx.stroke();
    }

    /* pulse */
    pulse += 1.2;
    if (pulse > canvas.width / 2) pulse = 0;

    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(220,120,255,${1 - pulse / (canvas.width / 2)})`;
    ctx.stroke();

    /* sweep */
    for (let i = 0; i < 45; i++) {

      const a = angle - i * 0.02;

      const x = cx + (canvas.width / 2.2) * Math.cos(a);
      const y = cy + (canvas.width / 2.2) * Math.sin(a);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);

      ctx.strokeStyle = `rgba(220,120,255,${1 - i / 45})`;
      ctx.stroke();
    }

    /* players */
    onlinePlayers.forEach(player => {

      const dx = (player.lon - myLon) * 50000;
      const dy = (player.lat - myLat) * -50000;

      const px = cx + dx;
      const py = cy + dy;

      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#00d5ff";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#00d5ff";
      ctx.fill();

      ctx.shadowBlur = 0;

      ctx.fillStyle = "#00d5ff";
      ctx.font = "12px Arial";
      ctx.fillText(player.name, px + 12, py - 8);
    });

    /* center */
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#cc88ff";
    ctx.shadowBlur = 25;
    ctx.shadowColor = "#cc88ff";
    ctx.fill();
    ctx.shadowBlur = 0;

    statusText.innerText = `TRACKING ${onlinePlayers.length} TARGET(S)`;

    angle += 0.003;

    requestAnimationFrame(drawRadar);
  }

  drawRadar();
};
