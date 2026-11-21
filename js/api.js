import { CONFIG, sitePath } from "./config.js";
import { Formatter } from "./utils.js";

export class HttpClient {
  async getJson(url, { timeout = 12000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }
}

export class NagerService extends HttpClient {
  async countries() {
    const list = await this.getJson(`${CONFIG.nager}/AvailableCountries`);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  async holidays(year, code) {
    return this.getJson(`${CONFIG.nager}/PublicHolidays/${year}/${code}`);
  }

  async longWeekends(year, code) {
    return this.getJson(`${CONFIG.nager}/LongWeekend/${year}/${code}`);
  }
}

export class CountryDirectory extends HttpClient {
  constructor() {
    super();
    this.byCode = new Map();
    this.remoteCache = new Map();
    this.ready = null;
  }

  load() {
    if (!this.ready) {
      this.ready = this.getJson(sitePath(CONFIG.countriesData)).then((rows) => {
        rows.forEach((row) => this.byCode.set(row.cca2, row));
      });
    }
    return this.ready;
  }

  get(code) {
    return this.byCode.get(code) || null;
  }

  async details(code) {
    await this.load();
    const local = this.get(code);
    if (this.remoteCache.has(code)) return this.remoteCache.get(code);
    const remote = await this.fetchRemote(code);
    const normalized = remote ? this.normalize(remote, local) : this.normalize(null, local);
    this.remoteCache.set(code, normalized);
    return normalized;
  }

  async fetchRemote(code) {
    try {
      const data = await this.getJson(`${CONFIG.restCountries}/alpha/${code}`, { timeout: 4000 });
      if (Array.isArray(data) && data[0]?.name) return data[0];
      return null;
    } catch {
      return null;
    }
  }

  normalize(remote, local) {
    const base = local || {
      cca2: remote?.cca2 || "",
      name: remote?.name?.common || "",
      official: remote?.name?.official || "",
      capital: remote?.capital?.[0] || "",
      region: remote?.region || "",
      subregion: remote?.subregion || "",
      continent: remote?.continents?.[0] || remote?.region || "",
      population: remote?.population ?? null,
      area: remote?.area ?? null,
      languages: remote?.languages ? Object.values(remote.languages) : [],
      currencies: [],
      callingCode: "",
      timezone: remote?.timezones?.[0] || "",
      timezoneLabel: remote?.timezones?.[0] || "",
      borders: remote?.borders || [],
      lat: remote?.latlng?.[0] ?? null,
      lng: remote?.latlng?.[1] ?? null,
      drivingSide: "Right",
      weekStarts: "Monday",
    };

    if (!remote) {
      return {
        ...base,
        flag: Formatter.flagSvg(base.cca2),
        maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(base.name || base.cca2)}`,
        capitalLat: null,
        capitalLng: null,
      };
    }

    const suffixes = remote.idd?.suffixes || [];
    const currencies = remote.currencies
      ? Object.entries(remote.currencies).map(([code, info]) => ({
          code,
          name: info.name,
          symbol: info.symbol || "",
        }))
      : base.currencies;

    return {
      ...base,
      name: remote.name?.common || base.name,
      official: remote.name?.official || base.official,
      capital: remote.capital?.[0] || base.capital,
      region: remote.region || base.region,
      subregion: remote.subregion || base.subregion,
      continent: remote.continents?.[0] || base.continent || base.region,
      population: remote.population ?? base.population,
      area: remote.area ?? base.area,
      languages: remote.languages ? Object.values(remote.languages) : base.languages,
      currencies,
      callingCode: remote.idd?.root ? `${remote.idd.root}${suffixes[0] || ""}` : base.callingCode,
      timezone: remote.timezones?.[0] || base.timezone,
      timezoneLabel: remote.timezones?.[0] || base.timezoneLabel,
      borders: remote.borders?.length ? remote.borders : base.borders,
      flag: remote.flags?.svg || remote.flags?.png || Formatter.flagSvg(base.cca2),
      maps: remote.maps?.googleMaps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(base.name)}`,
      capitalLat: remote.capitalInfo?.latlng?.[0] ?? null,
      capitalLng: remote.capitalInfo?.latlng?.[1] ?? null,
      drivingSide: remote.car?.side ? Formatter.capitalize(remote.car.side) : base.drivingSide,
      weekStarts: remote.startOfWeek ? Formatter.capitalize(remote.startOfWeek) : base.weekStarts,
    };
  }

