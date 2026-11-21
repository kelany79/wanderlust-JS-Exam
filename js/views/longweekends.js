import { View } from "./base.js";
import { Formatter } from "../utils.js";

export class LongWeekendsView extends View {
  async show() {
    const root = document.getElementById("lw-content");
    const selection = this.app.selection;
    if (!selection.hasCountry()) {
      root.innerHTML = this.empty("fa-umbrella-beach", "No Country Selected", "Select a country from the dashboard to discover long weekend opportunities");
      return;
    }

    root.innerHTML = this.loading("Looking for long weekends...");
    try {
      const weekends = await this.app.nager.longWeekends(selection.year, selection.countryCode);
      if (!weekends.length) {
        root.innerHTML = this.empty("fa-umbrella-beach", "No Long Weekends", `${selection.countryName} has no long-weekend breaks listed for ${selection.year}.`);
        return;
      }
      root.innerHTML = weekends.map((weekend) => this.card(weekend)).join("");
    } catch (error) {
      console.error(error);
      root.innerHTML = this.empty("fa-umbrella-beach", "Could Not Load Long Weekends", "This country may not publish long-weekend data for the selected year.");
    }
  }

  card(weekend) {
    const selection = this.app.selection;
    const data = {
      startDate: weekend.startDate,
      endDate: weekend.endDate,
      dayCount: weekend.dayCount,
      needBridgeDay: Boolean(weekend.needBridgeDay),
      countryCode: selection.countryCode,
      countryName: selection.countryName,
      year: selection.year,
    };
    const saved = this.app.plans.has("longweekend", data);
    const id = this.app.stash("longweekend", data);
    const days = Formatter.eachDate(weekend.startDate, weekend.endDate).map((date) => {
      const iso = Formatter.isoDate(date);
      const weekendDay = date.getDay() === 0 || date.getDay() === 6;
      return `
        <div class="lw-day ${weekendDay ? "weekend" : "holiday"}">
          <div class="name">${Formatter.shortWeekday(iso)}</div>
          <div class="num">${date.getDate()}</div>
        </div>
      `;
    }).join("");
    const note = weekend.needBridgeDay
      ? `Take one bridge day off and you get ${weekend.dayCount} days away.`
      : `This break is already ${weekend.dayCount} days, with no extra day off needed.`;

    return `
      <article class="lw-card">
        <div class="lw-card-header">
          <div>
            <h3>${weekend.dayCount} days</h3>
            <p class="lw-dates">${Formatter.date(weekend.startDate)} – ${Formatter.date(weekend.endDate)}</p>
          </div>
          <span class="lw-badge">${weekend.needBridgeDay ? "Bridge day" : "Ready to go"}</span>
          <button class="holiday-action-btn ${saved ? "saved" : ""}" type="button" data-save="${id}" aria-label="Save long weekend">
            <i class="fa-${saved ? "solid" : "regular"} fa-heart"></i>
          </button>
        </div>
        <div class="lw-days-visual">${days}</div>
        <div class="lw-info-box"><i class="fa-solid fa-info-circle"></i><span>${note}</span></div>
      </article>
    `;
  }
}
