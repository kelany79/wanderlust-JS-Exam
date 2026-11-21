import { PAGE_META } from "./config.js";
import { CITIES } from "./cities.js";
import { Formatter } from "./utils.js";
import {
  NagerService,
  CountryDirectory,
  WeatherService,
  EventService,
  CurrencyService,
  SunService,
} from "./api.js";
import { Selection, PlanStore } from "./models.js";
import { Toast, LoadingOverlay, CustomSelect } from "./ui.js";
import { Router } from "./router.js";
import { DashboardView } from "./views/dashboard.js";
import { HolidaysView } from "./views/holidays.js";
import { EventsView } from "./views/events.js";
import { WeatherView } from "./views/weather.js";
import { LongWeekendsView } from "./views/longweekends.js";
import { PlansView } from "./views/plans.js";
import { CurrencyView } from "./views/currency.js";
import { SunTimesView } from "./views/sun.js";

class App {
  constructor() {
    this.selection = new Selection();
    this.plans = new PlanStore();
    this.toast = new Toast();
    this.loading = new LoadingOverlay();
    this.nager = new NagerService();
    this.countries = new CountryDirectory();
    this.weather = new WeatherService();
    this.events = new EventService();
    this.currency = new CurrencyService();
    this.sun = new SunService();
    this.countryList = [];
    this.holidayCount = null;
    this.payloads = new Map();
    this.seq = 0;
    this.current = "dashboard";
    this.views = {
      dashboard: new DashboardView(this),
      holidays: new HolidaysView(this),
      events: new EventsView(this),
      weather: new WeatherView(this),
      "long-weekends": new LongWeekendsView(this),
      "my-plans": new PlansView(this),
      currency: new CurrencyView(this),
      "sun-times": new SunTimesView(this),
    };
    this.router = new Router((view) => this.show(view));
  }

  async init() {
    this.bindGlobals();
    this.bindChrome();
    this.bindSelects();
    this.tickClock();
    this.loading.show("Loading countries...");
    try {
      await this.countries.load();
      this.countryList = await this.nager.countries();
      const year = new Date().getFullYear();
      this.countrySelect.setOptions([
        { value: "", label: "Select Country" },
        ...this.countryList.map((country) => ({
          value: country.countryCode,
          label: country.name,
          flag: country.countryCode,
        })),
      ]);
      this.yearSelect.setOptions(
        [0, 1, 2].map((offset) => {
          const value = String(year + offset);
          return { value, label: value };
        }),
        String(this.selection.year || year),
      );
      if (this.selection.hasCountry() && this.countryList.some((country) => country.countryCode === this.selection.countryCode)) {
        this.countrySelect.select.value = this.selection.countryCode;
        this.countrySelect.sync();
        await this.fillCities(this.selection.countryCode, this.selection.cityName);
        const details = await this.countries.details(this.selection.countryCode);
        this.views.dashboard.renderCountry(details);
      } else {
        this.selection.clear();
        this.citySelect.setOptions([{ value: "", label: "Select a country first" }]);
      }
      this.updateStats();
      this.paintSelection();
    } catch (error) {
      console.error(error);
      this.toast.show("Could not load the country list", "error");
    } finally {
      this.loading.hide();
    }
    this.plans.subscribe(() => this.updateStats());
    this.router.start();
  }

  bindGlobals() {
    window.navigateTo = (view) => this.router.go(view === "discover" ? "dashboard" : view);
    window.clearGlobalSelection = () => this.clearSelection();
    window.loadDashboardBorderCountry = (code) => this.openBorder(code);
    window.clearAllPlans = () => this.clearPlans();
    window.filterPlans = (filter) => {
      this.views["my-plans"].filter = filter;
      this.views["my-plans"].show();
    };
    window.convertCurrency = () => this.views.currency.convert();
    window.swapCurrencies = () => this.views.currency.swap();
    window.quickConvert = (code) => this.views.currency.quick(code);
    window.closeModal = () => document.getElementById("modal-overlay")?.classList.add("hidden");
  }

