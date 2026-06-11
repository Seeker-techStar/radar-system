<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Spotify Callback</title>

<style>
body {
  background: #05020a;
  color: #00d5ff;
  font-family: Arial, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  margin: 0;
  text-align: center;
}

.box {
  border: 1px solid #00d5ff;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(0, 213, 255, .3);
}
</style>
</head>
<body>

<div class="box">
  <h2>🎵 SPOTIFY CONNECT</h2>
  <p id="status">Connexion en cours...</p>
</div>

<script>
const CLIENT_ID = "dd95f1b1bfb243fd9ce7befe84b22385";
const REDIRECT_URI = "https://seeker-techstar.github.io/radar-system/callback.html";

async function exchangeCodeForToken() {
  const status = document.getElementById("status");

  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const verifier = localStorage.getItem("spotify_code_verifier");

    if (!code) {
      status.innerText = "Erreur : code Spotify introuvable.";
      return;
    }

    if (!verifier) {
      status.innerText = "Erreur : code verifier introuvable.";
      return;
    }

    const response = await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: "authorization_code",
          code: code,
          redirect_uri: REDIRECT_URI,
          code_verifier: verifier
        })
      }
    );

    const data = await response.json();
    console.log("Spotify Token Response:", data);

    if (data.access_token) {
      localStorage.setItem("spotify_token", data.access_token);

      if (data.refresh_token) {
        localStorage.setItem("spotify_refresh_token", data.refresh_token);
      }

      status.innerText = "Connexion reussie. Retour au radar...";

      setTimeout(() => {
        window.location.href = "./";
      }, 1000);
    } else {
      console.error(data);
      status.innerText =
        "Erreur Spotify : " +
        (data.error_description || data.error || "inconnue");
    }
  } catch (err) {
    console.error(err);
    status.innerText = "Erreur : " + err.message;
  }
}

exchangeCodeForToken();
</script>

</body>
</html>
