export const CONFIG = {
  nager: "https://date.nager.at/api/v3",
  restCountries: "https://restcountries.com/v3.1",
  openMeteo: "https://api.open-meteo.com/v1/forecast",
  geocoding: "https://geocoding-api.open-meteo.com/v1/search",
  exchangeRate: "https://v6.exchangerate-api.com/v6/805842951e5953ad31497176/latest",
  exchangeRateFallback: "https://open.er-api.com/v6/latest",
  ticketmaster: "https://app.ticketmaster.com/discovery/v2/events.json",
  ticketmasterKey: "VwECw2OiAzxVzIqnwmKJUG41FbeXJk1y",
  sunrise: "https://api.sunrise-sunset.org/json",
  flags: "https://flagcdn.com",
  countriesData: "/data/countries.json",
  plansKey: "wanderlust_plans",
  selectionKey: "wanderlust_selection",
};

export function siteBase() {
  const path = location.pathname;
  if (path === "/wanderlust" || path.startsWith("/wanderlust/")) return "/wanderlust";
  return "";
}

export function sitePath(path) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${siteBase()}${suffix}`;
}

export const EVENT_SEGMENTS = [
  { id: "", label: "All" },
  { id: "KZFzniwnSyZfZ7v7nJ", label: "Music" },
  { id: "KZFzniwnSyZfZ7v7nE", label: "Sports" },
  { id: "KZFzniwnSyZfZ7v7na", label: "Arts" },
  { id: "KZFzniwnSyZfZ7v7nn", label: "Film" },
];

export const POPULAR_CURRENCIES = [
  { code: "EUR", name: "Euro", flag: "eu" },
  { code: "GBP", name: "British Pound", flag: "gb" },
  { code: "EGP", name: "Egyptian Pound", flag: "eg" },
  { code: "AED", name: "UAE Dirham", flag: "ae" },
  { code: "SAR", name: "Saudi Riyal", flag: "sa" },
  { code: "JPY", name: "Japanese Yen", flag: "jp" },
  { code: "CAD", name: "Canadian Dollar", flag: "ca" },
  { code: "INR", name: "Indian Rupee", flag: "in" },
];

export const PAGE_META = {
  dashboard: { title: "Dashboard", subtitle: "Welcome back! Ready to plan your next adventure?" },
  holidays: { title: "Holidays", subtitle: "Explore public holidays around the world" },
  events: { title: "Events", subtitle: "Find concerts, sports, and entertainment" },
  weather: { title: "Weather", subtitle: "Check forecasts for any destination" },
  "long-weekends": { title: "Long Weekends", subtitle: "Find the perfect mini-trip opportunities" },
  "my-plans": { title: "My Plans", subtitle: "Your saved holidays and events" },
  currency: { title: "Currency", subtitle: "Convert currencies with live exchange rates" },
  "sun-times": { title: "Sun Times", subtitle: "Check sunrise and sunset times worldwide" },
};
