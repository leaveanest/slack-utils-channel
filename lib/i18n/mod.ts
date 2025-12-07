/**
 * I18n (Internationalization) utility for multi-language support
 *
 * This module provides functions to load and access localized messages
 * in English and Japanese.
 */

type LocaleData = Record<string, unknown>;

let currentLocale = "ja";
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
      missing_team_id: "Team ID is required for Enterprise Grid environments",
      channel_info_failed: "Failed to get channel info: {error}",
      missing_notification_channel: "Notification channel ID is required",
      missing_admin_token:
        "Admin user token (SLACK_ADMIN_USER_TOKEN) is not configured",
      fetch_authorized_users_failed:
        "Failed to fetch authorized users: {error}",
      no_authorized_users:
        "No authorized users found. Please ensure there are admins or owners in the workspace.",
      modal_open_failed: "Failed to open the form: {error}",
      not_authorized_approver:
        "⚠️ You are not authorized to approve this request. Only <@{approver}> can approve or deny.",
      validation: {
        channel_id_empty: "Channel ID cannot be empty",
        channel_id_format:
          "Channel ID must start with 'C' (public), 'G' (private), or 'D' (DM) followed by uppercase alphanumeric characters",
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
      no_initial_members: "None",
      no_description: "No description",
      approval_request_title: "📋 Private Channel Request: #{channel}",
      approval_request_header: "🔒 Private Channel Creation Request",
      approval_request_details:
        "*Requester:* <@{requester}>\n*Channel Name:* `#{channel}`\n*Description:* {description}\n*Initial Members:* {members}",
      approve_button: "✅ Approve",
      deny_button: "❌ Deny",
      approval_context: "👤 Approval required from <@{approver}>",
      channel_approved:
        "✅ *Private channel approved and created!*\n\n*Channel:* <#{channel_id}|{channel}>\n*Approved by:* <@{reviewer}>\n*Requested by:* <@{requester}>",
      channel_denied:
        "❌ *Private channel request denied*\n\n*Channel:* `#{channel}`\n*Denied by:* <@{reviewer}>\n*Requested by:* <@{requester}>",
      channel_creation_failed:
        "⚠️ *Failed to create private channel*\n\n*Channel:* `#{channel}`\n*Error:* {error}",
      approved_at: "Approved at {time}",
      denied_at: "Denied at {time}",
    },
    form: {
      title: "Request Private Channel",
      submit_button: "Request",
      cancel_button: "Cancel",
      channel_name_label: "Channel Name",
      channel_name_placeholder: "project-alpha",
      channel_name_hint:
        "Name of the private channel (without #). Will be converted to lowercase.",
      approver_label: "Approver",
      approver_placeholder: "Select an approver",
      approver_hint:
        "Only admins and owners can approve private channel creation.",
      description_label: "Description",
      description_placeholder: "What is this channel for?",
      initial_members_label: "Initial Members",
      initial_members_placeholder: "Select members to invite",
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
      creating_channel_admin_api:
        "Creating private channel via Admin API: {name}",
      sending_approval_request:
        "Sending approval request for channel '{channel}' to approver '{approver}'",
      approval_request_sent: "Approval request sent successfully",
      creating_channel_after_approval:
        "Creating channel '{name}' after approval",
      members_invited: "{count} members invited to the channel",
      fetching_authorized_users: "Fetching authorized users for team: {teamId}",
      authorized_users_fetched:
        "Found {count} authorized users (admins/owners)",
      opening_form_with_authorized_users:
        "Opening form with {count} authorized users",
      modal_opened: "Modal opened successfully",
      max_page_limit_reached:
        "Maximum page limit ({limit}) reached, stopping pagination",
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
      missing_team_id: "Enterprise Grid環境ではチームIDが必要です",
      channel_info_failed: "チャンネル情報の取得に失敗しました: {error}",
      missing_notification_channel: "通知チャンネルIDが必要です",
      missing_admin_token:
        "管理者ユーザートークン（SLACK_ADMIN_USER_TOKEN）が設定されていません",
      fetch_authorized_users_failed:
        "認可ユーザーの取得に失敗しました: {error}",
      no_authorized_users:
        "認可ユーザーが見つかりません。ワークスペースに管理者またはオーナーがいることを確認してください。",
      modal_open_failed: "フォームを開くことができませんでした: {error}",
      not_authorized_approver:
        "⚠️ このリクエストを承認する権限がありません。<@{approver}> のみが承認または拒否できます。",
      validation: {
        channel_id_empty: "チャンネルIDを空にすることはできません",
        channel_id_format:
          "チャネルIDは'C'（パブリック）、'G'（プライベート）、または'D'（DM）で始まり、その後に大文字の英数字が続く必要があります",
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
      no_initial_members: "なし",
      no_description: "説明なし",
      approval_request_title:
        "📋 プライベートチャンネル作成リクエスト: #{channel}",
      approval_request_header: "🔒 プライベートチャンネル作成リクエスト",
      approval_request_details:
        "*リクエスト者:* <@{requester}>\n*チャンネル名:* `#{channel}`\n*説明:* {description}\n*初期メンバー:* {members}",
      approve_button: "✅ 承認",
      deny_button: "❌ 拒否",
      approval_context: "👤 <@{approver}> の承認が必要です",
      channel_approved:
        "✅ *プライベートチャンネルが承認・作成されました！*\n\n*チャンネル:* <#{channel_id}|{channel}>\n*承認者:* <@{reviewer}>\n*リクエスト者:* <@{requester}>",
      channel_denied:
        "❌ *プライベートチャンネルのリクエストが拒否されました*\n\n*チャンネル:* `#{channel}`\n*拒否者:* <@{reviewer}>\n*リクエスト者:* <@{requester}>",
      channel_creation_failed:
        "⚠️ *プライベートチャンネルの作成に失敗しました*\n\n*チャンネル:* `#{channel}`\n*エラー:* {error}",
      approved_at: "{time} に承認",
      denied_at: "{time} に拒否",
    },
    form: {
      title: "プライベートチャンネルをリクエスト",
      submit_button: "リクエスト",
      cancel_button: "キャンセル",
      channel_name_label: "チャンネル名",
      channel_name_placeholder: "project-alpha",
      channel_name_hint:
        "プライベートチャンネルの名前（#なし）。小文字に変換されます。",
      approver_label: "承認者",
      approver_placeholder: "承認者を選択してください",
      approver_hint:
        "管理者とオーナーのみがプライベートチャンネルの作成を承認できます。",
      description_label: "説明",
      description_placeholder: "このチャンネルの目的は？",
      initial_members_label: "初期メンバー",
      initial_members_placeholder: "招待するメンバーを選択してください",
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
      creating_channel_admin_api:
        "Admin API経由でプライベートチャンネルを作成中: {name}",
      sending_approval_request:
        "チャンネル '{channel}' の承認リクエストを '{approver}' に送信中",
      approval_request_sent: "承認リクエストを送信しました",
      creating_channel_after_approval: "承認後にチャンネル '{name}' を作成中",
      members_invited: "{count} 人のメンバーを招待しました",
      fetching_authorized_users: "チーム {teamId} の認可ユーザーを取得中です",
      authorized_users_fetched:
        "{count}人の認可ユーザー（管理者/オーナー）が見つかりました",
      opening_form_with_authorized_users:
        "{count}人の認可ユーザーでフォームを開いています",
      modal_opened: "モーダルが正常に開きました",
      max_page_limit_reached:
        "最大ページ数（{limit}）に達したため、ページネーションを停止します",
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
 * Checks LOCALE, LANG, and defaults to "ja"
 *
 * @returns Detected locale code
 */
export function detectLocale(): SupportedLocale {
  try {
    // Check LOCALE environment variable first
    const locale = Deno.env.get("LOCALE") || Deno.env.get("LANG") || "ja";

    // Extract language code (e.g., "ja_JP.UTF-8" -> "ja")
    const langCode = locale.split(/[_.]/)[0].toLowerCase();

    // Return if supported, otherwise default to Japanese
    return SUPPORTED_LOCALES.includes(langCode as SupportedLocale)
      ? langCode as SupportedLocale
      : "ja";
  } catch (_error) {
    // Environment variable access not allowed (e.g., in production environment)
    // Default to Japanese
    return "ja";
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
