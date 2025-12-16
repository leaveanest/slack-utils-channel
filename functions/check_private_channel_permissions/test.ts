import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import { getTeamSettings } from "./mod.ts";

/**
 * getTeamSettings関数のテスト
 */
Deno.test("getTeamSettings: 正常にワークスペース設定を取得できる（everyone）", async () => {
  // モックのfetch関数を設定
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    return {
      json: async () => ({
        ok: true,
        team: {
          id: "T12345",
          name: "test-workspace",
          who_can_create_private_channels: "everyone",
        },
      }),
    };
  }) as typeof fetch;

  try {
    const result = await getTeamSettings("xoxp-test-token", "T12345");
    assertEquals(result.who_can_create_private_channels, "everyone");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getTeamSettings: 正常にワークスペース設定を取得できる（admin）", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    return {
      json: async () => ({
        ok: true,
        team: {
          id: "T12345",
          name: "test-workspace",
          who_can_create_private_channels: "admin",
        },
      }),
    };
  }) as typeof fetch;

  try {
    const result = await getTeamSettings("xoxp-test-token", "T12345");
    assertEquals(result.who_can_create_private_channels, "admin");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getTeamSettings: フィールドがない場合はデフォルト値を返す", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    return {
      json: async () => ({
        ok: true,
        team: {
          id: "T12345",
          name: "test-workspace",
          // who_can_create_private_channels フィールドがない
        },
      }),
    };
  }) as typeof fetch;

  try {
    const result = await getTeamSettings("xoxp-test-token", "T12345");
    assertEquals(result.who_can_create_private_channels, "admin");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getTeamSettings: APIエラー時は例外をスローする", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    return {
      json: async () => ({
        ok: false,
        error: "team_not_found",
      }),
    };
  }) as typeof fetch;

  try {
    await assertRejects(
      () => getTeamSettings("xoxp-test-token", "T12345"),
      Error,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
