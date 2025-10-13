// ===== Utilities =====
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = Intl.NumberFormat();
const state = {
  unit: localStorage.getItem("unit") || "celsius", // 'celsius' | 'fahrenheit'
  theme: localStorage.getItem("theme") || "dark", // 'dark' | 'light'
  place: null,
  lastPlace: JSON.parse(localStorage.getItem("lastPlace") || "null"),
};
const unitSymbol = () => (state.unit === "celsius" ? "°C" : "°F");

// DOM refs
const q = $("#q"),
  sug = $("#suggestions"),
  form = $("#search-form");
const btnC = $("#btn-c"),
  btnF = $("#btn-f"),
  themeBtn = $("#theme-toggle"),
  locBtn = $("#loc-btn");
const locEl = $("#location-name"),
  tsEl = $("#timestamp"),
  tEl = $("#current-temp"),
  dEl = $("#current-desc");
const feelsEl = $("#feels-like"),
  windEl = $("#wind"),
  windDirEl = $("#wind-dir"),
  humEl = $("#humidity");
const dewEl = $("#dewpoint"),
  presEl = $("#pressure"),
  cloudEl = $("#cloud"),
  visEl = $("#vis"),
  precipEl = $("#precip"),
  uvEl = $("#uv");
const srEl = $("#sunrise"),
  ssEl = $("#sunset");
const hourlyBox = $("#hourly"),
  dailyBox = $("#daily");
const aqiEl = $("#aqi"),
  pm25El = $("#pm25"),
  pm10El = $("#pm10"),
  o3El = $("#o3");
const loadingEl = $("#loading"),
  statusEl = $("#status");
const chartTemp = $("#chart-temp"),
  chartPrecip = $("#chart-precip"),
  chartUV = $("#chart-uv");

// ===== Theme + Units =====
function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  themeBtn.setAttribute("aria-pressed", state.theme === "dark");
}
function setTheme(next) {
  state.theme = next;
  localStorage.setItem("theme", next);
  applyTheme();
}
applyTheme();

function refreshUnitButtons() {
  btnC.setAttribute("aria-pressed", state.unit === "celsius");
  btnF.setAttribute("aria-pressed", state.unit === "fahrenheit");
}
function setUnit(u) {
  if (state.unit === u) return;
  state.unit = u;
  localStorage.setItem("unit", u);
  refreshUnitButtons();
  if (state.place) fetchAll(state.place); // refetch immediately so everything updates
}
refreshUnitButtons();

btnC.addEventListener("click", () => setUnit("celsius"));
btnF.addEventListener("click", () => setUnit("fahrenheit"));
themeBtn.addEventListener("click", () =>
  setTheme(state.theme === "dark" ? "light" : "dark")
);

// ===== “My location” (explicit user action) =====
locBtn.addEventListener("click", useMyLocation);

async function useMyLocation() {
  if (!navigator.geolocation) {
    setStatus("Geolocation not supported in this browser.");
    return;
  }
  setStatus("Requesting your location…");
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      const { latitude: lat, longitude: lon } = coords;
      setStatus("Found location. Resolving nearest place name…");
      // Reverse lookup a nice display name via Open-Meteo geocoding nearest endpoint:
      try {
        const url = new URL("https://geocoding-api.open-meteo.com/v1/reverse");
        url.search = new URLSearchParams({
          latitude: lat,
          longitude: lon,
          language: "en",
          format: "json",
        }).toString();
        const res = await fetch(url);
        const data = await res.json();
        const best = data?.results?.[0];
        const name = best
          ? [best.name, best.admin1, best.country_code]
              .filter(Boolean)
              .join(", ")
          : "Your location";
        q.value = name;
        state.place = { name, lat, lon, tz: best?.timezone };
        localStorage.setItem("lastPlace", JSON.stringify(state.place));
        setStatus("Loading local weather…");
        await fetchAll(state.place);
        setStatus(""); // clear
      } catch (e) {
        console.error(e);
        // If reverse fails, still fetch by raw coords
        state.place = { name: "Your location", lat, lon };
        localStorage.setItem("lastPlace", JSON.stringify(state.place));
        await fetchAll(state.place);
        setStatus("");
      }
    },
    (err) => {
      setStatus(geoErrorToMessage(err));
    },
    { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
  );
}

function geoErrorToMessage(err) {
  if (!err) return "Couldn’t get location.";
  switch (err.code) {
    case 1:
      return "Permission denied. Please allow location access or search a city.";
    case 2:
      return "Position unavailable. Try again or search a city.";
    case 3:
      return "Location request timed out. Try again.";
    default:
      return "Couldn’t get location.";
  }
}

// ===== Suggest / Geocoding =====
let abortCtrl,
  items = [],
  active = -1;

