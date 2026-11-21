import { View } from "./base.js";
import { Formatter, WeatherCodes } from "../utils.js";

export class WeatherView extends View {
  async show() {
    const root = document.getElementById("weather-content");
    if (!this.app.selection.hasCountry()) {
      root.innerHTML = this.empty("fa-cloud-question", "No City Selected", "Select a country and city from the dashboard to see the weather forecast");
      return;
    }
    const ready = await this.app.ensureCity();
    if (!ready) {
      root.innerHTML = this.empty("fa-cloud-question", "No City Selected", "Pick a city so we can look up its forecast.");
      return;
    }

    root.innerHTML = this.loading(`Loading the forecast for ${this.app.selection.cityName}...`);
    try {
      const forecast = await this.app.weather.forecast(this.app.selection.cityLat, this.app.selection.cityLon);
      root.innerHTML = this.render(forecast);
    } catch (error) {
      console.error(error);
      root.innerHTML = this.empty("fa-cloud-question", "Forecast Unavailable", "The weather service did not respond. Try again in a moment.");
    }
  }

  render(data) {
    const current = data.current || {};
    const daily = data.daily || {};
    const hourly = data.hourly || {};
    const code = WeatherCodes.lookup(current.weather_code ?? daily.weather_code?.[0]);
    const temp = Math.round(current.temperature_2m ?? daily.temperature_2m_max?.[0]);
    const feels = Math.round(current.apparent_temperature ?? daily.apparent_temperature_max?.[0] ?? temp);
    const high = Math.round(daily.temperature_2m_max?.[0] ?? temp);
    const low = Math.round(daily.temperature_2m_min?.[0] ?? temp);
    const humidity = current.relative_humidity_2m ?? "N/A";
    const wind = Math.round(current.wind_speed_10m ?? daily.wind_speed_10m_max?.[0] ?? 0);
    const windDir = WeatherCodes.wind(current.wind_direction_10m ?? daily.wind_direction_10m_dominant?.[0]);
    const rain = daily.precipitation_sum?.[0] ?? 0;
    const rainChance = daily.precipitation_probability_max?.[0] ?? 0;
    const uv = WeatherCodes.uv(daily.uv_index_max?.[0]);
    const place = [this.app.selection.cityName, this.app.selection.countryName].filter(Boolean).join(", ");

    return `
      <div class="weather-hero-card ${code.theme}">
        <div class="weather-hero-content">
          <div class="weather-hero-main">
            <div class="weather-hero-left">
              <div class="weather-location"><i class="fa-solid fa-location-dot"></i> ${Formatter.escape(place)}</div>
              <div class="weather-hero-temp"><span class="temp-value">${temp}</span><span class="temp-unit">°C</span></div>
              <div class="weather-condition">${code.desc}</div>
              <div class="weather-feels">Feels like ${feels}°C</div>
              <div class="weather-high-low"><span class="high"><i class="fa-solid fa-arrow-up"></i> ${high}°</span> <span class="low"><i class="fa-solid fa-arrow-down"></i> ${low}°</span></div>
            </div>
            <div class="weather-hero-right"><div class="weather-hero-icon"><i class="fa-solid ${code.icon}"></i></div></div>
          </div>
        </div>
      </div>
      <div class="weather-details-grid">
        ${this.metric("humidity", "fa-droplet", "Humidity", `${humidity}%`)}
        ${this.metric("wind", "fa-wind", "Wind", `${wind} km/h ${windDir}`)}
        ${this.metric("precip", "fa-cloud-rain", "Rain", `${rain} mm · ${rainChance}%`)}
        ${this.metric("uv", "fa-sun", "UV Index", `${daily.uv_index_max?.[0] ?? "N/A"} · ${uv.label}`)}
        <div class="weather-detail-card sunrise-sunset">
          <div class="sun-time sunrise"><i class="fa-solid fa-sunrise"></i><span>${Formatter.wallTime(daily.sunrise?.[0])}</span></div>
          <div class="sun-time sunset"><i class="fa-solid fa-sunset"></i><span>${Formatter.wallTime(daily.sunset?.[0])}</span></div>
        </div>
      </div>
      <section class="weather-section">
        <h3 class="weather-section-title">7-day forecast</h3>
        <div class="forecast-list">
          ${(daily.time || []).map((day, index) => this.day(day, daily, index)).join("")}
        </div>
      </section>
      <section class="weather-section">
        <h3 class="weather-section-title">Next hours</h3>
        <div class="hourly-scroll">${this.hours(hourly)}</div>
      </section>
    `;
  }

  metric(kind, icon, label, value) {
    return `
      <div class="weather-detail-card">
        <div class="detail-icon ${kind}"><i class="fa-solid ${icon}"></i></div>
        <div class="detail-info">
          <span class="detail-label">${label}</span>
          <span class="detail-value">${Formatter.escape(value)}</span>
        </div>
      </div>
    `;
  }

  day(day, daily, index) {
    const info = WeatherCodes.lookup(daily.weather_code?.[index]);
    const label = index === 0 ? "Today" : Formatter.shortWeekday(day);
    return `
      <div class="forecast-day ${index === 0 ? "today" : ""}">
        <span class="forecast-day-name">${label}</span>
        <div class="forecast-icon"><i class="fa-solid ${info.icon} ${info.tone}"></i></div>
        <div class="forecast-temps">
          <span class="temp-max">${Math.round(daily.temperature_2m_max?.[index] ?? 0)}°</span>
          <span class="temp-min">${Math.round(daily.temperature_2m_min?.[index] ?? 0)}°</span>
        </div>
        <span class="forecast-precip"><i class="fa-solid fa-droplet"></i> ${daily.precipitation_probability_max?.[index] ?? 0}%</span>
      </div>
    `;
  }

  hours(hourly) {
    const times = hourly.time || [];
    const now = new Date();
    let start = times.findIndex((stamp) => new Date(stamp) >= now);
    if (start < 0) start = 0;
    return times.slice(start, start + 12).map((stamp, offset) => {
      const index = start + offset;
      const info = WeatherCodes.lookup(hourly.weather_code?.[index]);
      return `
        <div class="hourly-item">
          <span class="hourly-time">${Formatter.wallTime(stamp)}</span>
          <div class="hourly-icon"><i class="fa-solid ${info.icon} ${info.tone}"></i></div>
          <span class="hourly-temp">${Math.round(hourly.temperature_2m?.[index] ?? 0)}°</span>
          <span class="hourly-precip">${hourly.precipitation_probability?.[index] ?? 0}%</span>
        </div>
      `;
    }).join("");
  }
}
