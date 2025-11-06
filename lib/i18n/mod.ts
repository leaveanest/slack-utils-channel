/**
 * I18n (Internationalization) utility for multi-language support
 *
 * This module provides functions to load and access localized messages
 * in English and Japanese.
 */

type LocaleData = Record<string, unknown>;

let currentLocale = "en";
const localeCache: Map<string, LocaleData> = new Map();

/**
 * Supported languages
 */
export const SUPPORTED_LOCALES = ["en", "ja"] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

/**
 * Load locale data from JSON file
 *
 * @param lang - Language code (e.g., "en", "ja")
 * @returns Locale data object
 * @throws {Error} If locale file cannot be loaded
 */
export async function loadLocale(lang: string): Promise<LocaleData> {
  if (localeCache.has(lang)) {
    return localeCache.get(lang)!;
  }

  try {
    // Try to load from file system
    const localePath = new URL(
      `../../locales/${lang}.json`,
      import.meta.url,
    );
    const response = await fetch(localePath);

    if (!response.ok) {
      throw new Error(`Failed to load locale: ${lang}`);
    }

    const data = await response.json();
    localeCache.set(lang, data);
    return data;
  } catch (error) {
    // Fallback to English if locale not found
    if (lang !== "en") {
      console.warn(
        `Failed to load locale ${lang}, falling back to English:`,
        error,
      );
      return await loadLocale("en");
    }
    throw error;
  }
}

/**
 * Set the current locale
 *
 * @param lang - Language code (e.g., "en", "ja")
 */
export function setLocale(lang: SupportedLocale): void {
  currentLocale = lang;
}

/**
 * Get the current locale
 *
 * @returns Current language code
 */
export function getLocale(): string {
  return currentLocale;
}

/**
 * Detect locale from environment variables
 *
 * Checks LOCALE, LANG, and defaults to "en"
 *
 * @returns Detected locale code
 */
export function detectLocale(): SupportedLocale {
  // Check LOCALE environment variable first
  const locale = Deno.env.get("LOCALE") || Deno.env.get("LANG") || "en";

  // Extract language code (e.g., "ja_JP.UTF-8" -> "ja")
  const langCode = locale.split(/[_.]/)[0].toLowerCase();

  // Return if supported, otherwise default to English
  return SUPPORTED_LOCALES.includes(langCode as SupportedLocale)
    ? langCode as SupportedLocale
    : "en";
}

/**
 * Get nested value from object using dot notation
 *
 * @param obj - Object to search
 * @param path - Dot-separated path (e.g., "errors.channel_not_found")
 * @returns Value at path, or undefined if not found
 */
function getNestedValue(obj: LocaleData, path: string): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (
      current === null || current === undefined ||
      typeof current !== "object"
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" ? current : undefined;
}

/**
 * Replace placeholders in a string with values
 *
 * @param template - Template string with placeholders (e.g., "Hello {name}")
 * @param params - Object with placeholder values
 * @returns String with placeholders replaced
 */
function replacePlaceholders(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

/**
 * Translate a message key to the current locale
 *
 * @param key - Message key in dot notation (e.g., "errors.channel_not_found")
 * @param params - Optional parameters to replace placeholders
 * @returns Translated message with placeholders replaced
 *
 * @example
 * ```typescript
 * // Simple translation
 * t("errors.unknown_error") // => "An unexpected error occurred"
 *
 * // With parameters
 * t("errors.channel_not_found", { error: "not_found" })
 * // => "Failed to load channel info: not_found"
 * ```
 */
export function t(
  key: string,
  params?: Record<string, string | number>,
): string {
  const localeData = localeCache.get(currentLocale);

  if (!localeData) {
    console.warn(`Locale ${currentLocale} not loaded, using key as fallback`);
    return replacePlaceholders(key, params);
  }

  const message = getNestedValue(localeData, key);

  if (!message) {
    // Try fallback to English
    if (currentLocale !== "en") {
      const enData = localeCache.get("en");
      if (enData) {
        const enMessage = getNestedValue(enData, key);
        if (enMessage) {
          return replacePlaceholders(enMessage, params);
        }
      }
    }

    console.warn(`Translation key not found: ${key}`);
    return replacePlaceholders(key, params);
  }

  return replacePlaceholders(message, params);
}

/**
 * Initialize i18n system
 *
 * Detects locale and loads the appropriate locale file
 *
 * @returns Promise that resolves when locale is loaded
 */
export async function initI18n(): Promise<void> {
  const locale = detectLocale();
  setLocale(locale);

  // Load both English (fallback) and current locale
  await loadLocale("en");
  if (locale !== "en") {
    await loadLocale(locale);
  }
}

// Auto-initialize if running in Deno
if (typeof Deno !== "undefined") {
  // Initialize on first import
  initI18n().catch((error) => {
    console.error("Failed to initialize i18n:", error);
  });
}
