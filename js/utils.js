export class Formatter {
  static escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  static flag(code, width = "w40") {
    if (!code) return "";
    return `https://flagcdn.com/${width}/${String(code).toLowerCase()}.png`;
  }

  static flagSvg(code) {
    if (!code) return "";
    return `https://flagcdn.com/${String(code).toLowerCase()}.svg`;
  }

  static date(iso) {
    const date = Formatter.parse(iso);
    if (!date) return "";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  static weekday(iso) {
    const date = Formatter.parse(iso);
    if (!date) return "";
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }

  static monthDay(iso) {
    const date = Formatter.parse(iso);
    if (!date) return { month: "", day: "" };
    return {
      month: date.toLocaleDateString("en-US", { month: "short" }),
      day: String(date.getDate()),
    };
  }

  static shortWeekday(iso) {
    const date = Formatter.parse(iso);
    if (!date) return "";
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }

  static time(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  }

  static wallTime(value) {
    const match = String(value || "").match(/T(\d{2}):(\d{2})/);
    if (!match) return Formatter.time(value);
    const hours = Number(match[1]);
    const minutes = match[2];
    const suffix = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes} ${suffix}`;
  }

  static timeInZone(value, zone) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    if (!zone) return Formatter.time(date);
    try {
      return date.toLocaleTimeString("en-US", {
        timeZone: zone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return Formatter.time(date);
    }
  }

  static clock(date = new Date()) {
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  static number(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "N/A";
    return number.toLocaleString("en-US");
  }

  static money(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return number.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  }

  static parse(iso) {
    if (!iso) return null;
    const value = String(iso);
    const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  static isoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  static eachDate(start, end) {
    const days = [];
    const cursor = Formatter.parse(start);
    const last = Formatter.parse(end);
    if (!cursor || !last) return days;
    while (cursor <= last) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }

  static capitalize(value) {
    const text = String(value || "");
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
  }
}

export class TimezoneClock {
  constructor(zone, label = "") {
    this.zone = zone || "UTC";
    this.label = label || zone || "UTC";
  }

  format(now = new Date()) {
    try {
      if (this.zone.includes("/") || this.zone.includes("UTC") === false) {
        return now.toLocaleTimeString("en-US", {
          timeZone: this.zone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });
      }
    } catch {
    }

    const match = String(this.zone).match(/UTC([+-])(\d{2}):?(\d{2})?/);
    if (match) {
      const sign = match[1] === "+" ? 1 : -1;
      const hours = Number(match[2]) || 0;
      const minutes = Number(match[3]) || 0;
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      return new Date(utc + sign * (hours * 3600000 + minutes * 60000)).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    }

    return now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }
}

const WEATHER = {
  0: { icon: "fa-sun", tone: "text-sun", desc: "Clear sky", theme: "weather-sunny" },
  1: { icon: "fa-sun", tone: "text-sun", desc: "Mainly clear", theme: "weather-sunny" },
  2: { icon: "fa-cloud-sun", tone: "text-sun", desc: "Partly cloudy", theme: "weather-cloudy" },
  3: { icon: "fa-cloud", tone: "text-cloud", desc: "Overcast", theme: "weather-cloudy" },
  45: { icon: "fa-smog", tone: "text-cloud", desc: "Fog", theme: "weather-foggy" },
  48: { icon: "fa-smog", tone: "text-cloud", desc: "Rime fog", theme: "weather-foggy" },
  51: { icon: "fa-cloud-rain", tone: "text-rain", desc: "Light drizzle", theme: "weather-rainy" },
  53: { icon: "fa-cloud-rain", tone: "text-rain", desc: "Drizzle", theme: "weather-rainy" },
  55: { icon: "fa-cloud-showers-heavy", tone: "text-rain", desc: "Dense drizzle", theme: "weather-rainy" },
  61: { icon: "fa-cloud-rain", tone: "text-rain", desc: "Slight rain", theme: "weather-rainy" },
  63: { icon: "fa-cloud-showers-heavy", tone: "text-rain", desc: "Rain", theme: "weather-rainy" },
  65: { icon: "fa-cloud-showers-heavy", tone: "text-rain", desc: "Heavy rain", theme: "weather-rainy" },
  71: { icon: "fa-snowflake", tone: "text-snow", desc: "Slight snow", theme: "weather-snowy" },
  73: { icon: "fa-snowflake", tone: "text-snow", desc: "Snow", theme: "weather-snowy" },
  75: { icon: "fa-snowflake", tone: "text-snow", desc: "Heavy snow", theme: "weather-snowy" },
  80: { icon: "fa-cloud-rain", tone: "text-rain", desc: "Rain showers", theme: "weather-rainy" },
  81: { icon: "fa-cloud-showers-heavy", tone: "text-rain", desc: "Heavy showers", theme: "weather-rainy" },
  82: { icon: "fa-cloud-showers-heavy", tone: "text-rain", desc: "Violent showers", theme: "weather-rainy" },
  95: { icon: "fa-cloud-bolt", tone: "text-storm", desc: "Thunderstorm", theme: "weather-stormy" },
  96: { icon: "fa-cloud-bolt", tone: "text-storm", desc: "Thunderstorm with hail", theme: "weather-stormy" },
  99: { icon: "fa-cloud-bolt", tone: "text-storm", desc: "Thunderstorm with hail", theme: "weather-stormy" },
};

export class WeatherCodes {
  static lookup(code) {
    return WEATHER[Number(code)] || { icon: "fa-cloud", tone: "text-cloud", desc: "Unknown", theme: "weather-default" };
  }

  static wind(degrees) {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const value = Number(degrees);
    if (!Number.isFinite(value)) return "";
    return dirs[Math.round(value / 45) % 8];
  }

  static uv(index) {
    const value = Number(index);
    if (!Number.isFinite(value)) return { label: "N/A", width: 0 };
    if (value < 3) return { label: "Low", width: 20 };
    if (value < 6) return { label: "Moderate", width: 45 };
    if (value < 8) return { label: "High", width: 65 };
    if (value < 11) return { label: "Very high", width: 85 };
    return { label: "Extreme", width: 100 };
  }
}
