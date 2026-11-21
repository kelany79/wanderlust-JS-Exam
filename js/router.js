import { siteBase } from "./config.js";

const VIEW_PATHS = {
  dashboard: "/dashboard",
  holidays: "/holidays/",
  events: "/events/",
  weather: "/weather/",
  "long-weekends": "/long-weekends/",
  "my-plans": "/plans/",
  currency: "/currency/",
  "sun-times": "/sun-times/",
};

export class Router {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.pathToView = new Map(
      Object.entries(VIEW_PATHS).map(([view, path]) => [Router.normalize(path), view]),
    );
  }

  static normalize(path) {
    let value = String(path || "/").split("?")[0].split("#")[0];
    if (!value.startsWith("/")) value = `/${value}`;
    const base = siteBase();
    if (base && (value === base || value.startsWith(`${base}/`))) {
      value = value.slice(base.length) || "/";
    }
    if (value.length > 1 && value.endsWith("/")) value = value.slice(0, -1);
    if (value.endsWith("/index.html")) value = value.slice(0, -"/index.html".length) || "/";
    return value || "/";
  }

  pathFor(view) {
    return `${siteBase()}${VIEW_PATHS[view] || "/dashboard"}`;
  }

  viewFromLocation() {
    const path = Router.normalize(location.pathname);
    if (path === "/" || path === "/index.html") return "dashboard";
    return this.pathToView.get(path) || "dashboard";
  }

  go(view, { replace = false } = {}) {
    const path = this.pathFor(view);
    if (Router.normalize(location.pathname) !== Router.normalize(path)) {
      history[replace ? "replaceState" : "pushState"]({ view }, "", path);
    }
    this.onNavigate(view);
  }

  start() {
    window.addEventListener("popstate", () => this.onNavigate(this.viewFromLocation()));
    document.querySelectorAll(".nav-item").forEach((link) => {
      const view = link.dataset.view;
      if (view) link.setAttribute("href", this.pathFor(view));
      link.addEventListener("click", (event) => {
        if (!view) return;
        event.preventDefault();
        this.go(view);
      });
    });
    const initial = this.viewFromLocation();
    history.replaceState({ view: initial }, "", this.pathFor(initial));
    this.onNavigate(initial);
  }
}