q.addEventListener(
  "input",
  debounce(async () => {
    const term = q.value.trim();
    active = -1;
    items = [];
    sug.innerHTML = "";
    sug.hidden = true;
    q.setAttribute("aria-expanded", "false");
    if (term.length < 2) return;
    try {
      abortCtrl?.abort();
      abortCtrl = new AbortController();
      const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
      url.search = new URLSearchParams({
        name: term,
        count: 8,
        language: "en",
        format: "json",
      }).toString();
      const res = await fetch(url, { signal: abortCtrl.signal });
      const data = await res.json();
      if (!data?.results?.length) return;
      items = data.results;
      sug.innerHTML = items
        .map((r, i) => {
          const name = [r.name, r.admin1, r.country_code]
            .filter(Boolean)
            .join(", ");
          const meta = r.population ? fmt.format(r.population) : "";
          return `<li role="option" aria-selected="${
            i === active
          }" data-i="${i}">
        <span>${name}</span><span class="muted">${meta}</span>
      </li>`;
        })
        .join("");
      sug.hidden = false;
      q.setAttribute("aria-expanded", "true");
    } catch (e) {
      if (e.name !== "AbortError") console.error(e);
    }
  }, 220)
);

sug.addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  choose(items[Number(li.dataset.i)]);
});

q.addEventListener("keydown", (e) => {
  if (sug.hidden) return;
  if (e.key === "ArrowDown") {
    active = Math.min(active + 1, items.length - 1);
    paintActive();
    e.preventDefault();
  }
  if (e.key === "ArrowUp") {
    active = Math.max(active - 1, 0);
    paintActive();
    e.preventDefault();
  }
  if (e.key === "Enter") {
    if (active >= 0) {
      choose(items[active]);
      e.preventDefault();
    }
  }
});

function paintActive() {
  $$("#suggestions li").forEach((li, i) =>
    li.classList.toggle("active", i === active)
  );
  $$("#suggestions li").forEach((li, i) =>
    li.setAttribute("aria-selected", i === active)
  );
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (items.length) {
    choose(items[0]);
    return;
  }
  const term = q.value.trim();
  if (!term) return;
  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.search = new URLSearchParams({
      name: term,
      count: 1,
      language: "en",
      format: "json",
    }).toString();
    const res = await fetch(url);
    const data = await res.json();
    if (data?.results?.[0]) choose(data.results[0]);
  } catch (e) {
    console.error(e);
  }
});

function choose(r) {
  sug.hidden = true;
  q.setAttribute("aria-expanded", "false");
  const name = [r.name, r.admin1, r.country_code].filter(Boolean).join(", ");
  q.value = name;
  state.place = { name, lat: r.latitude, lon: r.longitude, tz: r.timezone };
  localStorage.setItem("lastPlace", JSON.stringify(state.place));
  fetchAll(state.place);
}

// ===== Fetch Weather + Air =====
async function fetchAll(place) {
  try {
    setLoading(true);
    const unitParam = state.unit; // 'celsius' | 'fahrenheit'
    const weatherURL = new URL("https://api.open-meteo.com/v1/forecast");
    weatherURL.search = new URLSearchParams({
      latitude: place.lat,
      longitude: place.lon,
      timezone: "auto",
      current_weather: "true",
      hourly: [
        "temperature_2m",
        "apparent_temperature",
        "relativehumidity_2m",
        "dewpoint_2m",
        "surface_pressure",
        "cloudcover",
        "visibility",
        "precipitation_probability",
        "weathercode",
        "windspeed_10m",
        "winddirection_10m",
        "uv_index",
      ].join(","),
      daily: [
        "weathercode",
        "temperature_2m_max",
        "temperature_2m_min",
        "sunrise",
        "sunset",
        "uv_index_max",
        "precipitation_sum",
        "precipitation_probability_mean",
      ].join(","),
      forecast_days: 7,
      temperature_unit: unitParam,
      windspeed_unit: "kmh",
    }).toString();

    const airURL = new URL(
      "https://air-quality-api.open-meteo.com/v1/air-quality"
    );
    airURL.search = new URLSearchParams({
      latitude: place.lat,
      longitude: place.lon,
      timezone: "auto",
      hourly: ["pm10", "pm2_5", "ozone", "us_aqi"].join(","),
    }).toString();

    const [wRes, aRes] = await Promise.all([fetch(weatherURL), fetch(airURL)]);
    const [w, a] = await Promise.all([wRes.json(), aRes.json()]);
    renderWeather(place, w);
    renderAir(a);
  } catch (err) {
    console.error(err);
    alert("Could not load data. Please try again.");
  } finally {
    setLoading(false);
  }
}

