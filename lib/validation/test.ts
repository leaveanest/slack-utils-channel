import { assertEquals } from "std/testing/asserts.ts";
import {
  getLocale,
  initI18n,
  loadLocale,
  setLocale,
  SUPPORTED_LOCALES,
} from "../i18n/mod.ts";
import {
  channelIdSchema,
  createChannelIdSchema,
  createNonEmptyStringSchema,
  createUserIdSchema,
  nonEmptyStringSchema,
  userIdSchema,
} from "./schemas.ts";

// i18n初期化
await initI18n();

// テストで使用する全てのロケールを事前に読み込む
await loadLocale("en");
await loadLocale("ja");

const originalLocale = getLocale() as typeof SUPPORTED_LOCALES[number];

Deno.test("channelIdSchema: 正常なチャンネルIDを検証", () => {
  const result = channelIdSchema.safeParse("C12345678");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "C12345678");
  }
});

Deno.test("channelIdSchema: 不正なチャンネルIDを拒否（小文字）", () => {
  const result = channelIdSchema.safeParse("c12345678");
  assertEquals(result.success, false);
});

Deno.test("channelIdSchema: 不正なチャンネルIDを拒否（Cで開始しない）", () => {
  const result = channelIdSchema.safeParse("U12345678");
  assertEquals(result.success, false);
});

Deno.test("channelIdSchema: 空文字を拒否", () => {
  const result = channelIdSchema.safeParse("");
  assertEquals(result.success, false);
});

Deno.test("userIdSchema: 正常なユーザーIDを検証（U開始）", () => {
  const result = userIdSchema.safeParse("U0812GLUZD2");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "U0812GLUZD2");
  }
});

Deno.test("userIdSchema: 正常なユーザーIDを検証（W開始）", () => {
  const result = userIdSchema.safeParse("W1234567890");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "W1234567890");
  }
});

Deno.test("userIdSchema: 不正なユーザーIDを拒否", () => {
  const result = userIdSchema.safeParse("invalid");
  assertEquals(result.success, false);
});

Deno.test("userIdSchema: 空文字を拒否", () => {
  const result = userIdSchema.safeParse("");
  assertEquals(result.success, false);
});

Deno.test("nonEmptyStringSchema: 正常な文字列を検証", () => {
  const result = nonEmptyStringSchema.safeParse("Hello, World!");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "Hello, World!");
  }
});

Deno.test("nonEmptyStringSchema: 空文字を拒否", () => {
  const result = nonEmptyStringSchema.safeParse("");
  assertEquals(result.success, false);
});

Deno.test("nonEmptyStringSchema: 空白のみの文字列を許可", () => {
  // 空白のみの文字列は許可される（trimはしない）
  const result = nonEmptyStringSchema.safeParse("   ");
  assertEquals(result.success, true);
});

// i18n対応のテスト
Deno.test({
  name: "channelIdSchema: エラーメッセージが英語で表示される",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("en");
    const schema = createChannelIdSchema();
    const result = schema.safeParse("invalid");

    assertEquals(result.success, false);
    if (!result.success) {
      assertEquals(
        result.error.errors[0].message,
        "Channel ID must start with 'C' followed by uppercase alphanumeric characters",
      );
    }
    setLocale(originalLocale); // 元に戻す
  },
});

Deno.test({
  name: "channelIdSchema: エラーメッセージが日本語で表示される",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("ja");
    const schema = createChannelIdSchema();
    const result = schema.safeParse("invalid");

    assertEquals(result.success, false);
    if (!result.success) {
      // 日本語のエラーメッセージを確認（部分一致）
      assertEquals(
        result.error.errors[0].message.includes("チャンネルID"),
        true,
      );
    }
    setLocale(originalLocale); // 元に戻す
  },
});

Deno.test({
  name: "userIdSchema: エラーメッセージが英語で表示される",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("en");
    const schema = createUserIdSchema();
    const result = schema.safeParse("invalid");

    assertEquals(result.success, false);
    if (!result.success) {
      assertEquals(
        result.error.errors[0].message,
        "User ID must start with 'U' or 'W' followed by uppercase alphanumeric characters",
      );
    }
    setLocale(originalLocale); // 元に戻す
  },
});

Deno.test({
  name: "userIdSchema: 空のユーザーIDでエラーメッセージが日本語で表示される",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("ja");
    const schema = createUserIdSchema();
    const result = schema.safeParse("");

    assertEquals(result.success, false);
    if (!result.success) {
      // 日本語のエラーメッセージを確認（部分一致）
      assertEquals(
        result.error.errors[0].message.includes("ユーザーID"),
        true,
      );
    }
    setLocale(originalLocale); // 元に戻す
  },
});

Deno.test({
  name: "nonEmptyStringSchema: エラーメッセージが英語で表示される",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("en");
    const schema = createNonEmptyStringSchema();
    const result = schema.safeParse("");

    assertEquals(result.success, false);
    if (!result.success) {
      assertEquals(
        result.error.errors[0].message,
        "Value cannot be empty",
      );
    }
    setLocale(originalLocale); // 元に戻す
  },
});

Deno.test({
  name: "nonEmptyStringSchema: エラーメッセージが日本語で表示される",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("ja");
    const schema = createNonEmptyStringSchema();
    const result = schema.safeParse("");

    assertEquals(result.success, false);
    if (!result.success) {
      // 日本語のエラーメッセージを確認（部分一致）
      assertEquals(
        result.error.errors[0].message.includes("空"),
        true,
      );
    }
    setLocale(originalLocale); // 元に戻す
  },
});

Deno.test({
  name: "デフォルトスキーマ: ロケール変更に動的に対応する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    // 英語でバリデーション（デフォルトスキーマ使用）
    setLocale("en");
    const result1 = channelIdSchema.safeParse("invalid");
    assertEquals(result1.success, false);
    if (!result1.success) {
      assertEquals(
        result1.error.errors[0].message,
        "Channel ID must start with 'C' followed by uppercase alphanumeric characters",
      );
    }

    // 同じスキーマインスタンスで日本語に切り替え
    setLocale("ja");
    const result2 = channelIdSchema.safeParse("invalid");
    assertEquals(result2.success, false);
    if (!result2.success) {
      // 日本語のエラーメッセージが表示される
      assertEquals(
        result2.error.errors[0].message.includes("チャンネルID"),
        true,
      );
    }

    // 英語に戻す
    setLocale("en");
    const result3 = channelIdSchema.safeParse("invalid");
    assertEquals(result3.success, false);
    if (!result3.success) {
      // 再び英語のエラーメッセージが表示される
      assertEquals(
        result3.error.errors[0].message,
        "Channel ID must start with 'C' followed by uppercase alphanumeric characters",
      );
    }

    setLocale(originalLocale); // 元に戻す
  },
});
