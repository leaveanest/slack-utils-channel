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
 * Embedded locale data for Run on Slack environment
 * (File system access is restricted in production)
 */
const EMBEDDED_LOCALES: Record<string, LocaleData> = {
  en: {
    errors: {
      channel_not_found: "Failed to load channel info: {error}",
      unknown_error: "An unexpected error occurred",
      invalid_input: "Invalid input provided",
      api_error: "API request failed: {message}",
      api_call_failed: "API call failed: {error}",
      data_not_found: "Required data not found",
      invalid_type: "Invalid type: expected {expected}, got {actual}",
      empty_value: "Value cannot be empty",
      invalid_format: "Invalid format for {field}: expected {pattern}",
      channel_members_fetch_failed: "Failed to fetch channel members: {error}",
      channel_create_failed: "Failed to create channel: {error}",
      invalid_channel_name: "Invalid channel name: {name}",
      member_invite_failed: "Failed to invite members: {error}",
      channel_topic_set_failed: "Failed to set channel topic: {error}",
      validation: {
        channel_id_empty: "Channel ID cannot be empty",
        channel_id_format:
          "Channel ID must start with 'C' followed by uppercase alphanumeric characters",
        user_id_empty: "User ID cannot be empty",
        user_id_format:
          "User ID must start with 'U' or 'W' followed by uppercase alphanumeric characters",
        value_empty: "Value cannot be empty",
        channel_name_empty: "Channel name cannot be empty",
        channel_name_too_long: "Channel name must be 80 characters or less",
      },
    },
    messages: {
      channel_summary: "Channel: {name}, Members: {count}",
      success: "Operation completed successfully",
      processing: "Processing request...",
      channel_created: "Channel '{name}' created successfully",
      members_invited: "{count} members invited to the channel",
    },
    logs: {
      starting: "Starting workflow...",
      completed: "Workflow completed",
      loading_channel: "Loading channel information...",
      channel_loaded: "Channel {name} loaded successfully",
      fetching_members: "Fetching members for channel {channelId}...",
      creating_channel: "Creating private channel: {name}",
      channel_created_private: "Private channel created with ID: {id}",
      inviting_members: "Inviting {count} members...",
    },
  },
  ja: {
    errors: {
      channel_not_found: "チャンネル情報の読み込みに失敗しました: {error}",
      unknown_error: "予期しないエラーが発生しました",
      invalid_input: "無効な入力が提供されました",
      api_error: "APIリクエストに失敗しました: {message}",
      api_call_failed: "API呼び出しに失敗しました: {error}",
      data_not_found: "必要なデータが見つかりません",
      invalid_type:
        "無効なタイプ: 期待されるのは {expected} で、取得されたのは {actual} です",
      empty_value: "値を空にすることはできません",
      invalid_format: "{field} の形式が無効です: 期待されるのは {pattern} です",
      channel_members_fetch_failed:
        "チャンネルメンバーの取得に失敗しました: {error}",
      channel_create_failed: "チャンネルの作成に失敗しました: {error}",
      invalid_channel_name: "無効なチャンネル名です: {name}",
      member_invite_failed: "メンバーの招待に失敗しました: {error}",
      channel_topic_set_failed:
        "チャンネルトピックの設定に失敗しました: {error}",
      validation: {
        channel_id_empty: "チャンネルIDを空にすることはできません",
        channel_id_format:
          "チャンネルIDは 'C' で始まり、大文字の英数字が続く必要があります",
        user_id_empty: "ユーザーIDを空にすることはできません",
        user_id_format:
          "ユーザーIDは 'U' または 'W' で始まり、大文字の英数字が続く必要があります",
        value_empty: "値を空にすることはできません",
        channel_name_empty: "チャンネル名を空にすることはできません",
        channel_name_too_long: "チャンネル名は80文字以内である必要があります",
      },
    },
    messages: {
      channel_summary: "チャンネル: {name}, メンバー数: {count}",
      success: "操作が正常に完了しました",
      processing: "リクエストを処理中...",
      channel_created: "チャンネル '{name}' を作成しました",
      members_invited: "{count} 人のメンバーをチャンネルに招待しました",
    },
    logs: {
      starting: "ワークフローを開始しています...",
      completed: "ワークフローが完了しました",
      loading_channel: "チャンネル情報を読み込み中...",
      channel_loaded: "チャンネル {name} が正常に読み込まれました",
      fetching_members: "チャンネル {channelId} のメンバーを取得中...",
      creating_channel: "プライベートチャンネルを作成中: {name}",
      channel_created_private:
        "プライベートチャンネルを作成しました（ID: {id}）",
      inviting_members: "{count} 人のメンバーを招待中...",
    },
  },
};

/**
 * Load locale data from embedded data or JSON file
 *
 * @param lang - Language code (e.g., "en", "ja")
 * @returns Locale data object
 * @throws {Error} If locale file cannot be loaded
 */
export async function loadLocale(lang: string): Promise<LocaleData> {
  if (localeCache.has(lang)) {
    return localeCache.get(lang)!;
  }

  // First, try to use embedded locale data
  if (EMBEDDED_LOCALES[lang]) {
    localeCache.set(lang, EMBEDDED_LOCALES[lang]);
    return EMBEDDED_LOCALES[lang];
  }

  try {
    // Try to load from file system (for development)
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

    // If even English fails (e.g., in production environment with restricted file access),
    // return the embedded English data
    console.warn(
      `Failed to load English locale file, using embedded data:`,
      error,
    );
    const embeddedData = EMBEDDED_LOCALES[lang] || EMBEDDED_LOCALES.en;
    localeCache.set(lang, embeddedData);
    return embeddedData;
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
  try {
    // Check LOCALE environment variable first
    const locale = Deno.env.get("LOCALE") || Deno.env.get("LANG") || "en";

    // Extract language code (e.g., "ja_JP.UTF-8" -> "ja")
    const langCode = locale.split(/[_.]/)[0].toLowerCase();

    // Return if supported, otherwise default to English
    return SUPPORTED_LOCALES.includes(langCode as SupportedLocale)
      ? langCode as SupportedLocale
      : "en";
  } catch (_error) {
    // Environment variable access not allowed (e.g., in production environment)
    // Default to English
    return "en";
  }
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
