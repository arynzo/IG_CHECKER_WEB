// Quick API test — node test-api.mjs
// Tests multiple URL + method combos to find what works

const TOKEN_ENDPOINT = "https://auto.arynzo.xyz/api/igt/token";
const tokenRes = await fetch(TOKEN_ENDPOINT);
const tokenData = await tokenRes.json();
const AUTH_TOKEN = tokenData.token;
console.log("Fetched dynamic token:", AUTH_TOKEN?.slice(0, 30) + "...");

const USERNAME = "arynzo";

const COMBOS = [
  {
    label: "static.cdninstagram.com — POST (Python script combo)",
    url: `https://static.cdninstagram.com/api/v1/users/${USERNAME}/usernameinfo_stream/`,
    method: "POST",
  },
  {
    label: "i.instagram.com — POST",
    url: `https://i.instagram.com/api/v1/users/${USERNAME}/usernameinfo_stream/`,
    method: "POST",
  },
  {
    label: "i.instagram.com — GET",
    url: `https://i.instagram.com/api/v1/users/${USERNAME}/usernameinfo_stream/`,
    method: "GET",
  },
  {
    label: "i.instagram.com — userinfo (GET, classic endpoint)",
    url: `https://i.instagram.com/api/v1/users/web_profile_info/?username=${USERNAME}`,
    method: "GET",
  },
];

const BASE_HEADERS = {
  "Host": "i.instagram.com",
  "Accept-Encoding": "gzip, deflate, br",
  "authorization": `Bearer ${AUTH_TOKEN}`,
  "user-agent": "Instagram 439.0.0.37.89 Android (35/15; 320dpi; 720x1280; Samsung; SM-A235F; a23; Samsung; en_US; 1021815514)",
  "x-ig-app-id": "567067343352427",
};

for (const combo of COMBOS) {
  console.log("\n" + "=".repeat(60));
  console.log("TEST :", combo.label);
  console.log("URL  :", combo.url);
  console.log("=".repeat(60));

  try {
    const res = await fetch(combo.url, {
      method: combo.method,
      headers: BASE_HEADERS,
      cache: "no-store",
    });

    console.log("Status:", res.status, res.statusText);
    const text = await res.text();
    console.log("Body  :", text.slice(0, 500));
  } catch (err) {
    console.error("Error :", err.message);
  }
}
