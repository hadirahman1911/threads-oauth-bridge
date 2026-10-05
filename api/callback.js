export default async function handler(req, res) {
  const { code } = req.query;

  const CLIENT_ID = process.env.THREADS_APP_ID || "2394346014433760";
  const CLIENT_SECRET = process.env.THREADS_APP_SECRET;

  // Laman GitHub Pages anda yang baru siap tadi
  const GITHUB_UI_URL = "https://hadirahman1911.github.io/threads-auth/callback.html";

  if (!code) {
    return res.redirect(`${GITHUB_UI_URL}#error=${encodeURIComponent("Tiada parameter kod OAuth diterima")}`);
  }

  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const redirectUri = `${protocol}://${host}/api/callback`;

  try {
    // 1. Tukar CODE ke Short-Lived Access Token
    const params = new URLSearchParams();
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);
    params.append("grant_type", "authorization_code");
    params.append("redirect_uri", redirectUri);
    params.append("code", code);

    const exchangeRes = await fetch("https://graph.threads.net/oauth/access_token", {
      method: "POST",
      body: params
    });
    const exchangeData = await exchangeRes.json();

    if (exchangeData.error) {
      throw new Error(exchangeData.error_message || exchangeData.error.message || "Gagal tukar authorization code.");
    }

    const shortLivedToken = exchangeData.access_token;

    // 2. Tukar ke Long-Lived Token (Sah 60 Hari)
    const longLivedRes = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${CLIENT_SECRET}&access_token=${shortLivedToken}`
    );
    const longLivedData = await longLivedRes.json();

    if (longLivedData.error) {
      throw new Error(longLivedData.error.message || "Gagal jana long-lived token.");
    }

    const finalToken = longLivedData.access_token;

    // 3. Hantar pengguna semula ke GitHub Pages bersama token
    return res.redirect(`${GITHUB_UI_URL}#token=${finalToken}`);

  } catch (err) {
    return res.redirect(`${GITHUB_UI_URL}#error=${encodeURIComponent(err.message)}`);
  }
}
