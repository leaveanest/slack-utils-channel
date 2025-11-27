import { assertEquals } from "std/testing/asserts.ts";
import {
  createPrivateChannelWithAdminApi,
  normalizeChannelName,
} from "./mod.ts";
import { initI18n } from "../../lib/i18n/mod.ts";

// テスト前にi18nを初期化
await initI18n();

/**
 * normalizeChannelName のテスト
 */
Deno.test("normalizeChannelName: 正常にチャンネル名を正規化できる", () => {
  assertEquals(normalizeChannelName("Project Alpha"), "project-alpha");
  assertEquals(normalizeChannelName("Test Channel"), "test-channel");
  assertEquals(normalizeChannelName("my_channel"), "my_channel");
});

Deno.test("normalizeChannelName: 特殊文字を除去する", () => {
  assertEquals(normalizeChannelName("Test@#Channel!"), "testchannel");
  assertEquals(normalizeChannelName("Project $%^ Beta"), "project--beta");
});

Deno.test("normalizeChannelName: 80文字以内に制限する", () => {
  const longName = "a".repeat(100);
  const result = normalizeChannelName(longName);
  assertEquals(result.length, 80);
});

Deno.test("normalizeChannelName: 空文字を返す（無効な文字のみの場合）", () => {
  assertEquals(normalizeChannelName("@#$%"), "");
});

/**
 * createPrivateChannelWithAdminApi のテスト
 * 実際のAPIは呼び出さず、fetch をモックしてテスト
 */

// fetch のモック用グローバル変数
const originalFetch = globalThis.fetch;

function mockFetch(
  response: { ok: boolean; channel_id?: string; error?: string },
) {
  globalThis.fetch = () =>
    Promise.resolve({
      json: () => Promise.resolve(response),
    } as Response);
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

Deno.test({
  name: "createPrivateChannelWithAdminApi: 正常にチャンネルを作成できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    mockFetch({ ok: true, channel_id: "C123456789" });

    try {
      const result = await createPrivateChannelWithAdminApi(
        "xoxp-test-token",
        "test-channel",
        "T12345678",
      );

      assertEquals(result.ok, true);
      assertEquals(result.channel_id, "C123456789");
      assertEquals(result.error, undefined);
    } finally {
      restoreFetch();
    }
  },
});

Deno.test({
  name: "createPrivateChannelWithAdminApi: エラー時には error を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    mockFetch({ ok: false, error: "name_taken" });

    try {
      const result = await createPrivateChannelWithAdminApi(
        "xoxp-test-token",
        "test-channel",
        "T12345678",
      );

      assertEquals(result.ok, false);
      assertEquals(result.error, "name_taken");
      assertEquals(result.channel_id, undefined);
    } finally {
      restoreFetch();
    }
  },
});

Deno.test({
  name: "createPrivateChannelWithAdminApi: APIが不明なエラーを返す場合",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    mockFetch({ ok: false });

    try {
      const result = await createPrivateChannelWithAdminApi(
        "xoxp-test-token",
        "test-channel",
        "T12345678",
      );

      assertEquals(result.ok, false);
      // エラーが存在することを確認
      assertEquals(typeof result.error, "string");
    } finally {
      restoreFetch();
    }
  },
});

/**
 * fetch リクエストの内容を検証するテスト
 */
Deno.test({
  name: "createPrivateChannelWithAdminApi: 正しいパラメータでAPIを呼び出す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    let capturedUrl = "";
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = (
      url: string | URL | Request,
      options?: RequestInit,
    ): Promise<Response> => {
      capturedUrl = url.toString();
      capturedOptions = options;
      return Promise.resolve({
        json: () => Promise.resolve({ ok: true, channel_id: "C123456789" }),
      } as Response);
    };

    try {
      await createPrivateChannelWithAdminApi(
        "xoxp-my-admin-token",
        "project-alpha",
        "T98765432",
      );

      // URL の検証
      assertEquals(
        capturedUrl,
        "https://slack.com/api/admin.conversations.create",
      );

      // メソッドの検証
      assertEquals(capturedOptions?.method, "POST");

      // ヘッダーの検証
      const headers = capturedOptions?.headers as Record<string, string>;
      assertEquals(headers["Authorization"], "Bearer xoxp-my-admin-token");
      assertEquals(headers["Content-Type"], "application/json; charset=utf-8");

      // ボディの検証
      const body = JSON.parse(capturedOptions?.body as string);
      assertEquals(body.name, "project-alpha");
      assertEquals(body.is_private, true);
      assertEquals(body.team_id, "T98765432");
    } finally {
      restoreFetch();
    }
  },
});
