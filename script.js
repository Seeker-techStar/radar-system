window.onload = () => {

  /* ===================== SAFE START ===================== */

  console.log("RADAR SCRIPT LOADED");

  /* ===================== DOM CHECK ===================== */

  const canvas = document.getElementById("radar");

  if (!canvas) {
    console.error("❌ Canvas #radar introuvable dans le HTML");
    return;
  }

  const ctx = canvas.getContext("2d");

  const onlineList = document.getElementById("onlineList");
  const targetCount = document.getElementById("targetCount");
  const latStat = document.getElementById("latStat");
  const lonStat = document.getElementById("lonStat");
  const altStat = document.getElementById("altStat");
  const statusText = document.getElementById("statusText");

  if (!ctx) {
    console.error("❌ Canvas context introuvable");
    return;
  }

  /* ===================== RESIZE ===================== */

  let cx = 0;
  let cy = 0;

  function resize() {
    const size = Math.min(window.innerWidth * 0.55, window.innerHeight * 0.82);

    canvas.width = size;
    canvas.height = size;

    cx = size / 2;
    cy = size / 2;
  }

  resize();
  window.addEventListener("resize", resize);

  /* ===================== FIREBASE ===================== */

  if (!window.firebase) {
    console.error("❌ Firebase non chargé");
    return;
  }

  const firebaseConfig = {
    apiKey: "AIzaSyBdgLpGGlr-OaTJRQu62HwO1b_PJAoQqp4",
    authDomain: "radarsystem-8475f.firebaseapp.com",
    databaseURL: "https://radarsystem-8475f-default-rtdb.firebaseio.com",
    projectId: "radarsystem-8475f",
    storageBucket: "radarsystem-8475f.appspot.com",
    messagingSenderId: "914143995056",
    appId: "1:914143995056:web:df9b96174e3d279fbac775"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  /* ===================== PLAYER ===================== */

  const playerCode = (prompt("CALLSIGN") || "UNKNOWN").trim().toUpperCase();
  const squadCode = (prompt("SQUAD") || "PUBLIC").trim().toUpperCase();

  console.log("PLAYER:", playerCode, squadCode);

  /* ===================== DATA ===================== */

  let myLat = 0;
  let myLon = 0;
  let onlinePlayers = [];

  /* ===================== GPS ===================== */

  if (!navigator.geolocation) {
    console.error("❌ Geolocation not supported");
  } else {

    console.log("GPS INIT...");

    navigator.geolocation.watchPosition(
      pos => {

        myLat = pos.coords.latitude;
        myLon = pos.coords.longitude;

        console.log("GPS OK", myLat, myLon);

        if (latStat) latStat.innerText = myLat.toFixed(4);
        if (lonStat) lonStat.innerText = myLon.toFixed(4);
        if (altStat) altStat.innerText = Math.floor(pos.coords.altitude || 0) + " m";

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

      if (id !== playerCode && squad === squadCode) {
        onlinePlayers.push({
          name: p.name || "UNKNOWN",
          squad,
          lat: p.lat || 0,
          lon: p.lon || 0
        });
      }
    }

    if (targetCount) targetCount.innerText = onlinePlayers.length;

    if (onlineList) {
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
    }

  });

  /* ===================== RADAR ===================== */

  let angle = 0;
  let pulse = 0;

  function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* grid */
    for (let i = 1; i <= 6; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, i * (canvas.width / 14), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(200,120,255,0.2)";
      ctx.stroke();
    }

    /* sweep */
    for (let i = 0; i < 45; i++) {

      const a = angle - i * 0.02;

      const x = cx + Math.cos(a) * (canvas.width / 2.2);
      const y = cy + Math.sin(a) * (canvas.width / 2.2);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);

      ctx.strokeStyle = `rgba(220,120,255,${1 - i / 45})`;
      ctx.stroke();
    }

    /* players */
    onlinePlayers.forEach(p => {

      const dx = (p.lon - myLon) * 50000;
      const dy = (p.lat - myLat) * -50000;

      const x = cx + dx;
      const y = cy + dy;

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#00d5ff";
      ctx.fill();

      ctx.fillText(p.name, x + 10, y);
    });

    /* center */
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#cc88ff";
    ctx.fill();

    if (statusText) {
      statusText.innerText = `TRACKING ${onlinePlayers.length}`;
    }

    angle += 0.003;

    requestAnimationFrame(draw);
  }

  draw();
};
