import { View } from "./base.js";
import { Formatter } from "../utils.js";

export class PlansView extends View {
  constructor(app) {
    super(app, "my-plans");
    this.filter = "all";
  }

  show() {
    this.paintCounts();
    const root = document.getElementById("plans-content");
    const plans = this.app.plans.filtered(this.filter);
    document.querySelectorAll(".plan-filter").forEach((button) => {
      button.classList.toggle("active", button.dataset.filter === this.filter);
    });
    if (!plans.length) {
      root.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-heart-crack"></i></div>
          <h3>${this.filter === "all" ? "No Saved Plans Yet" : "Nothing in this filter"}</h3>
          <p>Start exploring and save holidays, events, or long weekends you like!</p>
          <button class="btn-primary" type="button" onclick="navigateTo('dashboard')">
            <i class="fa-solid fa-compass"></i>
            Start Exploring
          </button>
        </div>
      `;
      return;
    }
    root.innerHTML = plans.map((plan) => this.card(plan)).join("");
  }

  paintCounts() {
    const map = {
      "filter-all-count": this.app.plans.count(),
      "filter-holiday-count": this.app.plans.count("holiday"),
      "filter-event-count": this.app.plans.count("event"),
      "filter-lw-count": this.app.plans.count("longweekend"),
    };
    Object.entries(map).forEach(([id, count]) => {
      const node = document.getElementById(id);
      if (node) node.textContent = count;
    });
  }

  card(plan) {
    const labels = { holiday: "Holiday", event: "Event", longweekend: "Long Weekend" };
    const details = this.details(plan);
    return `
      <article class="plan-card">
        <span class="plan-card-type ${plan.type}">${labels[plan.type] || "Plan"}</span>
        <div class="plan-card-content">
          <h4>${Formatter.escape(this.title(plan))}</h4>
          <div class="plan-card-details">${details}</div>
          <div class="plan-card-actions">
            <button class="btn-plan-remove" type="button" data-remove="${plan.id}">
              <i class="fa-solid fa-trash"></i> Remove
            </button>
          </div>
        </div>
      </article>
    `;
  }

  title(plan) {
    if (plan.type === "holiday") return plan.data.name;
    if (plan.type === "event") return plan.data.name;
    return `${plan.data.dayCount}-day break`;
  }

  details(plan) {
    const data = plan.data;
    if (plan.type === "holiday") {
      return `
        <div><i class="fa-solid fa-location-dot"></i> ${Formatter.escape(data.countryName || "")}</div>
        <div><i class="fa-regular fa-calendar"></i> ${Formatter.date(data.date)} · ${Formatter.weekday(data.date)}</div>
        <div><i class="fa-solid fa-language"></i> ${Formatter.escape(data.localName || data.name)}</div>
      `;
    }
    if (plan.type === "event") {
      return `
        <div><i class="fa-solid fa-location-dot"></i> ${Formatter.escape(data.city || data.countryName || "")}</div>
        <div><i class="fa-regular fa-calendar"></i> ${Formatter.date(data.date)} ${data.time ? `· ${Formatter.escape(data.time)}` : ""}</div>
        <div><i class="fa-solid fa-ticket"></i> ${Formatter.escape(data.category || "Event")} · ${Formatter.escape(data.venue || "")}</div>
      `;
    }
    return `
      <div><i class="fa-solid fa-location-dot"></i> ${Formatter.escape(data.countryName || "")}</div>
      <div><i class="fa-regular fa-calendar"></i> ${Formatter.date(data.startDate)} – ${Formatter.date(data.endDate)}</div>
      <div><i class="fa-solid fa-umbrella-beach"></i> ${data.needBridgeDay ? "Needs a bridge day" : "No extra day off"}</div>
    `;
  }
}
