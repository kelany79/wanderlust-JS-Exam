import { CONFIG } from "./config.js";

export class Selection {
  constructor() {
    this.countryCode = null;
    this.countryName = null;
    this.cityName = null;
    this.cityLat = null;
    this.cityLon = null;
    this.year = new Date().getFullYear();
    this.restore();
  }

  restore() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(CONFIG.selectionKey) || "null");
      if (saved?.countryCode) Object.assign(this, saved);
    } catch {
    }
  }

  update(partial) {
    Object.assign(this, partial);
    sessionStorage.setItem(CONFIG.selectionKey, JSON.stringify(this.toJSON()));
  }

  clear() {
    this.countryCode = null;
    this.countryName = null;
    this.cityName = null;
    this.cityLat = null;
    this.cityLon = null;
    this.year = new Date().getFullYear();
    sessionStorage.removeItem(CONFIG.selectionKey);
  }

  toJSON() {
    return {
      countryCode: this.countryCode,
      countryName: this.countryName,
      cityName: this.cityName,
      cityLat: this.cityLat,
      cityLon: this.cityLon,
      year: this.year,
    };
  }

  hasCountry() {
    return Boolean(this.countryCode);
  }

  hasCity() {
    return this.cityLat != null && this.cityLon != null && this.cityName;
  }
}

export class SavedPlan {
  constructor({ id, type, data, savedAt }) {
    this.id = id;
    this.type = type;
    this.data = data;
    this.savedAt = savedAt;
  }
}

export class PlanStore {
  constructor() {
    this.plans = this.load();
    this.listeners = new Set();
  }

  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(CONFIG.plansKey) || "[]");
      return Array.isArray(raw) ? raw.map((item) => new SavedPlan(item)) : [];
    } catch {
      return [];
    }
  }

  persist() {
    localStorage.setItem(
      CONFIG.plansKey,
      JSON.stringify(this.plans.map((plan) => ({ id: plan.id, type: plan.type, data: plan.data, savedAt: plan.savedAt }))),
    );
    this.listeners.forEach((listener) => listener(this.plans));
  }

  subscribe(listener) {
    this.listeners.add(listener);
  }

  identity(type, data) {
    if (type === "holiday") return `${data.countryCode}|${data.date}|${data.name}`;
    if (type === "event") return String(data.id);
    if (type === "longweekend") return `${data.countryCode}|${data.startDate}|${data.endDate}`;
    return JSON.stringify(data);
  }

  has(type, data) {
    const key = this.identity(type, data);
    return this.plans.some((plan) => plan.type === type && this.identity(plan.type, plan.data) === key);
  }

  add(type, data) {
    if (this.has(type, data)) return false;
    this.plans.unshift(new SavedPlan({
      id: Date.now(),
      type,
      data,
      savedAt: new Date().toISOString(),
    }));
    this.persist();
    return true;
  }

  remove(id) {
    this.plans = this.plans.filter((plan) => plan.id !== id);
    this.persist();
  }

  clear() {
    this.plans = [];
    this.persist();
  }

  count(type) {
    if (!type || type === "all") return this.plans.length;
    return this.plans.filter((plan) => plan.type === type).length;
  }

  filtered(type) {
    if (!type || type === "all") return this.plans;
    return this.plans.filter((plan) => plan.type === type);
  }
}