function renderWeather(place, w) {
  locEl.textContent = place.name;
  const now = new Date();
  tsEl.textContent = `Updated ${now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  // Current
  const cw = w.current_weather || {};
  tEl.textContent =
    cw.temperature != null
      ? `${Math.round(cw.temperature)}${unitSymbol()}`
      : "—";
  dEl.textContent = codeToText(cw.weathercode);

  // Hourly index close to now
  const times = w.hourly?.time || [];
  let idx = 0,
    nowMs = now.getTime();
  for (let i = 0; i < times.length; i++) {
    if (new Date(times[i]).getTime() >= nowMs) {
      idx = i;
      break;
    }
  }

  // Stats
  const feels = w.hourly?.apparent_temperature?.[idx];
  const hum = w.hourly?.relativehumidity_2m?.[idx];
  const dew = w.hourly?.dewpoint_2m?.[idx];
  const pres = w.hourly?.surface_pressure?.[idx]; // hPa
  const cloud = w.hourly?.cloudcover?.[idx];
  const vis = w.hourly?.visibility?.[idx]; // meters
  const pProb = w.hourly?.precipitation_probability?.[idx];
  const wind = cw.windspeed; // km/h
  const wdir = w.hourly?.winddirection_10m?.[idx];
  const uv = w.hourly?.uv_index?.[idx];

  feelsEl.textContent = numUnit(feels, unitSymbol());
  windEl.textContent = numUnit(wind, " km/h");
  windDirEl.innerHTML =
    wdir != null
      ? `${degToCompass(wdir)} <span class="muted">(${Math.round(
          wdir
        )}°)</span>`
      : "—";
  humEl.textContent = numUnit(hum, "%", 0);
  dewEl.textContent = numUnit(dew, unitSymbol());
  presEl.textContent = pres != null ? `${Math.round(pres)} hPa` : "—";
  cloudEl.textContent = numUnit(cloud, "%", 0);
  visEl.textContent = vis != null ? `${Math.round(vis / 1000)} km` : "—";
  precipEl.textContent = numUnit(pProb, "%", 0);
  uvEl.textContent = uv != null ? uv.toFixed(1) : "—";
  srEl.textContent = w.daily?.sunrise?.[0] ? toHM(w.daily.sunrise[0]) : "—";
  ssEl.textContent = w.daily?.sunset?.[0] ? toHM(w.daily.sunset[0]) : "—";

  // Hourly cards (24h)
  hourlyBox.innerHTML = "";
  const end = Math.min(idx + 24, times.length);
  const arrTemp = [],
    arrPrecip = [],
    arrUV = [];
  for (let i = idx; i < end; i++) {
    const dt = new Date(times[i]);
    const temp = w.hourly.temperature_2m?.[i];
    const code = w.hourly.weathercode?.[i];
    const uvh = w.hourly.uv_index?.[i];
    const pph = w.hourly.precipitation_probability?.[i];

    arrTemp.push(temp ?? null);
    arrPrecip.push(pph ?? 0);
    arrUV.push(uvh ?? 0);

    const el = document.createElement("div");
    el.className = "hour";
    el.innerHTML = `
      <div class="h">${dt.toLocaleTimeString([], { hour: "numeric" })}</div>
      <div class="t">${
        temp != null ? Math.round(temp) + unitSymbol() : "—"
      }</div>
      <div class="ic">${codeToEmoji(code)}</div>
      <div class="x muted">P% ${pph != null ? pph : "—"} | UV ${
      uvh != null ? uvh.toFixed(0) : "—"
    }</div>
    `;
    hourlyBox.appendChild(el);
  }

  // Charts
  drawLine(chartTemp, arrTemp, "auto"); // autoscale
  drawLine(chartPrecip, arrPrecip, 100); // 0..100%
  drawLine(chartUV, arrUV, "auto");

  // Daily 7d
  dailyBox.innerHTML = "";
  const dlen = w.daily?.time?.length || 0;
  for (let i = 0; i < dlen; i++) {
    const dt = new Date(w.daily.time[i]);
    const hi = w.daily.temperature_2m_max?.[i];
    const lo = w.daily.temperature_2m_min?.[i];
    const code = w.daily.weathercode?.[i];
    const pday = w.daily.precipitation_probability_mean?.[i];
    const psum = w.daily.precipitation_sum?.[i]; // mm
    const el = document.createElement("div");
    el.className = "day";
    el.innerHTML = `
      <div class="d">${dt.toLocaleDateString([], { weekday: "short" })}</div>
      <div class="ic">${codeToEmoji(code)}</div>
      <div class="hi">${hi != null ? Math.round(hi) + unitSymbol() : "—"}</div>
      <div class="lo">${lo != null ? Math.round(lo) + unitSymbol() : "—"}</div>
      <div class="pp">P% ${pday != null ? Math.round(pday) : "—"} | ${
      psum != null ? psum.toFixed(1) + " mm" : "—"
    }</div>
    `;
    dailyBox.appendChild(el);
  }
}

function renderAir(a) {
  if (!a?.hourly?.time) {
    aqiEl.textContent =
      pm25El.textContent =
      pm10El.textContent =
      o3El.textContent =
        "—";
    return;
  }
  const now = new Date();
  const times = a.hourly.time;
  let idx = times.length - 1;
  for (let i = 0; i < times.length; i++) {
    if (new Date(times[i]).getTime() >= now.getTime()) {
      idx = i;
      break;
    }
  }
  const aqi = a.hourly.us_aqi?.[idx];
  const pm25 = a.hourly.pm2_5?.[idx];
  const pm10 = a.hourly.pm10?.[idx];
  const o3 = a.hourly.ozone?.[idx];
  aqiEl.textContent = aqi != null ? Math.round(aqi) : "—";
  pm25El.textContent = pm25 != null ? pm25.toFixed(1) + " µg/m³" : "—";
  pm10El.textContent = pm10 != null ? pm10.toFixed(1) + " µg/m³" : "—";
  o3El.textContent = o3 != null ? Math.round(o3) + " µg/m³" : "—";
}

// ===== Small helpers =====
function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
function numUnit(v, u, dp = 0) {
  return v != null ? `${dp ? Number(v).toFixed(dp) : Math.round(v)}${u}` : "—";
}
function toHM(iso) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function degToCompass(deg) {
  if (deg == null) return "—";
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return dirs[Math.round(deg / 22.5) % 16];
}
function codeToText(code) {
  const map = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm (slight hail)",
    99: "Thunderstorm (heavy hail)",
  };
  return map[code] ?? "—";
}
function codeToEmoji(code) {
  if (code === 0 || code === 1) return "☀️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "🌨️";
  if ([66, 67].includes(code)) return "🌧️❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}
function setLoading(on) {
  loadingEl.hidden = !on;
}
function setStatus(msg) {
  statusEl.textContent = msg || "";
}

// ---- Tiny SVG line chart (no libs) ----
function drawLine(svg, values, yMax = "auto") {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const w = 300,
    h = 100,
    pad = 6;
  const xs = values.map((v, i) => ({
    x: pad + i * ((w - 2 * pad) / Math.max(1, values.length - 1)),
    y: v,
  }));
  const filtered = xs.filter((p) => p.y != null && !Number.isNaN(p.y));
  if (!filtered.length) {
    svg.appendChild(txtNode("No data", w / 2, h / 2));
    return;
  }
  const min = Math.min(...filtered.map((p) => p.y));
  const max = yMax === "auto" ? Math.max(...filtered.map((p) => p.y)) : yMax;
  const span = Math.max(1e-6, max - (yMax === "auto" ? min : 0));
  const mapY = (v) => {
    const vv = (yMax === "auto" ? v - min : v) / span; // 0..1
    return h - pad - vv * (h - 2 * pad);
  };
  const d = filtered
    .map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(1)} ${mapY(p.y).toFixed(1)}`)
    .join(" ");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  svg.appendChild(path);
  const axis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  axis.setAttribute("x1", pad);
  axis.setAttribute("x2", w - pad);
  axis.setAttribute("y1", h - pad);
  axis.setAttribute("y2", h - pad);
  axis.setAttribute("stroke", "currentColor");
  axis.setAttribute("opacity", "0.25");
  svg.appendChild(axis);
}
function txtNode(text, x, y) {
  const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
  t.textContent = text;
  t.setAttribute("x", x);
  t.setAttribute("y", y);
  t.setAttribute("text-anchor", "middle");
  t.setAttribute("dominant-baseline", "middle");
  t.setAttribute("fill", "currentColor");
  t.setAttribute("opacity", "0.7");
  return t;
}

// ===== Startup =====
if (state.lastPlace) {
  state.place = state.lastPlace;
  q.value = state.place.name;
  fetchAll(state.place);
} else if (navigator.geolocation) {
  // Try once on load; user can always click 📍 later
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      state.place = {
        name: "Your location",
        lat: coords.latitude,
        lon: coords.longitude,
      };
      fetchAll(state.place);
    },
    async () => {
      await fallbackCity("New York");
    },
    { timeout: 5000 }
  );
} else {
  fallbackCity("New York");
}

async function fallbackCity(name) {
  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.search = new URLSearchParams({
      name,
      count: 1,
      language: "en",
      format: "json",
    }).toString();
    const res = await fetch(url);
    const data = await res.json();
    if (data?.results?.[0]) choose(data.results[0]);
  } catch (e) {
    console.error(e);
  }
}
