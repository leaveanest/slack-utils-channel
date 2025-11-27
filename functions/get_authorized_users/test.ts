import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import {
  AuthorizedUser,
  getAuthorizedUsersWithAdminApi,
} from "./mod.ts";
import { initI18n } from "../../lib/i18n/mod.ts";

// テスト前にi18nを初期化
await initI18n();

// fetch のモック用グローバル変数
const originalFetch = globalThis.fetch;

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

/**
 * getAuthorizedUsersWithAdminApi のテスト
 * 実際のAPIは呼び出さず、fetch をモックしてテスト
 */

Deno.test({
  name: "getAuthorizedUsersWithAdminApi: 正常に管理者/オーナーを取得できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    globalThis.fetch = () =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            ok: true,
            users: [
              {
                id: "U001",
                name: "admin_user",
                real_name: "Admin User",
                is_admin: true,
                is_owner: false,
                is_primary_owner: false,
                is_bot: false,
                deleted: false,
              },
              {
                id: "U002",
                name: "owner_user",
                real_name: "Owner User",
                is_admin: false,
                is_owner: true,
                is_primary_owner: false,
                is_bot: false,
                deleted: false,
              },
              {
                id: "U003",
                name: "regular_user",
                real_name: "Regular User",
                is_admin: false,
                is_owner: false,
                is_primary_owner: false,
                is_bot: false,
                deleted: false,
              },
            ],
            response_metadata: {},
          }),
      } as Response);

    try {
      const result = await getAuthorizedUsersWithAdminApi(
        "xoxp-test-token",
        "T12345678",
      );

      // 管理者とオーナーのみが返される（2人）
      assertEquals(result.length, 2);
      assertEquals(result[0].id, "U001");
      assertEquals(result[0].is_admin, true);
      assertEquals(result[1].id, "U002");
      assertEquals(result[1].is_owner, true);
    } finally {
      restoreFetch();
    }
  },
});

Deno.test({
  name: "getAuthorizedUsersWithAdminApi: プライマリオーナーも取得できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    globalThis.fetch = () =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            ok: true,
            users: [
              {
                id: "U001",
                name: "primary_owner",
                real_name: "Primary Owner",
                is_admin: false,
                is_owner: false,
                is_primary_owner: true,
                is_bot: false,
                deleted: false,
              },
            ],
            response_metadata: {},
          }),
      } as Response);

    try {
      const result = await getAuthorizedUsersWithAdminApi(
        "xoxp-test-token",
        "T12345678",
      );

      assertEquals(result.length, 1);
      assertEquals(result[0].id, "U001");
      assertEquals(result[0].is_primary_owner, true);
    } finally {
      restoreFetch();
    }
  },
});

Deno.test({
  name: "getAuthorizedUsersWithAdminApi: ボットユーザーを除外する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    globalThis.fetch = () =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            ok: true,
            users: [
              {
                id: "U001",
                name: "admin_user",
                real_name: "Admin User",
                is_admin: true,
                is_owner: false,
                is_bot: false,
                deleted: false,
              },
              {
                id: "B001",
                name: "admin_bot",
                real_name: "Admin Bot",
                is_admin: true,
                is_owner: false,
                is_bot: true,
                deleted: false,
              },
            ],
            response_metadata: {},
          }),
      } as Response);

    try {
      const result = await getAuthorizedUsersWithAdminApi(
        "xoxp-test-token",
        "T12345678",
      );

      // ボットは除外されるので1人のみ
      assertEquals(result.length, 1);
      assertEquals(result[0].id, "U001");
    } finally {
      restoreFetch();
    }
  },
});

Deno.test({
  name: "getAuthorizedUsersWithAdminApi: 削除済みユーザーを除外する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    globalThis.fetch = () =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            ok: true,
            users: [
              {
                id: "U001",
                name: "active_admin",
                real_name: "Active Admin",
                is_admin: true,
                is_owner: false,
                is_bot: false,
                deleted: false,
              },
              {
                id: "U002",
                name: "deleted_admin",
                real_name: "Deleted Admin",
                is_admin: true,
                is_owner: false,
                is_bot: false,
                deleted: true,
              },
            ],
            response_metadata: {},
          }),
      } as Response);

    try {
      const result = await getAuthorizedUsersWithAdminApi(
        "xoxp-test-token",
        "T12345678",
      );

      // 削除済みユーザーは除外されるので1人のみ
      assertEquals(result.length, 1);
      assertEquals(result[0].id, "U001");
    } finally {
      restoreFetch();
    }
  },
});

