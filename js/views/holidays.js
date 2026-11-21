import { View } from "./base.js";
import { Formatter } from "../utils.js";

export class HolidaysView extends View {
  constructor(app) {
    super(app, "holidays");
  }

  async show() {
    const root = document.getElementById("holidays-content");
    const selection = this.app.selection;
    if (!selection.hasCountry()) {
      root.innerHTML = this.empty("fa-calendar-xmark", "No Country Selected", "Select a country from the dashboard to explore public holidays");
      return;
    }

    root.innerHTML = this.loading("Loading public holidays...");
    try {
      const holidays = await this.app.nager.holidays(selection.year, selection.countryCode);
      this.app.holidayCount = holidays.length;
      this.app.updateStats();
      if (!holidays.length) {
        root.innerHTML = this.empty("fa-calendar-xmark", "No Holidays Found", `No public holidays were returned for ${selection.countryName} in ${selection.year}.`);
        return;
      }
      root.innerHTML = holidays.map((holiday) => this.card(holiday)).join("");
    } catch (error) {
      console.error(error);
      root.innerHTML = this.empty("fa-calendar-xmark", "Could Not Load Holidays", "The holiday service did not respond. Try another country or year.");
    }
  }

  card(holiday) {
    const selection = this.app.selection;
    const data = {
      date: holiday.date,
      name: holiday.name,
      localName: holiday.localName,
      types: holiday.types || [],
      countryCode: selection.countryCode,
      countryName: selection.countryName,
      year: selection.year,
    };
    const saved = this.app.plans.has("holiday", data);
    const id = this.app.stash("holiday", data);
    const parts = Formatter.monthDay(holiday.date);
    const types = (holiday.types || ["Public"]).map((type) => `<span class="holiday-type-badge">${Formatter.escape(type)}</span>`).join("");
    return `
      <article class="holiday-card">
        <div class="holiday-card-header">
          <div class="holiday-date-box">
            <span class="day">${parts.day}</span>
            <span class="month">${parts.month}</span>
          </div>
          <div>
            <h3>${Formatter.escape(holiday.name)}</h3>
            <p class="holiday-name">${Formatter.escape(holiday.localName || "")}</p>
          </div>
        </div>
        <div class="holiday-types">${types}</div>
        <div class="holiday-card-footer">
          <span class="holiday-day-badge"><i class="fa-regular fa-calendar"></i> ${Formatter.weekday(holiday.date)}</span>
          <div class="holiday-card-actions">
            <button class="holiday-action-btn ${saved ? "saved" : ""}" type="button" data-save="${id}" aria-label="Save holiday">
              <i class="fa-${saved ? "solid" : "regular"} fa-heart"></i>
            </button>
          </div>
        </div>
      </article>
    `;
  }
}