  async locateCapital(code) {
    const details = await this.details(code);
    if (!details) return null;
    if (details.capitalLat != null && details.capitalLng != null) {
      return { name: details.capital || details.name, lat: details.capitalLat, lon: details.capitalLng };
    }

    const cacheKey = `wanderlust-geo-${code}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);

    const name = details.capital || details.name;
    const url = new URL(CONFIG.geocoding);
    url.searchParams.set("name", name);
    url.searchParams.set("count", "5");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    url.searchParams.set("countryCode", code);

    try {
      const json = await this.getJson(url.toString());
      const results = json.results || [];
      const pick = results.find((item) => item.feature_code === "PPLC") || results[0];
      const place = pick
        ? { name: pick.name, lat: pick.latitude, lon: pick.longitude, timezone: pick.timezone }
        : details.lat != null
          ? { name, lat: details.lat, lon: details.lng }
          : null;
      if (place) sessionStorage.setItem(cacheKey, JSON.stringify(place));
      return place;
    } catch {
      if (details.lat == null) return null;
      return { name, lat: details.lat, lon: details.lng };
    }
  }
}

export class WeatherService extends HttpClient {
  async forecast(lat, lon) {
    const url = new URL(CONFIG.openMeteo);
    url.searchParams.set("latitude", lat);
    url.searchParams.set("longitude", lon);
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m");
    url.searchParams.set("hourly", "temperature_2m,weather_code,precipitation_probability");
    url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant");
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", "7");
    return this.getJson(url.toString());
  }
}

export class EventService extends HttpClient {
  async search(city, countryCode, segmentId = "") {
    const url = new URL(CONFIG.ticketmaster);
    url.searchParams.set("apikey", CONFIG.ticketmasterKey);
    url.searchParams.set("city", city);
    url.searchParams.set("countryCode", countryCode);
    url.searchParams.set("size", "20");
    url.searchParams.set("sort", "date,asc");
    if (segmentId) url.searchParams.set("segmentId", segmentId);
    const json = await this.getJson(url.toString());
    return json?._embedded?.events || [];
  }

  static image(event) {
    const images = event.images || [];
    const preferred = [...images].sort((a, b) => (a.width || 0) - (b.width || 0)).find((image) => (image.width || 0) >= 400);
    return preferred?.url || images[0]?.url || "";
  }

  static normalize(event, selection) {
    const venue = event._embedded?.venues?.[0];
    const price = event.priceRanges?.[0];
    const segment = event.classifications?.[0]?.segment?.name || "Event";
    return {
      id: event.id,
      name: event.name,
      date: event.dates?.start?.localDate || "",
      time: event.dates?.start?.localTime ? event.dates.start.localTime.slice(0, 5) : "",
      venue: venue?.name || "Venue to be announced",
      city: venue?.city?.name || selection.cityName || "",
      countryCode: selection.countryCode,
      countryName: selection.countryName,
      category: segment,
      image: EventService.image(event),
      url: event.url || "",
      price: price ? `${price.min}${price.max && price.max !== price.min ? `–${price.max}` : ""} ${price.currency || ""}`.trim() : "See tickets",
    };
  }
}

export class CurrencyService extends HttpClient {
  constructor() {
    super();
    this.payload = null;
  }

  async rates() {
    if (this.payload) return this.payload;
    const urls = [`${CONFIG.exchangeRateFallback}/USD`, `${CONFIG.exchangeRate}/USD`];
    let lastError = null;
    for (const url of urls) {
      try {
        const json = await this.getJson(url, { timeout: 6000 });
        const rates = json?.conversion_rates || json?.rates;
        if (rates && typeof rates === "object") {
          this.payload = { ...json, conversion_rates: rates };
          return this.payload;
        }
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Exchange rates were empty");
  }

  convert(amount, from, to) {
    const rates = this.payload?.conversion_rates || {};
    const fromRate = rates[from];
    const toRate = rates[to];
    if (!fromRate || !toRate) return null;
    return (Number(amount) * toRate) / fromRate;
  }
}

export class SunService extends HttpClient {
  async times(lat, lon, date) {
    const url = new URL(CONFIG.sunrise);
    url.searchParams.set("lat", lat);
    url.searchParams.set("lng", lon);
    url.searchParams.set("date", date);
    url.searchParams.set("formatted", "0");
    const json = await this.getJson(url.toString());
    if (json.status !== "OK") throw new Error(json.status || "Sun times failed");
    return json.results;
  }
}
