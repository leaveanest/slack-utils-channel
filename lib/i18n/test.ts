import { assertEquals, assertExists } from "std/testing/asserts.ts";
import {
  detectLocale,
  getLocale,
  initI18n,
  loadLocale,
  setLocale,
  SUPPORTED_LOCALES,
  t,
} from "./mod.ts";
import { checkI18n } from "./check.ts";

Deno.test({
  name: "detectLocale: デフォルトは日本語",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const originalLocale = Deno.env.get("LOCALE");
    const originalLang = Deno.env.get("LANG");

    try {
      Deno.env.delete("LOCALE");
      Deno.env.delete("LANG");

      const locale = detectLocale();
      assertEquals(locale, "ja");
    } finally {
      if (originalLocale) Deno.env.set("LOCALE", originalLocale);
      if (originalLang) Deno.env.set("LANG", originalLang);
    }
  },
});

Deno.test({
  name: "detectLocale: LOCALE環境変数から検出",
  sanitizeResources: false, // i18n auto-init causes resource tracking issues
  sanitizeOps: false, // Disable op sanitizer for this test
  fn: () => {
    const original = Deno.env.get("LOCALE");

    try {
      Deno.env.set("LOCALE", "ja");
      const locale = detectLocale();
      assertEquals(locale, "ja");
    } finally {
      if (original) {
        Deno.env.set("LOCALE", original);
      } else {
        Deno.env.delete("LOCALE");
      }
    }
  },
});

Deno.test("detectLocale: LANG環境変数から検出（ja_JP.UTF-8形式）", () => {
  const originalLocale = Deno.env.get("LOCALE");
  const originalLang = Deno.env.get("LANG");

  try {
    Deno.env.delete("LOCALE");
    Deno.env.set("LANG", "ja_JP.UTF-8");

    const locale = detectLocale();
    assertEquals(locale, "ja");
  } finally {
    if (originalLocale) Deno.env.set("LOCALE", originalLocale);
    if (originalLang) {
      Deno.env.set("LANG", originalLang);
    } else {
      Deno.env.delete("LANG");
    }
  }
});

Deno.test("loadLocale: 英語ロケールを読み込める", async () => {
  const data = await loadLocale("en");
  assertExists(data);
  assertExists(data.errors);
  assertExists(data.messages);
  assertExists(data.logs);
});

Deno.test("loadLocale: 日本語ロケールを読み込める", async () => {
  const data = await loadLocale("ja");
  assertExists(data);
  assertExists(data.errors);
  assertExists(data.messages);
  assertExists(data.logs);
});

Deno.test("setLocale/getLocale: ロケールを設定・取得できる", () => {
  const original = getLocale();

  try {
    setLocale("ja");
    assertEquals(getLocale(), "ja");

    setLocale("en");
    assertEquals(getLocale(), "en");
  } finally {
    setLocale(original as "en" | "ja");
  }
});

Deno.test("t: キーから翻訳を取得できる（英語）", async () => {
  await initI18n();
  setLocale("en");

  const message = t("errors.unknown_error");
  assertEquals(message, "An unexpected error occurred");
});

Deno.test("t: キーから翻訳を取得できる（日本語）", async () => {
  await initI18n();
  setLocale("ja");

  const message = t("errors.unknown_error");
  assertEquals(message, "予期しないエラーが発生しました");
});

Deno.test("t: プレースホルダーを置き換えられる", async () => {
  await initI18n();
  setLocale("en");

  const message = t("errors.channel_not_found", { error: "not_found" });
  assertEquals(message, "Failed to load channel info: not_found");
});

Deno.test("t: 複数のプレースホルダーを置き換えられる", async () => {
  await initI18n();
  setLocale("en");

  const message = t("messages.channel_summary", {
    name: "general",
    count: "42",
  });
  assertEquals(message, "Channel: general, Members: 42");
});

Deno.test("t: 存在しないキーの場合はキー自体を返す", async () => {
  await initI18n();
  setLocale("en");

  const message = t("nonexistent.key");
  assertEquals(message, "nonexistent.key");
});

Deno.test("t: プレースホルダーが不足している場合は元の形式を保持", async () => {
  await initI18n();
  setLocale("en");

  const message = t("errors.channel_not_found"); // errorパラメータなし
  assertEquals(message, "Failed to load channel info: {error}");
});

Deno.test("checkI18n: 全ての言語ファイルのキーが一致する", async () => {
  const result = await checkI18n();
  assertEquals(
    result.success,
    true,
    `I18n check failed: ${JSON.stringify(result.errors, null, 2)}`,
  );
});

Deno.test("checkI18n: プレースホルダーが一致する", async () => {
  const result = await checkI18n();

  const placeholderErrors = result.errors.filter((e) =>
    e.includes("placeholder")
  );
  assertEquals(
    placeholderErrors.length,
    0,
    `Placeholder errors found: ${JSON.stringify(placeholderErrors, null, 2)}`,
  );
});

Deno.test("initI18n: 初期化が成功する", async () => {
  await initI18n();
  const locale = getLocale();
  assertEquals(SUPPORTED_LOCALES.includes(locale as "en" | "ja"), true);
});

Deno.test("SUPPORTED_LOCALES: サポート言語が定義されている", () => {
  assertEquals(SUPPORTED_LOCALES.length, 2);
  assertEquals(SUPPORTED_LOCALES.includes("en"), true);
  assertEquals(SUPPORTED_LOCALES.includes("ja"), true);
});