Deno.test({
  name: "getAuthorizedUsersWithAdminApi: ゲストユーザーを除外する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    globalThis.fetch = () =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            ok: true,
            users: [
              {
                id: "U001",
                name: "admin_user",
                real_name: "Admin User",
                is_admin: true,
                is_owner: false,
                is_bot: false,
                deleted: false,
                is_restricted: false,
                is_ultra_restricted: false,
              },
              {
                id: "U002",
                name: "guest_admin",
                real_name: "Guest Admin",
                is_admin: true,
                is_owner: false,
                is_bot: false,
                deleted: false,
                is_restricted: true,
                is_ultra_restricted: false,
              },
              {
                id: "U003",
                name: "single_channel_guest",
                real_name: "Single Channel Guest",
                is_admin: true,
                is_owner: false,
                is_bot: false,
                deleted: false,
                is_restricted: false,
                is_ultra_restricted: true,
              },
            ],
            response_metadata: {},
          }),
      } as Response);

    try {
      const result = await getAuthorizedUsersWithAdminApi(
        "xoxp-test-token",
        "T12345678",
      );

      // ゲストは除外されるので1人のみ
      assertEquals(result.length, 1);
      assertEquals(result[0].id, "U001");
    } finally {
      restoreFetch();
    }
  },
});

Deno.test({
  name: "getAuthorizedUsersWithAdminApi: ページネーションを処理できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    let callCount = 0;

    globalThis.fetch = () => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              ok: true,
              users: [
                {
                  id: "U001",
                  name: "admin1",
                  real_name: "Admin 1",
                  is_admin: true,
                  is_owner: false,
                  is_bot: false,
                  deleted: false,
                },
              ],
              response_metadata: {
                next_cursor: "cursor123",
              },
            }),
        } as Response);
      } else {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              ok: true,
              users: [
                {
                  id: "U002",
                  name: "admin2",
                  real_name: "Admin 2",
                  is_admin: true,
                  is_owner: false,
                  is_bot: false,
                  deleted: false,
                },
              ],
              response_metadata: {},
            }),
        } as Response);
      }
    };

    try {
      const result = await getAuthorizedUsersWithAdminApi(
        "xoxp-test-token",
        "T12345678",
      );

      // ページネーションで2回呼び出され、2人のユーザーを取得
      assertEquals(callCount, 2);
      assertEquals(result.length, 2);
      assertEquals(result[0].id, "U001");
      assertEquals(result[1].id, "U002");
    } finally {
      restoreFetch();
    }
  },
});

Deno.test({
  name: "getAuthorizedUsersWithAdminApi: APIエラー時に例外をスローする",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    globalThis.fetch = () =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            ok: false,
            error: "invalid_auth",
          }),
      } as Response);

    try {
      await assertRejects(
        () =>
          getAuthorizedUsersWithAdminApi(
            "xoxp-invalid-token",
            "T12345678",
          ),
        Error,
      );
    } finally {
      restoreFetch();
    }
  },
});

Deno.test({
  name: "getAuthorizedUsersWithAdminApi: 権限ユーザーがいない場合は空配列を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    globalThis.fetch = () =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            ok: true,
            users: [
              {
                id: "U001",
                name: "regular_user",
                real_name: "Regular User",
                is_admin: false,
                is_owner: false,
                is_primary_owner: false,
                is_bot: false,
                deleted: false,
              },
            ],
            response_metadata: {},
          }),
      } as Response);

    try {
      const result = await getAuthorizedUsersWithAdminApi(
        "xoxp-test-token",
        "T12345678",
      );

      assertEquals(result.length, 0);
    } finally {
      restoreFetch();
    }
  },
});

Deno.test({
  name: "getAuthorizedUsersWithAdminApi: 正しいパラメータでAPIを呼び出す",
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
        json: () =>
          Promise.resolve({
            ok: true,
            users: [],
            response_metadata: {},
          }),
      } as Response);
    };

    try {
      await getAuthorizedUsersWithAdminApi(
        "xoxp-my-admin-token",
        "T98765432",
      );

      // URL の検証（team_idとlimitがパラメータに含まれる）
      assertEquals(
        capturedUrl.includes("https://slack.com/api/admin.users.list"),
        true,
      );
      assertEquals(capturedUrl.includes("team_id=T98765432"), true);
      assertEquals(capturedUrl.includes("limit=200"), true);

      // メソッドの検証
      assertEquals(capturedOptions?.method, "GET");

      // ヘッダーの検証
      const headers = capturedOptions?.headers as Record<string, string>;
      assertEquals(headers["Authorization"], "Bearer xoxp-my-admin-token");
    } finally {
      restoreFetch();
    }
  },
});

/**
 * AuthorizedUser 型のテスト
 */
Deno.test("AuthorizedUser: 型が正しく定義されている", () => {
  const user: AuthorizedUser = {
    id: "U12345678",
    name: "test_user",
    real_name: "Test User",
    is_admin: true,
    is_owner: false,
    is_primary_owner: false,
  };

  assertEquals(user.id, "U12345678");
  assertEquals(user.name, "test_user");
  assertEquals(user.real_name, "Test User");
  assertEquals(user.is_admin, true);
  assertEquals(user.is_owner, false);
  assertEquals(user.is_primary_owner, false);
});
