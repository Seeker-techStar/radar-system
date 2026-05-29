window.onload = () => {

  console.log("RADAR STARTED");

  /* ===================== DOM ===================== */

  const canvas = document.getElementById("radar");

  if (!canvas) {
    console.error("Canvas missing");
    return;
  }

  const ctx = canvas.getContext("2d");

  const onlineList = document.getElementById("onlineList");
  const targetCount = document.getElementById("targetCount");
  const latStat = document.getElementById("latStat");
  const lonStat = document.getElementById("lonStat");
  const altStat = document.getElementById("altStat");
  const statusText = document.getElementById("statusText");

  /* ===================== SIZE ===================== */

  function resize() {
    const size = Math.min(window.innerWidth * 0.6, window.innerHeight * 0.8);
    canvas.width = size;
    canvas.height = size;
  }

  resize();
  window.addEventListener("resize", resize);

  /* ===================== FIREBASE ===================== */

  if (!window.firebase) {
    console.error("Firebase not loaded");
    return;
  }

  firebase.initializeApp({
    apiKey: "AIzaSyBdgLpGGlr-OaTJRQu62HwO1b_PJAoQqp4",
    authDomain: "radarsystem-8475f.firebaseapp.com",
    databaseURL: "https://radarsystem-8475f-default-rtdb.firebaseio.com",
    projectId: "radarsystem-8475f",
    storageBucket: "radarsystem-8475f.appspot.com",
    messagingSenderId: "914143995056",
    appId: "1:914143995056:web:df9b96174e3d279fbac775"
  });

  const db = firebase.database();

  /* ===================== PLAYER ===================== */

  const playerCode = (prompt("CALLSIGN") || "UNKNOWN").trim().toUpperCase();
  const squadCode = (prompt("SQUAD") || "PUBLIC").trim().toUpperCase();

  console.log("PLAYER:", playerCode, squadCode);

  /* ===================== STATE ===================== */

  let myLat = 0;
  let myLon = 0;
  let players = [];

  /* ===================== SAFE GPS ===================== */

  function updateSelf(lat, lon) {

    myLat = lat;
    myLon = lon;

    if (latStat) latStat.innerText = lat.toFixed(4);
    if (lonStat) lonStat.innerText = lon.toFixed(4);

    db.ref("players/" + playerCode).set({
      name: playerCode,
      squad: squadCode,
      lat,
      lon,
      updated: Date.now()
    }).catch(err => console.error("DB WRITE ERROR", err));
  }

  if (navigator.geolocation) {

    navigator.geolocation.watchPosition(

      pos => {
        console.log("GPS OK");
        updateSelf(pos.coords.latitude, pos.coords.longitude);
      },

      err => {
        console.error("GPS ERROR", err);

        // fallback (radar reste visible)
        updateSelf(0, 0);
      },

      {
        enableHighAccuracy: true,
        timeout: 10000
      }

    );

  } else {
    console.error("GPS not supported");
  }

  /* ===================== FIREBASE READ ===================== */

  db.ref("players").on("value", snap => {

    const data = snap.val();
    players = [];

    console.log("DB SNAPSHOT:", data);

    if (!data) return;

    for (let id in data) {

      const p = data[id];
      if (!p) continue;

      const squad = (p.squad || "").trim().toUpperCase();

      if (id !== playerCode && squad === squadCode) {

        players.push({
          name: p.name || "UNKNOWN",
          lat: p.lat || 0,
          lon: p.lon || 0,
          squad
        });
      }
    }

    if (targetCount) targetCount.innerText = players.length;

    if (onlineList) {
      onlineList.innerHTML = "";
      players.forEach(p => {
        onlineList.innerHTML += `
          <div class="player-card">
            <div class="player-jet">✈</div>
            <div class="player-info">
              <div class="player-name">${p.name}</div>
              <div style="color:#00d5ff;font-size:11px;">✦ ${p.squad}</div>
            </div>
          </div>
        `;
      });
    }

  });

  /* ===================== RADAR LOOP ===================== */

  let angle = 0;

  function draw() {

    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    /* grid */
    for (let i = 1; i <= 6; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, i * (canvas.width / 14), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(180,120,255,0.2)";
      ctx.stroke();
    }

    /* sweep */
    for (let i = 0; i < 40; i++) {

      const a = angle - i * 0.02;

      const x = cx + Math.cos(a) * (canvas.width / 2.2);
      const y = cy + Math.sin(a) * (canvas.width / 2.2);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);

      ctx.strokeStyle = `rgba(220,120,255,${1 - i / 40})`;
      ctx.stroke();
    }

    /* players */
    players.forEach(p => {

      const dx = (p.lon - myLon) * 50000;
      const dy = (p.lat - myLat) * -50000;

      const x = cx + dx;
      const y = cy + dy;

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#00d5ff";
      ctx.fill();

      ctx.fillStyle = "#00d5ff";
      ctx.fillText(p.name, x + 8, y - 8);
    });

    /* center */
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#cc88ff";
    ctx.fill();

    if (statusText) {
      statusText.innerText = "TRACKING " + players.length;
    }

    angle += 0.003;

    requestAnimationFrame(draw);
  }

  draw();
};