  bindChrome() {
    const menu = document.getElementById("mobile-menu-btn");
    const overlay = document.getElementById("sidebar-overlay");
    menu?.addEventListener("click", () => {
      document.getElementById("sidebar")?.classList.toggle("open");
      overlay?.classList.toggle("hidden");
    });
    overlay?.addEventListener("click", () => this.closeSidebar());
    document.getElementById("global-search-btn")?.addEventListener("click", () => this.explore());
    document.body.addEventListener("click", (event) => {
      const save = event.target.closest("[data-save]");
      if (save) {
        this.save(save.dataset.save);
        return;
      }
      const remove = event.target.closest("[data-remove]");
      if (remove) this.remove(remove.dataset.remove);
      const segment = event.target.closest("[data-event-segment]");
      if (segment) {
        this.views.events.segment = segment.dataset.eventSegment || "";
        this.views.events.show();
      }
      const quick = event.target.closest("[data-quick-currency]");
      if (quick) this.views.currency.quick(quick.dataset.quickCurrency);
    });
    setInterval(() => this.tickClock(), 30000);
  }

  bindSelects() {
    this.countrySelect = new CustomSelect(document.getElementById("global-country"), {
      placeholder: "Select Country",
      showFlags: true,
    });
    this.citySelect = new CustomSelect(document.getElementById("global-city"), {
      placeholder: "Select City",
    });
    this.yearSelect = new CustomSelect(document.getElementById("global-year"), {
      placeholder: "Select Year",
    });
    this.countrySelect.select.addEventListener("change", () => this.onCountryChange());
    this.citySelect.select.addEventListener("change", () => {
      this.applyCity(this.citySelect.select.value);
      this.paintSelection();
    });
    this.yearSelect.select.addEventListener("change", () => {
      this.selection.update({ year: Number(this.yearSelect.select.value) || new Date().getFullYear() });
      this.paintSelection();
    });
  }

  async onCountryChange() {
    const code = this.countrySelect.select.value;
    const year = Number(this.yearSelect.select.value) || new Date().getFullYear();
    if (!code) {
      this.clearSelection();
      return;
    }
    const country = this.countryList.find((item) => item.countryCode === code);
    this.selection.update({
      countryCode: code,
      countryName: country?.name || code,
      cityName: null,
      cityLat: null,
      cityLon: null,
      year,
    });
    this.holidayCount = null;
    await this.fillCities(code);
    this.paintSelection();
    this.updateStats();
  }

  async fillCities(code, preferredName = "") {
    const listed = CITIES[code];
    if (listed?.length) {
      this.citySelect.setOptions(
        [
          { value: "", label: "Select City" },
          ...listed.map((city) => ({ value: city.name, label: city.name, lat: city.lat, lon: city.lon })),
        ],
        preferredName,
      );
      if (preferredName) this.applyCity(preferredName);
      return;
    }

    this.citySelect.setOptions([{ value: "", label: "Loading capital city..." }]);
    const place = await this.countries.locateCapital(code);
    if (!place) {
      this.citySelect.setOptions([{ value: "", label: "No city data available" }]);
      return;
    }
    this.citySelect.setOptions(
      [{ value: place.name, label: `${place.name} (Capital)`, lat: place.lat, lon: place.lon }],
      place.name,
    );
    this.selection.update({ cityName: place.name, cityLat: place.lat, cityLon: place.lon });
  }

  applyCity(name) {
    const option = [...this.citySelect.select.options].find((item) => item.value === name);
    if (!option || !option.value) {
      this.selection.update({ cityName: null, cityLat: null, cityLon: null });
      return;
    }
    this.selection.update({
      cityName: option.value,
      cityLat: option.dataset.lat ? Number(option.dataset.lat) : null,
      cityLon: option.dataset.lon ? Number(option.dataset.lon) : null,
    });
  }

