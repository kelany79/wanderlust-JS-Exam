import { View } from "./base.js";
import { EventService } from "../api.js";
import { EVENT_SEGMENTS } from "../config.js";
import { Formatter } from "../utils.js";

export class EventsView extends View {
  constructor(app) {
    super(app, "events");
    this.segment = "";
  }

  async show() {
    const root = document.getElementById("events-content");
    const toolbar = this.toolbar();
    if (!this.app.selection.hasCountry()) {
      toolbar.innerHTML = "";
      root.innerHTML = this.empty("fa-ticket", "No City Selected", "Select a country and city from the dashboard to discover events");
      return;
    }

    const ready = await this.app.ensureCity();
    if (!ready) {
      toolbar.innerHTML = "";
      root.innerHTML = this.empty("fa-ticket", "No City Selected", "Pick a city, or choose a country whose capital we can locate.");
      return;
    }

    toolbar.innerHTML = EVENT_SEGMENTS.map((segment) => `
      <button class="filter-chip ${segment.id === this.segment ? "active" : ""}" type="button" data-event-segment="${segment.id}">
        ${segment.label}
      </button>
    `).join("");
    root.innerHTML = this.loading(`Finding events in ${this.app.selection.cityName}...`);

    try {
      const events = await this.app.events.search(this.app.selection.cityName, this.app.selection.countryCode, this.segment);
      if (!events.length) {
        this.render(this.samples(), true);
        return;
      }
      this.render(events, false);
    } catch (error) {
      console.error(error);
      this.render(this.samples(), true);
    }
  }

  toolbar() {
    let bar = document.getElementById("events-toolbar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "events-toolbar";
      bar.className = "events-toolbar";
      document.getElementById("events-content").before(bar);
    }
    return bar;
  }

  render(events, sample) {
    const root = document.getElementById("events-content");
    if (!events.length) {
      root.innerHTML = this.empty("fa-ticket", "No Events Found", `Nothing is listed in ${this.app.selection.cityName} for this filter.`);
      return;
    }
    const note = sample
      ? `<div class="sample-note"><i class="fa-solid fa-info-circle"></i> No live listings came back for ${Formatter.escape(this.app.selection.cityName)}, so these sample events can still be saved to My Plans.</div>`
      : "";
    root.innerHTML = note + events.map((event) => this.card(EventService.normalize(event, this.app.selection))).join("");
  }

  card(event) {
    const saved = this.app.plans.has("event", event);
    const id = this.app.stash("event", event);
    const when = [Formatter.date(event.date), event.time].filter(Boolean).join(" · ");
    return `
      <article class="event-card">
        <div class="event-card-image">
          ${event.image ? `<img src="${Formatter.escape(event.image)}" alt="">` : ""}
          <span class="event-card-category">${Formatter.escape(event.category)}</span>
          <button class="event-card-save ${saved ? "saved" : ""}" type="button" data-save="${id}" aria-label="Save event">
            <i class="fa-${saved ? "solid" : "regular"} fa-heart"></i>
          </button>
        </div>
        <div class="event-card-body">
          <h3>${Formatter.escape(event.name)}</h3>
          <div class="event-card-info">
            <div><i class="fa-regular fa-calendar"></i> ${Formatter.escape(when || "Date TBA")}</div>
            <div><i class="fa-solid fa-location-dot"></i> ${Formatter.escape(event.venue)}${event.city ? `, ${Formatter.escape(event.city)}` : ""}</div>
          </div>
          <div class="event-card-footer">
            <div class="event-price">${Formatter.escape(event.price)}</div>
            ${event.url && event.url !== "#" ? `<a class="btn-buy-ticket" href="${Formatter.escape(event.url)}" target="_blank" rel="noopener">Tickets</a>` : `<span class="btn-event">Sample</span>`}
          </div>
        </div>
      </article>
    `;
  }

  samples() {
    const city = this.app.selection.cityName || "the city";
    const categories = [
      ["Music", "Jazz Night Live", "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=640&h=400&fit=crop"],
      ["Sports", "Championship Final", "https://images.unsplash.com/photo-1461896836934-aba008cd3e95?w=640&h=400&fit=crop"],
      ["Arts", "Evening at the Theatre", "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=640&h=400&fit=crop"],
      ["Music", "Open Air Festival", "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=640&h=400&fit=crop"],
    ];
    const today = new Date();
    const active = EVENT_SEGMENTS.find((item) => item.id === this.segment);
    const rows = !active?.label || active.label === "All"
      ? categories
      : categories.filter((item) => item[0] === active.label);
    const chosen = rows.length ? rows : [[active.label, `${active.label} Night`, categories[0][2]]];
    return chosen.map(([category, name, image], index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + 7 + index * 5);
      return {
        id: `sample-${city}-${index}`,
        name: `${name} in ${city}`,
        dates: { start: { localDate: Formatter.isoDate(date), localTime: `${18 + index}:00:00` } },
        _embedded: { venues: [{ name: `${city} Hall`, city: { name: city } }] },
        classifications: [{ segment: { name: category } }],
        images: [{ url: image, width: 640 }],
        priceRanges: [{ min: 25 + index * 10, max: 90 + index * 15, currency: "USD" }],
        url: "#",
      };
    });
  }
}
