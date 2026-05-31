window.onload = () => {

  console.log("RADAR SYSTEM STARTED");

  const canvas = document.getElementById("radar");
  if (!canvas) { console.error("Canvas radar introuvable"); return; }

  const ctx = canvas.getContext("2d");
  const onlineList = document.getElementById("onlineList");
  const targetCount = document.getElementById("targetCount");
  const destDistance = document.getElementById("destDistance");
  const destDirection = document.getElementById("destDirection");
  const destStatus = document.getElementById("destStatus");
  const latStat = document.getElementById("latStat");
  const lonStat = document.getElementById("lonStat");
  const altStat = document.getElementById("altStat");
  const statusText = document.getElementById("statusText");
  const disconnectBtn = document.getElementById("disconnectBtn");

  let cx = 0;
  let cy = 0;

  function resizeRadar() {
    const size = Math.min(window.innerWidth * 0.75, window.innerHeight * 0.82);
    canvas.width = size;
    canvas.height = size;
    cx = size / 2;
    cy = size / 2;
  }

  resizeRadar();
  window.addEventListener("resize", resizeRadar);

  if (!window.firebase) { console.error("Firebase non chargé"); return; }

  const firebaseConfig = {
    apiKey: "AIzaSyABz5zXmBbdzcaU92fRwRyjSlx3v6UD0E8",
    authDomain: "radarsystem-2c230.firebaseapp.com",
    databaseURL: "https://radarsystem-2c230-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "radarsystem-2c230",
    storageBucket: "radarsystem-2c230.firebasestorage.app",
    messagingSenderId: "741179182413",
    appId: "1:741179182413:web:cb930bd52f33527d3a3b04",
    measurementId: "G-BB01PEM4WE"
  };

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  console.log("Firebase connecté");

  const map = L.map("miniMap").setView([49.6116, 6.1319], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  let myMarker = null;

  const savedTarget = localStorage.getItem("customTarget");
  const TARGET = savedTarget ? JSON.parse(savedTarget) : {
    name: "LUXEMBOURG CITY",
    lat: 49.6116,
    lon: 6.1319
  };

  const targetMarker = L.circleMarker([TARGET.lat, TARGET.lon], {
    radius: 8,
    color: "#00ff88",
    fillColor: "#00ff88",
    fillOpacity: 0.8
  }).addTo(map).bindPopup("TARGET: " + TARGET.name);

  const savedCallsign = localStorage.getItem("callsign");
  const savedSquad = localStorage.getItem("squad");

  const playerCode = (
    prompt("ENTER CALLSIGN", savedCallsign || "") || "UNKNOWN"
  ).trim().toUpperCase();

  const squadCode = (
    prompt("ENTER SQUAD", savedSquad || "") || "PUBLIC"
  ).trim().toUpperCase();

  localStorage.setItem("callsign", playerCode);
  localStorage.setItem("squad", squadCode);

  const isAdmin = playerCode === "STARSCREAM";

  let myLat = 0;
  let myLon = 0;
  let onlinePlayers = [];

  function calcDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function calcDirection(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI/180) * Math.sin(lat2 * Math.PI/180) -
               Math.sin(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.cos(dLon);
    const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    const dirs = ["N","NE","E","SE","S","SW","W","NW"];
    return dirs[Math.round(bearing / 45) % 8];
  }

  function savePlayer(lat, lon, altitude = 0, speed = 0) {
    myLat = lat;
    myLon = lon;

    const distance = calcDistance(lat, lon, TARGET.lat, TARGET.lon);
    const direction = calcDirection(lat, lon, TARGET.lat, TARGET.lon);

    if (destDistance) destDistance.innerText = distance.toFixed(1) + " km";
    if (destDirection) destDirection.innerText = direction;
    if (destStatus) destStatus.innerText = distance < 1 ? "REACHED" : "TRACKING";

    if (!myMarker) {
      myMarker = L.circleMarker([lat, lon], {
        radius: 8,
        color: "#bb66ff",
        fillColor: "#bb66ff",
        fillOpacity: 0.9
      }).addTo(map).bindPopup(playerCode);
    } else {
      myMarker.setLatLng([lat, lon]);
    }

    map.setView([lat, lon], 13);

    if (latStat) latStat.innerText = lat.toFixed(5);
    if (lonStat) lonStat.innerText = lon.toFixed(5);
    if (altStat) altStat.innerText = Math.floor(altitude) + " m";

    const speedEl = document.getElementById("speedStat");
    if (speedEl) speedEl.innerText = (speed * 3.6).toFixed(1) + " km/h";

    db.ref("players/" + playerCode).set({
      name: playerCode,
      squad: squadCode,
      lat: lat,
      lon: lon,
      updated: Date.now()
    })
    .then(() => console.log("PLAYER SAVED"))
    .catch(err => console.error("FIREBASE WRITE ERROR", err));
  }

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      pos => {
        console.log("GPS OK");
        savePlayer(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.altitude || 0,
          pos.coords.speed || 0
        );
      },
      err => console.error("GPS ERROR", err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  db.ref("players").on("value", snapshot => {
    const data = snapshot.val();
    onlinePlayers = [];
    if (!data) return;

    for (let id in data) {
      const p = data[id];
      if (!p) continue;
      const age = Date.now() - (p.updated || 0);
      if (age > 60000) continue;
      const sameSquad = p.squad === squadCode;
      onlinePlayers.push({
        name: p.name || "UNKNOWN",
        squad: p.squad || "NO SQUAD",
        lat: p.lat || 0,
        lon: p.lon || 0,
        sameSquad: sameSquad,
        self: id === playerCode
      });
    }

    if (targetCount) targetCount.innerText = onlinePlayers.filter(p => !p.self).length;

    if (onlineList) {
      onlineList.innerHTML = "";
      onlinePlayers.forEach(player => {
        const color = player.self ? "#bb66ff" : player.sameSquad ? "#00d5ff" : "#ff4444";
        const label = player.self ? " (YOU)" : "";
        onlineList.innerHTML += `
          <div class="player-card">
            <div class="player-jet" style="color:${color}">✈</div>
            <div class="player-info">
              <div class="player-name" style="color:${color}">${player.name}${label}</div>
              <div style="color:${color}; font-size:11px; margin-top:4px; letter-spacing:1px;">✦ ${player.squad}</div>
            </div>
            ${isAdmin && !player.self ? `<div class="kick-btn" onclick="kickPlayer('${player.name}')">✖</div>` : ""}
          </div>
        `;
      });
    }
  });

  window.kickPlayer = function(name) {
    if (!confirm("REMOVE " + name + " ?")) return;
    db.ref("players/" + name).remove()
      .then(() => console.log(name + " REMOVED"));
  };

  if (disconnectBtn) {
    disconnectBtn.onclick = () => {
      db.ref("players/" + playerCode).remove()
        .then(() => { alert("DISCONNECTED"); location.reload(); });
    };
  }

  window.addEventListener("beforeunload", () => {
    db.ref("players/" + playerCode).remove();
  });

  /* =========================================
     RADAR DRAW
  ========================================= */

  let angle = 0;

  function drawRadar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 1; i <= 6; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, i * (canvas.width / 14), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(200,120,255,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(cx, cy - canvas.height / 2.2);
    ctx.lineTo(cx, cy + canvas.height / 2.2);
    ctx.moveTo(cx - canvas.width / 2.2, cy);
    ctx.lineTo(cx + canvas.width / 2.2, cy);
    ctx.strokeStyle = "rgba(200,120,255,0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();

    for (let i = 0; i < 45; i++) {
      const a = angle - i * 0.02;
      const x = cx + Math.cos(a) * (canvas.width / 2.2);
      const y = cy + Math.sin(a) * (canvas.width / 2.2);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.strokeStyle = `rgba(220,120,255,${1 - i / 45})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    const radarRange = 0.5;
    const tdx = ((TARGET.lon - myLon) / radarRange) * (canvas.width / 2);
    const tdy = ((TARGET.lat - myLat) / radarRange) * -(canvas.height / 2);
    const tpx = cx + tdx;
    const tpy = cy + tdy;
    const tdist = Math.sqrt(Math.pow(tpx - cx, 2) + Math.pow(tpy - cy, 2));

    if (tdist <= canvas.width / 2.2) {
      ctx.beginPath();
      ctx.arc(tpx, tpy, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#00ff88";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#00ff88";
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = "11px Arial";
      ctx.fillStyle = "#00ff88";
      ctx.fillText("TARGET", tpx + 10, tpy - 6);
    }

    onlinePlayers.forEach(player => {
      const radarRange = 0.02;
      const dx = ((player.lon - myLon) / radarRange) * (canvas.width / 2);
      const dy = ((player.lat - myLat) / radarRange) * -(canvas.height / 2);
      const px = cx + dx;
      const py = cy + dy;
      const dist = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2));
      if (dist > canvas.width / 2.2) return;

      const color = player.self ? "#cc88ff" : player.sameSquad ? "#00d5ff" : "#ff4444";

      ctx.beginPath();
      ctx.arc(px, py, player.self ? 10 : 7, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.font = "12px Arial";
      ctx.fillStyle = color;
      ctx.fillText(player.name, px + 10, py - 8);
    });

    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#cc88ff";
    ctx.shadowBlur = 25;
    ctx.shadowColor = "#cc88ff";
    ctx.fill();
    ctx.shadowBlur = 0;

    if (statusText) {
      statusText.innerText = "TRACKING " + onlinePlayers.filter(p => !p.self).length + " TARGET(S)";
    }

    angle += 0.003;
    requestAnimationFrame(drawRadar);
  }

  /* COLLAPSIBLE */
  document.querySelectorAll(".box-header").forEach(header => {
    header.addEventListener("click", () => {
      const content = header.nextElementSibling;
      if (content) content.classList.toggle("hidden");
    });
  });

  /* DRAG */
  document.querySelectorAll(".draggable").forEach((box, index) => {
    const saved = localStorage.getItem("panel_" + index);
    if (saved) {
      const pos = JSON.parse(saved);
      box.style.position = "fixed";
      box.style.left = pos.left;
      box.style.top = pos.top;
    }

    const header = box.querySelector(".box-header");
    if (!header) return;

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    header.addEventListener("mousedown", e => {
      isDragging = true;
      box.style.position = "fixed";
      box.style.zIndex = "9999";
      offsetX = e.clientX - box.getBoundingClientRect().left;
      offsetY = e.clientY - box.getBoundingClientRect().top;
    });

    document.addEventListener("mousemove", e => {
      if (!isDragging) return;
      box.style.left = (e.clientX - offsetX) + "px";
      box.style.top = (e.clientY - offsetY) + "px";
      localStorage.setItem("panel_" + index, JSON.stringify({
        left: box.style.left,
        top: box.style.top
      }));
    });

    document.addEventListener("mouseup", () => { isDragging = false; });
  });

  /* =========================================
     SET TARGET
  ========================================= */

  const targetCityEl = document.getElementById("targetCity");
  if (targetCityEl) targetCityEl.innerText = TARGET.name;

  const targetAddressInput = document.getElementById("targetAddressInput");
  const searchAddressBtn = document.getElementById("searchAddressBtn");
  const searchResult = document.getElementById("searchResult");
  const trackTargetBtn = document.getElementById("trackTargetBtn");

  let pendingTarget = null;

  if (searchAddressBtn) {
    searchAddressBtn.onclick = async () => {
      const address = targetAddressInput.value.trim();
      if (!address) return;

      searchResult.innerText = "SEARCHING...";
      trackTargetBtn.style.display = "none";

      const url = "https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(address);

      try {
        const res = await fetch(url, { headers: { "Accept-Language": "fr" } });
        const data = await res.json();

        if (!data || data.length === 0) {
          searchResult.innerText = "NOT FOUND";
          return;
        }

        const result = data[0];
        pendingTarget = {
          name: address.toUpperCase(),
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon)
        };

        searchResult.innerHTML = `
          <p style="color:#00ff88; font-size:11px; margin:6px 0;">
            LAT: ${pendingTarget.lat.toFixed(5)}<br/>
            LON: ${pendingTarget.lon.toFixed(5)}
          </p>
        `;

        trackTargetBtn.style.display = "block";

      } catch(err) {
        searchResult.innerText = "ERROR: " + err.message;
      }
    };
  }

  if (trackTargetBtn) {
    trackTargetBtn.onclick = () => {
      if (!pendingTarget) return;

      TARGET.name = pendingTarget.name;
      TARGET.lat = pendingTarget.lat;
      TARGET.lon = pendingTarget.lon;

      localStorage.setItem("customTarget", JSON.stringify(TARGET));

      if (targetCityEl) targetCityEl.innerText = TARGET.name;
      if (destStatus) destStatus.innerText = "TRACKING";

      targetMarker.setLatLng([TARGET.lat, TARGET.lon]);
      targetMarker.setPopupContent("TARGET: " + TARGET.name);

      searchResult.innerHTML = `<p style="color:#00d5ff; font-size:11px;">✔ TARGET LOCKED</p>`;
      trackTargetBtn.style.display = "none";

      console.log("TARGET LOCKED:", TARGET);
    };
  }

  /* =========================================
     SEEKER MODE
  ========================================= */

  const seekerMode = document.getElementById("seekerMode");
  const enterSeekerBtn = document.getElementById("enterSeekerBtn");
  const exitSeekerBtn = document.getElementById("exitSeekerBtn");
  const seekerCanvas = document.getElementById("seekerRadar");
  const seekerCtx = seekerCanvas.getContext("2d");
  let seekerActive = false;
  let seekerAngle = 0;
  let seekerCx = 0;
  let seekerCy = 0;

  function resizeSeeker() {
    const size = Math.min(window.innerWidth * 0.7, window.innerHeight * 0.65);
    seekerCanvas.width = size;
    seekerCanvas.height = size;
    seekerCx = size / 2;
    seekerCy = size / 2;
  }

  function calcBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI/180) * Math.sin(lat2 * Math.PI/180) -
               Math.sin(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.cos(dLon);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  function getInstruction(bearing) {
    const b = bearing;
    if (b < 15 || b > 345) return "▲ GO STRAIGHT";
    if (b < 80)  return "↗ TURN RIGHT — " + Math.round(b) + "°";
    if (b < 100) return "▶ TURN RIGHT";
    if (b < 170) return "↘ BEAR RIGHT — " + Math.round(b) + "°";
    if (b < 190) return "▼ U-TURN";
    if (b < 260) return "↙ BEAR LEFT — " + Math.round(360 - b) + "°";
    if (b < 280) return "◀ TURN LEFT";
    return "↖ TURN LEFT — " + Math.round(360 - b) + "°";
  }

  function drawSeekerRadar() {
    if (!seekerActive) return;

    seekerCtx.clearRect(0, 0, seekerCanvas.width, seekerCanvas.height);

    for (let i = 1; i <= 6; i++) {
      seekerCtx.beginPath();
      seekerCtx.arc(seekerCx, seekerCy, i * (seekerCanvas.width / 14), 0, Math.PI * 2);
      seekerCtx.strokeStyle = "rgba(255,34,68,0.2)";
      seekerCtx.lineWidth = 1;
      seekerCtx.stroke();
    }

    seekerCtx.beginPath();
    seekerCtx.moveTo(seekerCx, seekerCy - seekerCanvas.height / 2.2);
    seekerCtx.lineTo(seekerCx, seekerCy + seekerCanvas.height / 2.2);
    seekerCtx.moveTo(seekerCx - seekerCanvas.width / 2.2, seekerCy);
    seekerCtx.lineTo(seekerCx + seekerCanvas.width / 2.2, seekerCy);
    seekerCtx.strokeStyle = "rgba(255,34,68,0.2)";
    seekerCtx.lineWidth = 1;
    seekerCtx.stroke();

    for (let i = 0; i < 45; i++) {
      const a = seekerAngle - i * 0.02;
      const x = seekerCx + Math.cos(a) * (seekerCanvas.width / 2.2);
      const y = seekerCy + Math.sin(a) * (seekerCanvas.width / 2.2);
      seekerCtx.beginPath();
      seekerCtx.moveTo(seekerCx, seekerCy);
      seekerCtx.lineTo(x, y);
      seekerCtx.strokeStyle = `rgba(255,34,68,${1 - i / 45})`;
      seekerCtx.lineWidth = 3;
      seekerCtx.stroke();
    }

    const radarRange = 0.5;
    const tdx = ((TARGET.lon - myLon) / radarRange) * (seekerCanvas.width / 2);
    const tdy = ((TARGET.lat - myLat) / radarRange) * -(seekerCanvas.height / 2);
    const tpx = seekerCx + tdx;
    const tpy = seekerCy + tdy;
    const tdist = Math.sqrt(Math.pow(tpx - seekerCx, 2) + Math.pow(tpy - seekerCy, 2));

    if (tdist <= seekerCanvas.width / 2.2) {
      seekerCtx.beginPath();
      seekerCtx.arc(tpx, tpy, 8, 0, Math.PI * 2);
      seekerCtx.fillStyle = "#00ff88";
      seekerCtx.shadowBlur = 15;
      seekerCtx.shadowColor = "#00ff88";
      seekerCtx.fill();
      seekerCtx.shadowBlur = 0;
      seekerCtx.font = "11px Arial";
      seekerCtx.fillStyle = "#00ff88";
      seekerCtx.fillText("TARGET", tpx + 10, tpy - 6);
    }

    onlinePlayers.forEach(player => {
      if (player.self) return;
      const range = 0.02;
      const dx = ((player.lon - myLon) / range) * (seekerCanvas.width / 2);
      const dy = ((player.lat - myLat) / range) * -(seekerCanvas.height / 2);
      const px = seekerCx + dx;
      const py = seekerCy + dy;
      const dist = Math.sqrt(Math.pow(px - seekerCx, 2) + Math.pow(py - seekerCy, 2));
      if (dist > seekerCanvas.width / 2.2) return;

      const color = player.sameSquad ? "#00d5ff" : "#ff4444";
      seekerCtx.beginPath();
      seekerCtx.arc(px, py, 7, 0, Math.PI * 2);
      seekerCtx.fillStyle = color;
      seekerCtx.shadowBlur = 12;
      seekerCtx.shadowColor = color;
      seekerCtx.fill();
      seekerCtx.shadowBlur = 0;
      seekerCtx.font = "11px Arial";
      seekerCtx.fillStyle = color;
      seekerCtx.fillText(player.name, px + 9, py - 6);
    });

    seekerCtx.beginPath();
    seekerCtx.arc(seekerCx, seekerCy, 10, 0, Math.PI * 2);
    seekerCtx.fillStyle = "#ff2244";
    seekerCtx.shadowBlur = 25;
    seekerCtx.shadowColor = "#ff2244";
    seekerCtx.fill();
    seekerCtx.shadowBlur = 0;

    const bearing = calcBearing(myLat, myLon, TARGET.lat, TARGET.lon);
    const distance = calcDistance(myLat, myLon, TARGET.lat, TARGET.lon);
    const direction = calcDirection(myLat, myLon, TARGET.lat, TARGET.lon);

    const seekerBearingEl = document.getElementById("seekerBearing");
    const seekerDistanceEl = document.getElementById("seekerDistance");
    const seekerDirectionEl = document.getElementById("seekerDirection");
    const seekerStatusEl = document.getElementById("seekerStatus");
    const seekerInstructionEl = document.getElementById("seekerInstruction");
    const seekerTargetEl = document.getElementById("seekerTarget");

    if (seekerBearingEl) seekerBearingEl.innerText = Math.round(bearing) + "°";
    if (seekerDistanceEl) seekerDistanceEl.innerText = distance.toFixed(1) + " km";
    if (seekerDirectionEl) seekerDirectionEl.innerText = direction;
    if (seekerStatusEl) seekerStatusEl.innerText = distance < 0.05 ? "REACHED" : "TRACKING";
    if (seekerInstructionEl) seekerInstructionEl.innerText = getInstruction(bearing);
    if (seekerTargetEl) seekerTargetEl.innerText = TARGET.name;

    seekerAngle += 0.003;
    requestAnimationFrame(drawSeekerRadar);
  }

  if (enterSeekerBtn) {
    enterSeekerBtn.onclick = () => {
      seekerActive = false;
      seekerMode.style.display = "block";

      const intro = document.getElementById("seekerIntro");
      const fill = document.getElementById("introFill");
      const introText = document.getElementById("introText");
      const seekerHud = document.querySelector(".seeker-hud");

      intro.style.display = "flex";
      seekerHud.style.display = "none";
      fill.style.width = "0%";

      const messages = [
        "SEEKER MODE INITIALIZING...",
        "LOADING RADAR SYSTEMS...",
        "ACQUIRING GPS SIGNAL...",
        "TARGET LOCKED...",
        "ENGAGING SEEKER MODE..."
      ];

      let progress = 0;
      let msgIndex = 0;

      const interval = setInterval(() => {
        progress += 2;
        fill.style.width = progress + "%";

        if (progress % 20 === 0 && msgIndex < messages.length) {
          introText.innerText = messages[msgIndex];
          msgIndex++;
        }

        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            intro.style.display = "none";
            seekerHud.style.display = "flex";
            seekerActive = true;
            resizeSeeker();
            drawSeekerRadar();
          }, 400);
        }
      }, 30);
    };
  }

  if (exitSeekerBtn) {
    exitSeekerBtn.onclick = () => {
      seekerActive = false;
      seekerMode.style.display = "none";
    };
  }

  window.addEventListener("resize", () => {
    if (seekerActive) resizeSeeker();
  });

  /* =========================================
     CHILL MODE
  ========================================= */

  const chillMode = document.getElementById("chillMode");
  const enterChillBtn = document.getElementById("enterChillBtn");
  const exitChillBtn = document.getElementById("exitChillBtn");
  const chillRadarCanvas = document.getElementById("chillRadar");
  const chillRadarCtx = chillRadarCanvas ? chillRadarCanvas.getContext("2d") : null;
  const musicVisualizer = document.getElementById("musicVisualizer");
  const musicCtx = musicVisualizer ? musicVisualizer.getContext("2d") : null;

  let chillActive = false;
  let chillAngle = 0;
  let chillStartTime = null;
  let chillDistanceTotal = 0;
  let chillLastLat = null;
  let chillLastLon = null;
  let audioContext = null;
  let analyser = null;
  let dataArray = null;
  let chillRadarCx = 90;
  let chillRadarCy = 90;

  const particles = Array.from({length: 35}, () => ({
    x: Math.random() * 800,
    y: Math.random() * 400,
    vx: (Math.random()-0.5) * 0.5,
    vy: (Math.random()-0.5) * 0.5,
    r: Math.random() * 1.5 + 0.5,
    phase: Math.random() * Math.PI * 2
  }));

  function resizeChillRadar() {
    if (!chillRadarCanvas) return;
    chillRadarCanvas.width = 180;
    chillRadarCanvas.height = 180;
    chillRadarCx = 90;
    chillRadarCy = 90;
  }

  function resizeVisualizer() {
    if (!musicVisualizer) return;
    musicVisualizer.width = musicVisualizer.offsetWidth;
    musicVisualizer.height = musicVisualizer.offsetHeight;
  }

  function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return String(h).padStart(2,"0") + ":" +
           String(m % 60).padStart(2,"0") + ":" +
           String(s % 60).padStart(2,"0");
  }

  async function fetchTemp(lat, lon) {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
      );
      const data = await res.json();
      return data.current_weather.temperature + "°C";
    } catch(e) {
      return "--°C";
    }
  }

  function drawChillRadar() {
    if (!chillActive || !chillRadarCtx) return;

    chillRadarCtx.clearRect(0, 0, 180, 180);

    for (let i = 1; i <= 4; i++) {
      chillRadarCtx.beginPath();
      chillRadarCtx.arc(chillRadarCx, chillRadarCy, i * 20, 0, Math.PI * 2);
      chillRadarCtx.strokeStyle = "rgba(0,213,255,0.15)";
      chillRadarCtx.lineWidth = 1;
      chillRadarCtx.stroke();
    }

    for (let i = 0; i < 30; i++) {
      const a = chillAngle - i * 0.03;
      const x = chillRadarCx + Math.cos(a) * 85;
      const y = chillRadarCy + Math.sin(a) * 85;
      chillRadarCtx.beginPath();
      chillRadarCtx.moveTo(chillRadarCx, chillRadarCy);
      chillRadarCtx.lineTo(x, y);
      chillRadarCtx.strokeStyle = `rgba(0,213,255,${1 - i / 30})`;
      chillRadarCtx.lineWidth = 2;
      chillRadarCtx.stroke();
    }

    onlinePlayers.forEach(player => {
      if (player.self) return;
      const range = 0.02;
      const dx = ((player.lon - myLon) / range) * 85;
      const dy = ((player.lat - myLat) / range) * -85;
      const px = chillRadarCx + dx;
      const py = chillRadarCy + dy;
      const dist = Math.sqrt(Math.pow(px - chillRadarCx, 2) + Math.pow(py - chillRadarCy, 2));
      if (dist > 85) return;
      const color = player.sameSquad ? "#00d5ff" : "#ff4444";
      chillRadarCtx.beginPath();
      chillRadarCtx.arc(px, py, 4, 0, Math.PI * 2);
      chillRadarCtx.fillStyle = color;
      chillRadarCtx.shadowBlur = 8;
      chillRadarCtx.shadowColor = color;
      chillRadarCtx.fill();
      chillRadarCtx.shadowBlur = 0;
    });

    chillRadarCtx.beginPath();
    chillRadarCtx.arc(chillRadarCx, chillRadarCy, 6, 0, Math.PI * 2);
    chillRadarCtx.fillStyle = "#00d5ff";
    chillRadarCtx.shadowBlur = 12;
    chillRadarCtx.shadowColor = "#00d5ff";
    chillRadarCtx.fill();
    chillRadarCtx.shadowBlur = 0;

    chillAngle += 0.015;
  }

  function drawVisualizer() {
    if (!chillActive || !musicCtx) return;

    const W = musicVisualizer.width;
    const H = musicVisualizer.height;

    musicCtx.fillStyle = "rgba(5,2,10,0.22)";
    musicCtx.fillRect(0, 0, W, H);

    musicCtx.strokeStyle = "rgba(74,0,128,0.1)";
    musicCtx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) {
      musicCtx.beginPath(); musicCtx.moveTo(x,0); musicCtx.lineTo(x,H); musicCtx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      musicCtx.beginPath(); musicCtx.moveTo(0,y); musicCtx.lineTo(W,y); musicCtx.stroke();
    }

    const bars = 48;
    const bw = W / bars;

    for (let i = 0; i < bars; i++) {
      let v;
      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        v = dataArray[i] / 255;
      } else {
        v = 0.2 + 0.55 * Math.abs(Math.sin(i * 0.4 + chillAngle * 2.5))
                + 0.25 * Math.abs(Math.sin(i * 0.9 + chillAngle * 1.5));
      }

      const bh = v * (H * 0.40);

      const g1 = musicCtx.createLinearGradient(0, H/2 - bh, 0, H/2);
      g1.addColorStop(0, `rgba(204,0,34,${v*0.95})`);
      g1.addColorStop(0.4, `rgba(140,0,60,${v*0.8})`);
      g1.addColorStop(1, `rgba(74,0,128,0.15)`);
      musicCtx.fillStyle = g1;
      musicCtx.fillRect(i*bw+1, H/2 - bh, bw-2, bh);

      const g2 = musicCtx.createLinearGradient(0, H/2, 0, H/2 + bh*0.5);
      g2.addColorStop(0, `rgba(74,0,128,${v*0.5})`);
      g2.addColorStop(1, `rgba(26,26,46,0.05)`);
      musicCtx.fillStyle = g2;
      musicCtx.fillRect(i*bw+1, H/2, bw-2, bh*0.5);

      if (v > 0.55) {
        musicCtx.fillStyle = `rgba(255,30,60,${v})`;
        musicCtx.fillRect(i*bw+1, H/2 - bh - 2, bw-2, 2);
      }

      musicCtx.fillStyle = `rgba(180,185,200,${v*0.08})`;
      musicCtx.fillRect(i*bw, H/2 - bh, 1, bh);
    }

    musicCtx.beginPath();
    musicCtx.moveTo(0, H/2);
    musicCtx.lineTo(W, H/2);
    musicCtx.strokeStyle = "rgba(102,0,17,0.6)";
    musicCtx.lineWidth = 1;
    musicCtx.stroke();

    musicCtx.beginPath();
    for (let x = 0; x < W; x++) {
      const nx = x / W;
      const y = H/2
        + Math.sin(nx * Math.PI * 6 + chillAngle * 3) * H * 0.07
        + Math.sin(nx * Math.PI * 13 + chillAngle * 5) * H * 0.035
        + Math.sin(nx * Math.PI * 2.5 + chillAngle) * H * 0.055;
      x === 0 ? musicCtx.moveTo(x, y) : musicCtx.lineTo(x, y);
    }
    musicCtx.strokeStyle = "rgba(140,0,200,0.45)";
    musicCtx.lineWidth = 1.5;
    musicCtx.stroke();

    musicCtx.beginPath();
    for (let x = 0; x < W; x++) {
      const nx = x / W;
      const y = H/2
        + Math.sin(nx * Math.PI * 4 + chillAngle * 2 + 1) * H * 0.04
        + Math.sin(nx * Math.PI * 9 + chillAngle * 4) * H * 0.02;
      x === 0 ? musicCtx.moveTo(x, y) : musicCtx.lineTo(x, y);
    }
    musicCtx.strokeStyle = "rgba(160,165,180,0.12)";
    musicCtx.lineWidth = 1;
    musicCtx.stroke();

    particles.forEach(p => {
      const energy = 0.3 + 0.7 * Math.abs(Math.sin(p.phase + chillAngle * 2));
      p.x += p.vx * (1 + energy * 0.4);
      p.y += p.vy * (1 + energy * 0.4);
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      const isRed = p.phase < Math.PI;
      musicCtx.beginPath();
      musicCtx.arc(p.x, p.y, p.r * (0.5 + energy), 0, Math.PI * 2);
      musicCtx.fillStyle = isRed
        ? `rgba(180,0,30,${0.2 + energy*0.35})`
        : `rgba(74,0,128,${0.2 + energy*0.3})`;
      musicCtx.fill();
    });

    const cs = 20;
    musicCtx.strokeStyle = "rgba(204,0,34,0.6)";
    musicCtx.lineWidth = 1.5;
    [[0,0,1,1],[W,0,-1,1],[0,H,1,-1],[W,H,-1,-1]].forEach(([x,y,dx,dy]) => {
      musicCtx.beginPath();
      musicCtx.moveTo(x + dx*cs, y);
      musicCtx.lineTo(x, y);
      musicCtx.lineTo(x, y + dy*cs);
      musicCtx.stroke();
    });

    const sl = (chillAngle * 55) % H;
    musicCtx.fillStyle = "rgba(204,0,34,0.035)";
    musicCtx.fillRect(0, sl, W, 2);

    musicCtx.font = "9px Arial";
    musicCtx.fillStyle = "rgba(204,0,34,0.4)";
    musicCtx.fillText("SEEKER AUDIO SYS", 8, H - 8);
  }

  function chillLoop() {
    if (!chillActive) return;

    drawChillRadar();
    drawVisualizer();

    const elapsed = Date.now() - chillStartTime;
    const chronoEl = document.getElementById("chillChrono");
    if (chronoEl) chronoEl.innerText = formatTime(elapsed);

    const speedEl = document.getElementById("speedStat");
    const chillSpeedEl = document.getElementById("chillSpeed");
    if (chillSpeedEl && speedEl) chillSpeedEl.innerText = speedEl.innerText;

    if (chillLastLat && myLat !== 0) {
      const d = calcDistance(chillLastLat, chillLastLon, myLat, myLon);
      if (d > 0.005) {
        chillDistanceTotal += d;
        chillLastLat = myLat;
        chillLastLon = myLon;
      }
    }

    const chillDistEl = document.getElementById("chillDist");
    if (chillDistEl) chillDistEl.innerText = chillDistanceTotal.toFixed(2) + " km";

    const chillTimeEl = document.getElementById("chillTime");
    if (chillTimeEl) {
      const now = new Date();
      chillTimeEl.innerText = String(now.getHours()).padStart(2,"0") + ":" +
                              String(now.getMinutes()).padStart(2,"0") + ":" +
                              String(now.getSeconds()).padStart(2,"0");
    }

    chillAngle += 0.012;
    requestAnimationFrame(chillLoop);
  }

  async function startAudio() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new AudioContext();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      console.log("AUDIO OK");
    } catch(e) {
      console.warn("AUDIO DENIED — mode idle");
    }
  }

  if (enterChillBtn) {
    enterChillBtn.onclick = async () => {
      chillActive = true;
      chillStartTime = Date.now();
      chillDistanceTotal = 0;
      chillLastLat = myLat;
      chillLastLon = myLon;

      chillMode.style.display = "block";
      resizeChillRadar();
      resizeVisualizer();

      await startAudio();

      if (myLat !== 0) {
        const temp = await fetchTemp(myLat, myLon);
        const tempEl = document.getElementById("chillTemp");
        if (tempEl) tempEl.innerText = temp;
      }

      chillLoop();
    };
  }

  if (exitChillBtn) {
    exitChillBtn.onclick = () => {
      chillActive = false;
      chillMode.style.display = "none";
      if (audioContext) {
        audioContext.close();
        audioContext = null;
        analyser = null;
      }
    };
  }

  drawRadar();
const enterFreeBtn =
document.getElementById("enterFreeBtn");

const exitFreeBtn =
document.getElementById("exitFreeBtn");

const freeMode =
document.getElementById("freeMode");

if(enterFreeBtn){

  enterFreeBtn.onclick = () => {

    document.querySelector(".hud").style.display = "none";

    freeMode.style.display = "block";

  };

}

if(exitFreeBtn){

  exitFreeBtn.onclick = () => {

    freeMode.style.display = "none";

    document.querySelector(".hud").style.display = "flex";

  };

}
};
