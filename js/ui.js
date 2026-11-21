import { Formatter } from "./utils.js";

export class Toast {
  constructor() {
    this.container = document.getElementById("toast-container");
  }

  show(message, type = "info") {
    if (!this.container) return;
    const icons = {
      success: "fa-circle-check",
      error: "fa-circle-xmark",
      warning: "fa-triangle-exclamation",
      info: "fa-circle-info",
    };
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fa-solid ${icons[type] || icons.info}"></i>
      <span>${Formatter.escape(message)}</span>
      <button class="toast-close" type="button" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>
    `;
    toast.querySelector(".toast-close").addEventListener("click", () => toast.remove());
    this.container.appendChild(toast);
    setTimeout(() => toast.remove(), 3400);
  }
}

export class LoadingOverlay {
  constructor() {
    this.el = document.getElementById("loading-overlay");
    this.text = document.getElementById("loading-text");
  }

  show(message = "Loading...") {
    if (this.text) this.text.textContent = message;
    this.el?.classList.remove("hidden");
  }

  hide() {
    this.el?.classList.add("hidden");
  }
}

export class CustomSelect {
  constructor(select, { placeholder = "Select", showFlags = false } = {}) {
    this.select = select;
    this.placeholder = placeholder;
    this.showFlags = showFlags;
    this.select.style.display = "none";
    this.wrapper = document.createElement("div");
    this.wrapper.className = "custom-select-wrapper";
    this.wrapper.innerHTML = `
      <div class="custom-select-trigger" tabindex="0">
        <span class="flag"></span>
        <span class="selected-text placeholder">${Formatter.escape(placeholder)}</span>
        <i class="fa-solid fa-chevron-down arrow"></i>
      </div>
      <div class="custom-select-dropdown">
        <div class="custom-select-search">
          <i class="fa-solid fa-search"></i>
          <input type="text" placeholder="Search..." />
        </div>
        <div class="custom-select-options"></div>
      </div>
    `;
    this.select.insertAdjacentElement("afterend", this.wrapper);
    this.trigger = this.wrapper.querySelector(".custom-select-trigger");
    this.dropdown = this.wrapper.querySelector(".custom-select-dropdown");
    this.flag = this.wrapper.querySelector(".flag");
    this.label = this.wrapper.querySelector(".selected-text");
    this.search = this.wrapper.querySelector("input");
    this.list = this.wrapper.querySelector(".custom-select-options");
    this.bind();
  }

  bind() {
    this.trigger.addEventListener("click", () => this.toggle());
    this.search.addEventListener("input", () => this.render(this.search.value));
    this.search.addEventListener("click", (event) => event.stopPropagation());
    this.list.addEventListener("click", (event) => {
      const option = event.target.closest("[data-value]");
      if (!option) return;
      this.select.value = option.dataset.value;
      this.select.dispatchEvent(new Event("change", { bubbles: true }));
      this.sync();
      this.close();
    });
    document.addEventListener("click", (event) => {
      if (!this.wrapper.contains(event.target)) this.close();
    });
  }

  toggle() {
    const open = this.dropdown.classList.contains("open");
    document.querySelectorAll(".custom-select-dropdown.open, .currency-custom-dropdown.open").forEach((node) => {
      node.classList.remove("open");
      node.previousElementSibling?.classList.remove("open");
    });
    if (!open) {
      this.dropdown.classList.add("open");
      this.trigger.classList.add("open");
      this.search.value = "";
      this.render("");
      this.search.focus();
    }
  }

  close() {
    this.dropdown.classList.remove("open");
    this.trigger.classList.remove("open");
  }

  setOptions(items, selectedValue) {
    this.select.innerHTML = items
      .map((item) => {
        const flags = [
          item.flag ? `data-flag="${Formatter.escape(item.flag)}"` : "",
          item.lat != null && item.lat !== "" ? `data-lat="${item.lat}"` : "",
          item.lon != null && item.lon !== "" ? `data-lon="${item.lon}"` : "",
        ].filter(Boolean).join(" ");
        return `<option value="${Formatter.escape(item.value)}" ${flags}>${Formatter.escape(item.label)}</option>`;
      })
      .join("");
    if (selectedValue != null) this.select.value = selectedValue;
    this.sync();
  }

  options() {
    return [...this.select.options].map((option) => ({
      value: option.value,
      label: option.textContent,
      flag: option.dataset.flag || "",
      lat: option.dataset.lat || "",
      lon: option.dataset.lon || "",
    }));
  }

  render(query = "") {
    const needle = query.trim().toLowerCase();
    const items = this.options().filter((item) => item.label.toLowerCase().includes(needle) || item.value.toLowerCase().includes(needle));
    if (!items.length) {
      this.list.innerHTML = `<div class="custom-select-option no-results">No matches</div>`;
      return;
    }
    this.list.innerHTML = items
      .map((item) => `
        <div class="custom-select-option" data-value="${Formatter.escape(item.value)}">
          ${item.flag ? `<img src="${Formatter.flag(item.flag)}" alt="" width="22" height="16">` : ""}
          <span>${Formatter.escape(item.label)}</span>
        </div>
      `)
      .join("");
  }

  sync() {
    const selected = this.options().find((item) => item.value === this.select.value);
    if (!selected || !selected.value) {
      this.label.textContent = this.placeholder;
      this.label.classList.add("placeholder");
      this.flag.innerHTML = "";
      return;
    }
    this.label.textContent = selected.label;
    this.label.classList.remove("placeholder");
    this.flag.innerHTML = selected.flag ? `<img src="${Formatter.flag(selected.flag)}" alt="">` : "";
  }
}

export class CurrencySelect {
  constructor(select) {
    this.select = select;
    this.wrapper = document.createElement("div");
    this.wrapper.className = "currency-custom-select";
    this.wrapper.innerHTML = `
      <div class="currency-custom-trigger">
        <span class="currency-code">---</span>
        <span class="currency-name">Select currency</span>
        <i class="fa-solid fa-chevron-down arrow"></i>
      </div>
      <div class="currency-custom-dropdown">
        <div class="currency-custom-search">
          <input type="text" placeholder="Search currency..." />
        </div>
        <div class="currency-custom-options"></div>
      </div>
    `;
    this.select.insertAdjacentElement("afterend", this.wrapper);
    this.trigger = this.wrapper.querySelector(".currency-custom-trigger");
    this.dropdown = this.wrapper.querySelector(".currency-custom-dropdown");
    this.code = this.wrapper.querySelector(".currency-code");
    this.name = this.wrapper.querySelector(".currency-name");
    this.search = this.wrapper.querySelector("input");
    this.list = this.wrapper.querySelector(".currency-custom-options");
    this.trigger.addEventListener("click", () => this.toggle());
    this.search.addEventListener("input", () => this.render(this.search.value));
    this.search.addEventListener("click", (event) => event.stopPropagation());
    this.list.addEventListener("click", (event) => {
      const option = event.target.closest("[data-value]");
      if (!option) return;
      this.select.value = option.dataset.value;
      this.select.dispatchEvent(new Event("change", { bubbles: true }));
      this.sync();
      this.close();
    });
    document.addEventListener("click", (event) => {
      if (!this.wrapper.contains(event.target)) this.close();
    });
  }

  toggle() {
    const open = this.dropdown.classList.contains("open");
    document.querySelectorAll(".custom-select-dropdown.open, .currency-custom-dropdown.open").forEach((node) => {
      node.classList.remove("open");
      node.previousElementSibling?.classList.remove("open");
    });
    if (!open) {
      this.dropdown.classList.add("open");
      this.trigger.classList.add("open");
      this.search.value = "";
      this.render("");
      this.search.focus();
    }
  }

  close() {
    this.dropdown.classList.remove("open");
    this.trigger.classList.remove("open");
  }

  setOptions(items, selected) {
    this.select.innerHTML = items
      .map((item) => `<option value="${item.code}">${item.code} — ${Formatter.escape(item.name)}</option>`)
      .join("");
    this.items = items;
    if (selected) this.select.value = selected;
    this.sync();
  }

  render(query = "") {
    const needle = query.trim().toLowerCase();
    const items = (this.items || []).filter((item) => item.code.toLowerCase().includes(needle) || item.name.toLowerCase().includes(needle));
    this.list.innerHTML = items.length
      ? items.map((item) => `
          <div class="currency-custom-option" data-value="${item.code}">
            <strong>${item.code}</strong>
            <span>${Formatter.escape(item.name)}</span>
          </div>
        `).join("")
      : `<div class="currency-custom-option no-results">No matches</div>`;
  }

  sync() {
    const item = (this.items || []).find((entry) => entry.code === this.select.value);
    this.code.textContent = item?.code || "---";
    this.name.textContent = item?.name || "Select currency";
  }
}
