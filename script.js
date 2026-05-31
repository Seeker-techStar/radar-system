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
  /* Marqueur vert cible sur minimap */
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

  console.log("PLAYER =", playerCode);
  console.log("SQUAD =", squadCode);

  let myLat = 0;
  let myLon = 0;
  let onlinePlayers = [];

  /* CALCUL DISTANCE km */
  function calcDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  /* CALCUL DIRECTION */
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

    /* SPEED dans tactical data */
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

    /* CERCLES */
    for (let i = 1; i <= 6; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, i * (canvas.width / 14), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(200,120,255,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    /* CROIX */
    ctx.beginPath();
    ctx.moveTo(cx, cy - canvas.height / 2.2);
    ctx.lineTo(cx, cy + canvas.height / 2.2);
    ctx.moveTo(cx - canvas.width / 2.2, cy);
    ctx.lineTo(cx + canvas.width / 2.2, cy);
    ctx.strokeStyle = "rgba(200,120,255,0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();

    /* SWEEP */
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

    /* POINT VERT — TARGET Luxembourg City */
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

    /* JOUEURS */
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

    /* POINT CENTRAL — TOI */
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
/* SET TARGET */
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
  drawRadar();
};