  async ensureCity() {
    if (this.selection.hasCity()) return true;
    if (!this.selection.hasCountry()) return false;
    const listed = CITIES[this.selection.countryCode];
    if (listed?.length) {
      const capital = listed[0];
      this.selection.update({ cityName: capital.name, cityLat: capital.lat, cityLon: capital.lon });
      this.citySelect.select.value = capital.name;
      this.citySelect.sync();
      this.paintSelection();
      return true;
    }
    const place = await this.countries.locateCapital(this.selection.countryCode);
    if (!place) return false;
    this.citySelect.setOptions(
      [{ value: place.name, label: `${place.name} (Capital)`, lat: place.lat, lon: place.lon }],
      place.name,
    );
    this.selection.update({ cityName: place.name, cityLat: place.lat, cityLon: place.lon });
    this.paintSelection();
    return true;
  }

  async explore() {
    if (!this.selection.hasCountry()) {
      this.toast.show("Select a country first", "warning");
      return;
    }
    this.selection.update({ year: Number(this.yearSelect.select.value) || this.selection.year });
    this.loading.show(`Exploring ${this.selection.countryName}...`);
    try {
      if (!this.selection.hasCity()) await this.ensureCity();
      const details = await this.countries.details(this.selection.countryCode);
      this.views.dashboard.renderCountry(details);
      try {
        const holidays = await this.nager.holidays(this.selection.year, this.selection.countryCode);
        this.holidayCount = Array.isArray(holidays) ? holidays.length : "—";
      } catch {
        this.holidayCount = "—";
      }
      this.paintSelection();
      this.updateStats();
      const place = this.selection.cityName
        ? `${this.selection.countryName}, ${this.selection.cityName}`
        : this.selection.countryName;
      this.toast.show(`Exploring ${place}!`, "success");
    } catch (error) {
      console.error(error);
      this.toast.show("Could not load this destination", "error");
    } finally {
      this.loading.hide();
    }
  }

  async openBorder(code) {
    const country = this.countryList.find((item) => item.countryCode === code);
    if (!country) {
      this.toast.show("That neighbor is outside the holiday country list", "info");
      return;
    }
    this.countrySelect.select.value = code;
    this.countrySelect.sync();
    await this.onCountryChange();
    await this.explore();
    this.router.go("dashboard");
  }

  clearSelection() {
    const year = Number(this.yearSelect?.select.value) || new Date().getFullYear();
    this.selection.clear();
    this.selection.update({ year });
    if (this.countrySelect) {
      this.countrySelect.select.value = "";
      this.countrySelect.sync();
    }
    this.citySelect?.setOptions([{ value: "", label: "Select a country first" }]);
    this.holidayCount = null;
    this.views.dashboard.placeholder();
    this.paintSelection();
    this.updateStats();
  }

