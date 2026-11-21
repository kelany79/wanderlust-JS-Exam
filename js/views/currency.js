import { View } from "./base.js";
import { POPULAR_CURRENCIES } from "../config.js";
import { Formatter } from "../utils.js";
import { CurrencySelect } from "../ui.js";

export class CurrencyView extends View {
  constructor(app) {
    super(app, "currency");
    this.ready = false;
    this.fromSelect = null;
    this.toSelect = null;
  }

  async show() {
    if (this.ready) {
      this.convert();
      return;
    }
    const popular = document.getElementById("popular-currencies");
    popular.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-spinner fa-spin"></i></div><h3>Loading live rates...</h3></div>`;
    try {
      const payload = await this.app.currency.rates();
      const names = new Intl.DisplayNames(["en"], { type: "currency" });
      const items = Object.keys(payload.conversion_rates || {})
        .sort()
        .map((code) => ({
          code,
          name: this.safeName(names, code),
        }));
      const from = document.getElementById("currency-from");
      const to = document.getElementById("currency-to");
      this.fromSelect = new CurrencySelect(from);
      this.toSelect = new CurrencySelect(to);
      this.fromSelect.setOptions(items, "USD");
      this.toSelect.setOptions(items, "EUR");
      from.addEventListener("change", () => this.convert());
      to.addEventListener("change", () => this.convert());
      document.getElementById("currency-amount").addEventListener("input", () => this.convert());
      this.paintPopular(payload);
      this.ready = true;
      this.convert();
    } catch (error) {
      console.error(error);
      popular.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-coins"></i></div><h3>Rates Unavailable</h3><p>The exchange service did not respond. Try again shortly.</p></div>`;
    }
  }

  safeName(names, code) {
    try {
      return names.of(code) || code;
    } catch {
      return code;
    }
  }

  paintPopular(payload) {
    const root = document.getElementById("popular-currencies");
    root.innerHTML = POPULAR_CURRENCIES.map((currency) => {
      const rate = payload.conversion_rates?.[currency.code];
      return `
        <button class="popular-currency-card" type="button" data-quick-currency="${currency.code}">
          <img src="${Formatter.flag(currency.flag)}" alt="" class="flag">
          <div class="info">
            <div class="code">${currency.code}</div>
            <div class="name">${currency.name}</div>
          </div>
          <div class="rate">${rate ? Formatter.money(rate) : "—"}</div>
        </button>
      `;
    }).join("");
  }

  convert() {
    if (!this.ready) return;
    const amount = Number(document.getElementById("currency-amount").value);
    const from = document.getElementById("currency-from").value;
    const to = document.getElementById("currency-to").value;
    const result = this.app.currency.convert(amount, from, to);
    const box = document.getElementById("currency-result");
    if (result == null || !Number.isFinite(amount)) {
      box.classList.add("hidden");
      return;
    }
    const unit = this.app.currency.convert(1, from, to);
    box.classList.remove("hidden");
    document.getElementById("result-from-amount").textContent = Formatter.money(amount);
    document.getElementById("result-from-code").textContent = from;
    document.getElementById("result-to-amount").textContent = Formatter.money(result);
    document.getElementById("result-to-code").textContent = to;
    document.getElementById("rate-from").textContent = from;
    document.getElementById("rate-value").textContent = Formatter.money(unit);
    document.getElementById("rate-to").textContent = to;
    const updated = this.app.currency.payload?.time_last_update_utc || this.app.currency.payload?.time_last_update_utc;
    document.getElementById("rate-date").textContent = updated ? `Last updated: ${updated}` : "Live rate";
  }

  swap() {
    if (!this.ready) return;
    const from = document.getElementById("currency-from");
    const to = document.getElementById("currency-to");
    const next = from.value;
    from.value = to.value;
    to.value = next;
    this.fromSelect.sync();
    this.toSelect.sync();
    this.convert();
  }

  quick(code) {
    if (!this.ready) return;
    document.getElementById("currency-to").value = code;
    this.toSelect.sync();
    this.convert();
  }
}
