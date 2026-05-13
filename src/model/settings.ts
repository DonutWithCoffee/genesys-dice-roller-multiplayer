type Listener<Payload> = (value: Payload) => void;

export class Settings<Payload> {
  readonly name: string;

  private value: Payload;
  private listeners: Set<Listener<Payload>> = new Set();

  constructor(name: string, initialValue: Payload) {
    this.name = name;
    this.value = initialValue;

    const savedValue = window.localStorage.getItem(name);

    if (savedValue) {
      this.value = JSON.parse(savedValue).value;
    }
  }

  on(callback: Listener<Payload>): void {
    this.listeners.add(callback);
  }

  off(callback: Listener<Payload>): void {
    this.listeners.delete(callback);
  }

  get(): Payload {
    return this.value;
  }

  set(value: Payload): void {
    if (value === this.value) {
      return;
    }

    this.value = value;

    window.localStorage.setItem(this.name, JSON.stringify({ value }));

    this.listeners.forEach(listener => listener(value));
  }
}

type ThemeOptions = "light" | "dark" | null;

const themeOptionList: ThemeOptions[] = ["light", "dark", null];

class ThemeSettings extends Settings<ThemeOptions> {
  constructor() {
    super("theme", null);
  }

  getClass(): NonNullable<ThemeOptions> {
    const selectedTheme = this.get();

    if (selectedTheme) {
      return selectedTheme;
    }

    if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }

    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }

    return "light";
  }

  toggle(): void {
    const newThemeIndex = (themeOptionList.indexOf(this.get()) + 1) % themeOptionList.length;

    this.set(themeOptionList[newThemeIndex]);
  }
}

export const Theme = new ThemeSettings();