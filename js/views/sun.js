import { View } from "./base.js";
import { Formatter } from "../utils.js";

export class SunTimesView extends View {
  constructor(app) {
    super(app, "sun-times");
    this.date = Formatter.isoDate(new Date());
  }

  async show() {
    const root = document.getElementById("sun-times-content");
    if (!this.app.selection.hasCountry()) {
      root.innerHTML = this.empty("fa-sun", "No City Selected", "Select a country and city from the dashboard to see sunrise and sunset times");
      return;
    }
    const ready = await this.app.ensureCity();
    if (!ready) {
      root.innerHTML = this.empty("fa-sun", "No City Selected", "Pick a city so we can calculate golden hour.");
      return;
    }

    root.innerHTML = this.loading("Calculating sun times...");
    try {
      const results = await this.app.sun.times(this.app.selection.cityLat, this.app.selection.cityLon, this.date);
      const details = await this.app.countries.details(this.app.selection.countryCode);
      root.innerHTML = this.render(results, details?.timezone || "");
      root.querySelector("#sun-date").addEventListener("change", (event) => {
        this.date = event.target.value || Formatter.isoDate(new Date());
        this.show();
      });
    } catch (error) {
      console.error(error);
      root.innerHTML = this.empty("fa-sun", "Sun Times Unavailable", "The sunrise service did not respond for this location.");
    }
  }

  render(results, zone) {
    const sunrise = new Date(results.sunrise);
    const sunset = new Date(results.sunset);
    const noon = new Date(results.solar_noon);
    const dawn = new Date(results.civil_twilight_begin);
    const dusk = new Date(results.civil_twilight_end);
    const hours = Math.floor(results.day_length / 3600);
    const minutes = Math.floor((results.day_length % 3600) / 60);
    const place = [this.app.selection.cityName, this.app.selection.countryName].filter(Boolean).join(", ");
    const date = Formatter.parse(this.date);

    return `
      <div class="sun-date-form">
        <input id="sun-date" class="form-input" type="date" value="${this.date}">
      </div>
      <div class="sun-main-card">
        <div class="sun-main-header">
          <div class="sun-location">
            <h2>${Formatter.escape(place)}</h2>
            <p>Golden hour planning</p>
          </div>
          <div class="sun-date-display">
            <div class="date">${date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}</div>
            <div class="day">${date.toLocaleDateString("en-US", { weekday: "long" })}</div>
          </div>
        </div>
        <div class="sun-times-visual">
          <div class="day-length-card">
            <i class="fa-solid fa-hourglass-half"></i>
            <div>
              <strong>${hours}h ${minutes}m</strong>
              <span>of daylight</span>
            </div>
          </div>
        </div>
      </div>
      <div class="sun-times-grid">
        ${this.tile("dawn", "fa-cloud-sun", "Dawn", Formatter.timeInZone(dawn, zone))}
        ${this.tile("sunrise", "fa-sunrise", "Sunrise", Formatter.timeInZone(sunrise, zone))}
        ${this.tile("noon", "fa-sun", "Solar noon", Formatter.timeInZone(noon, zone))}
        ${this.tile("sunset", "fa-sunset", "Sunset", Formatter.timeInZone(sunset, zone))}
        ${this.tile("dusk", "fa-moon", "Dusk", Formatter.timeInZone(dusk, zone))}
        ${this.tile("daylight", "fa-hourglass-half", "Day length", `${hours}h ${minutes}m`)}
      </div>
    `;
  }

  tile(kind, icon, label, value) {
    return `
      <div class="sun-time-card ${kind}">
        <i class="fa-solid ${icon}"></i>
        <span class="sun-label">${label}</span>
        <span class="sun-value">${value}</span>
      </div>
    `;
  }
}
