export class View {
  constructor(app, name) {
    this.app = app;
    this.name = name;
  }

  async show() {}

  empty(icon, title, message) {
    return `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid ${icon}"></i></div>
        <h3>${title}</h3>
        <p>${message}</p>
        <button class="btn-primary" type="button" onclick="navigateTo('dashboard')">
          <i class="fa-solid fa-globe"></i>
          Go to Dashboard
        </button>
      </div>
    `;
  }

  loading(message) {
    return `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-spinner fa-spin"></i></div>
        <h3>${message}</h3>
      </div>
    `;
  }
}
