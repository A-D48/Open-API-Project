# 🌤️ Open-Meteo Weather Web App

A fully responsive weather web application built using **HTML**, **CSS**, and **JavaScript**, powered by the free [Open-Meteo API](https://open-meteo.com/).
The app allows users to search for any city, get accurate weather data, and toggle between **°C / °F** and **Dark / Light** themes — with automatic **current location detection**.

---

## 📁 Project Structure

```
project-folder/
│
├── README.md
├── index.html
│
├── css/
│   └── index.css
│
├── js/
│   └── index.js
│
└── images/
    └── (optional image files)
```

---

## 🚀 Features

✅ **Real-time weather data** fetched from the Open-Meteo API
✅ **City search with live suggestions** (auto-complete using Open-Meteo’s Geocoding API)
✅ **Current location detection** using the browser’s Geolocation API
✅ **Automatic unit switching** (Celsius ↔ Fahrenheit)
✅ **Dark / Light theme toggle** (saved in localStorage)
✅ **Responsive design** for mobile, tablet, and desktop
✅ **Hourly & 7-day forecast**
✅ **Air quality data (AQI, PM10, PM2.5, O₃)**
✅ **Built with clean semantic HTML, CSS Grid, and Flexbox**
✅ **No API keys required!**

---

## 🧠 How It Works

1. The user can:

   * Search for a city (auto-complete suggestions appear).
   * Use **“My Location”** to fetch weather based on their coordinates.

2. The app:

   * Calls the [Open-Meteo Forecast API](https://open-meteo.com/en/docs#api_form) for current, hourly, and daily forecasts.
   * Calls the [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) for AQI data.
   * Displays temperature, humidity, UV index, precipitation, and air quality dynamically.

3. The UI:

   * Uses Flexbox & CSS Grid for layouts.
   * Supports mobile-first responsiveness.
   * Includes a sticky header with controls for °C/°F and theme switching.

---

## 🧬 Technologies Used

* **HTML5** – Semantic structure
* **CSS3** – Grid, Flexbox, responsive design
* **JavaScript (ES6)** – DOM manipulation, API fetch, event handling
* **Open-Meteo API** – Weather and air quality data
* **Geolocation API** – To fetch user’s location
* **LocalStorage** – To persist theme and unit preferences

---

## ⚙️ Setup Instructions

1. **Clone the repository:**

   ```bash
   git clone https://github.com/A-D48/Open-API-Project
   ```
2. **Open the app:**
   Simply open `index.html` in your browser — no server setup required.

---

## 💻 Folder Details

| Folder / File   | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `index.html`    | Main structure of the app                                     |
| `css/index.css` | All styling and responsive rules                              |
| `js/index.js`   | Main logic (API calls, events, theme, temperature conversion) |
| `README.md`     | Documentation and setup instructions                          |

---

## 📱 Responsiveness

This project is fully mobile-friendly:

* Navigation and controls stack neatly on small screens
* Hourly forecast scrolls horizontally with smooth touch
* Charts, grids, and text scale correctly at all screen widths

---

## 🔧 Future Enhancements

* Add weather icons (SVG or animated)
* Include charts for hourly temperature trends
* Add “Favorites” for saved cities
* Multi-language support

---

## 🧑‍💻 Author

** AliReza Daneshpazhooh
• [LinkedIn](https://www.linkedin.com/in/a-d48/) 
• [GitHub](https://github.com/A-D48)