  show(view) {
    this.current = view;
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.view === view);
    });
    document.querySelectorAll(".view").forEach((section) => section.classList.remove("active"));
    document.getElementById(`${view}-view`)?.classList.add("active");
    const meta = PAGE_META[view];
    if (meta) {
      document.getElementById("page-title").textContent = meta.title;
      document.getElementById("page-subtitle").textContent = meta.subtitle;
    }
    this.closeSidebar();
    this.paintSelection();
    this.views[view]?.show();
  }

  paintSelection() {
    const selection = this.selection;
    const box = document.getElementById("selected-destination");
    const flag = document.getElementById("selected-country-flag");
    const name = document.getElementById("selected-country-name");
    const city = document.getElementById("selected-city-name");
    if (selection.hasCountry()) {
      box?.classList.remove("hidden");
      if (flag) flag.src = Formatter.flag(selection.countryCode, "w80");
      if (name) name.textContent = selection.countryName;
      if (city) city.textContent = selection.cityName ? `${selection.cityName} · ${selection.year}` : String(selection.year);
    } else {
      box?.classList.add("hidden");
    }

    const pages = [
      ["holidays-flag", "holidays-country-name", "holidays-year-display", null],
      ["events-flag", "events-country-name", null, "events-city-name"],
      ["weather-flag", "weather-country-name", null, "weather-city-name"],
      ["lw-flag", "lw-country-name", "lw-year-display", null],
      ["sun-flag", "sun-country-name", null, "sun-city-name"],
    ];
    pages.forEach(([flagId, nameId, yearId, cityId]) => {
      const flagNode = document.getElementById(flagId);
      const nameNode = document.getElementById(nameId);
      const yearNode = yearId ? document.getElementById(yearId) : null;
      const cityNode = cityId ? document.getElementById(cityId) : null;
      if (!selection.hasCountry()) {
        if (flagNode) {
          flagNode.removeAttribute("src");
          flagNode.style.display = "none";
        }
        if (nameNode) nameNode.textContent = "No country selected";
        if (yearNode) yearNode.textContent = "";
        if (cityNode) cityNode.textContent = "";
        return;
      }
      if (flagNode) {
        flagNode.src = Formatter.flag(selection.countryCode);
        flagNode.style.display = "";
      }
      if (nameNode) nameNode.textContent = selection.countryName;
      if (yearNode) yearNode.textContent = selection.year;
      if (cityNode) cityNode.textContent = selection.cityName || "";
    });
  }

  updateStats() {
    const countries = document.getElementById("stat-countries");
    const holidays = document.getElementById("stat-holidays");
    const saved = document.getElementById("stat-saved");
    const badge = document.getElementById("plans-count");
    if (countries) countries.textContent = this.countryList.length ? String(this.countryList.length) : "90+";
    if (holidays) holidays.textContent = this.holidayCount == null ? "—" : String(this.holidayCount);
    if (saved) saved.textContent = String(this.plans.count());
    if (badge) {
      badge.textContent = String(this.plans.count());
      badge.classList.toggle("hidden", this.plans.count() === 0);
    }
  }

  stash(type, data) {
    const id = `${type}-${++this.seq}`;
    this.payloads.set(id, { type, data });
    return id;
  }

  save(id) {
    const payload = this.payloads.get(id);
    if (!payload) return;
    const added = this.plans.add(payload.type, payload.data);
    this.toast.show(added ? "Saved to My Plans!" : "Already saved!", added ? "success" : "info");
    this.updateStats();
    if (added && this.current !== "dashboard") this.views[this.current]?.show();
  }

  remove(id) {
    const finish = () => {
      this.plans.remove(Number(id));
      this.updateStats();
      this.views["my-plans"].show();
    };
    if (window.Swal) {
      window.Swal.fire({
        title: "Remove Plan?",
        text: "Are you sure you want to remove this plan?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#64748b",
        confirmButtonText: "Yes, remove it!",
      }).then((result) => {
        if (!result.isConfirmed) return;
        finish();
        window.Swal.fire({ title: "Removed!", icon: "success", timer: 1400, showConfirmButton: false });
      });
      return;
    }
    if (window.confirm("Remove this plan?")) finish();
  }

  clearPlans() {
    const finish = () => {
      this.plans.clear();
      this.updateStats();
      this.views["my-plans"].show();
    };
    if (!this.plans.count()) {
      this.toast.show("There are no saved plans to clear", "info");
      return;
    }
    if (window.Swal) {
      window.Swal.fire({
        title: "Clear all plans?",
        text: "This removes every saved holiday, event, and long weekend.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        confirmButtonText: "Clear all",
      }).then((result) => {
        if (result.isConfirmed) finish();
      });
      return;
    }
    if (window.confirm("Clear all saved plans?")) finish();
  }

  closeSidebar() {
    document.getElementById("sidebar")?.classList.remove("open");
    document.getElementById("sidebar-overlay")?.classList.add("hidden");
  }

  tickClock() {
    const node = document.getElementById("current-datetime");
    if (node) node.textContent = Formatter.clock();
  }
}

new App().init();
