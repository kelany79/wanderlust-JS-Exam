import { View } from "./base.js";
import { Formatter, TimezoneClock } from "../utils.js";

export class DashboardView extends View {
  constructor(app) {
    super(app, "dashboard");
    this.timer = null;
    this.clock = null;
  }

  renderCountry(country) {
    const root = document.getElementById("dashboard-country-info");
    if (!root) return;
    this.stopClock();
    if (!country) {
      root.innerHTML = `
        <div class="country-info-placeholder">
          <div class="placeholder-icon error"><i class="fa-solid fa-exclamation-triangle"></i></div>
          <p>Country details are unavailable right now. Try another destination.</p>
        </div>
      `;
      return;
    }

    this.clock = new TimezoneClock(country.timezone || country.timezoneLabel, country.timezoneLabel);
    const languages = country.languages || [];
    const currencies = country.currencies || [];
    const borders = country.borders || [];
    const region = [country.region, country.subregion].filter(Boolean).join(" • ");

    root.innerHTML = `
      <div class="dashboard-country-header">
        <img src="${Formatter.escape(country.flag || Formatter.flagSvg(country.cca2))}" alt="${Formatter.escape(country.name)}" class="dashboard-country-flag">
        <div class="dashboard-country-title">
          <h3>${Formatter.escape(country.name)}</h3>
          <p class="official-name">${Formatter.escape(country.official || country.name)}</p>
          <span class="region"><i class="fa-solid fa-location-dot"></i> ${Formatter.escape(region)}</span>
        </div>
      </div>
      <div class="dashboard-local-time">
        <div class="local-time-display">
          <i class="fa-solid fa-clock"></i>
          <span class="local-time-value" id="country-local-time">${this.clock.format()}</span>
          <span class="local-time-zone">${Formatter.escape(country.timezoneLabel || country.timezone || "")}</span>
        </div>
      </div>
      <div class="dashboard-country-grid">
        ${this.detail("fa-building-columns", "Capital", country.capital || "N/A")}
        ${this.detail("fa-users", "Population", Formatter.number(country.population))}
        ${this.detail("fa-ruler-combined", "Area", `${Formatter.number(country.area)} km²`)}
        ${this.detail("fa-globe", "Continent", country.continent || country.region || "N/A")}
        ${this.detail("fa-phone", "Calling Code", country.callingCode || "N/A")}
        ${this.detail("fa-car", "Driving Side", country.drivingSide || "N/A")}
        ${this.detail("fa-calendar-week", "Week Starts", country.weekStarts || "N/A")}
      </div>
      <div class="dashboard-country-extras">
        ${currencies.length ? `
          <div class="dashboard-country-extra">
            <h4><i class="fa-solid fa-coins"></i> Currency</h4>
            <div class="extra-tags">
              ${currencies.map((item) => `<span class="extra-tag">${Formatter.escape(item.name)} (${Formatter.escape(item.code)}${item.symbol ? ` ${Formatter.escape(item.symbol)}` : ""})</span>`).join("")}
            </div>
          </div>
        ` : ""}
        ${languages.length ? `
          <div class="dashboard-country-extra">
            <h4><i class="fa-solid fa-language"></i> Languages</h4>
            <div class="extra-tags">${languages.map((language) => `<span class="extra-tag">${Formatter.escape(language)}</span>`).join("")}</div>
          </div>
        ` : ""}
        ${borders.length ? `
          <div class="dashboard-country-extra">
            <h4><i class="fa-solid fa-map-location-dot"></i> Neighbors</h4>
            <div class="extra-tags">
              ${borders.map((code) => `<span class="extra-tag border-tag" onclick="loadDashboardBorderCountry('${Formatter.escape(code)}')">${Formatter.escape(code)}</span>`).join("")}
            </div>
          </div>
        ` : ""}
      </div>
      <div class="dashboard-country-actions">
        <a href="${Formatter.escape(country.maps || "#")}" target="_blank" rel="noopener" class="btn-map-link">
          <i class="fa-solid fa-map"></i> View on Google Maps
        </a>
      </div>
    `;

    this.timer = setInterval(() => {
      const node = document.getElementById("country-local-time");
      if (node && this.clock) node.textContent = this.clock.format();
    }, 1000);
  }

  detail(icon, label, value) {
    return `
      <div class="dashboard-country-detail">
        <i class="fa-solid ${icon}"></i>
        <span class="label">${label}</span>
        <span class="value">${Formatter.escape(value)}</span>
      </div>
    `;
  }

  placeholder() {
    this.stopClock();
    const root = document.getElementById("dashboard-country-info");
    if (!root) return;
    root.innerHTML = `
      <div class="country-info-placeholder">
        <div class="placeholder-icon"><i class="fa-solid fa-earth-americas"></i></div>
        <p>Select a country above and click <strong>Explore</strong> to see detailed information</p>
      </div>
    `;
  }

  stopClock() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
