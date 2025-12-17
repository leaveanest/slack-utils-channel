import { assertEquals } from "std/testing/asserts.ts";
import { getTeamSettings } from "./mod.ts";

// fetch のモック用グローバル変数
const originalFetch = globalThis.fetch;

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

/**
 * getTeamSettings関数のテスト
 */
Deno.test({
  name: "getTeamSettings: 正常にワークスペース設定を取得できる（everyone）",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    globalThis.fetch = () =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            ok: true,
            team: {
              id: "T12345",
              name: "test-workspace",
              who_can_create_private_channels: "everyone",
            },
          }),
      } as Response);

    try {
      const result = await getTeamSettings("xoxp-test-token", "T12345");
      assertEquals(result.who_can_create_private_channels, "everyone");
    } finally {
      restoreFetch();
    }
  },
});

Deno.test({
  name: "getTeamSettings: 正常にワークスペース設定を取得できる（admin）",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    globalThis.fetch = () =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            ok: true,
            team: {
              id: "T12345",
              name: "test-workspace",
              who_can_create_private_channels: "admin",
            },
          }),
      } as Response);

    try {
      const result = await getTeamSettings("xoxp-test-token", "T12345");
      assertEquals(result.who_can_create_private_channels, "admin");
    } finally {
      restoreFetch();
    }
  },
});

Deno.test({
  name: "getTeamSettings: フィールドがない場合はデフォルト値を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    globalThis.fetch = () =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            ok: true,
            team: {
              id: "T12345",
              name: "test-workspace",
              // who_can_create_private_channels フィールドがない
            },
          }),
      } as Response);

    try {
      const result = await getTeamSettings("xoxp-test-token", "T12345");
      assertEquals(result.who_can_create_private_channels, "admin");
    } finally {
      restoreFetch();
    }
  },
});

Deno.test({
  name: "getTeamSettings: APIエラー時はデフォルト値を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    globalThis.fetch = () =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            ok: false,
            error: "team_not_found",
          }),
      } as Response);

    try {
      const result = await getTeamSettings("xoxp-test-token", "T12345");
      // APIエラー時はデフォルト値（admin）を返す
      assertEquals(result.who_can_create_private_channels, "admin");
      assertEquals(result.api_error, "team_not_found");
    } finally {
      restoreFetch();
    }
  },
});

Deno.test({
  name: "getTeamSettings: missing_scopeエラー時もデフォルト値を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    globalThis.fetch = () =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            ok: false,
            error: "missing_scope",
          }),
      } as Response);

    try {
      const result = await getTeamSettings("xoxp-test-token", "T12345");
      // missing_scopeエラー時はデフォルト値（admin）を返す
      assertEquals(result.who_can_create_private_channels, "admin");
      assertEquals(result.api_error, "missing_scope");
    } finally {
      restoreFetch();
    }
  },
});
