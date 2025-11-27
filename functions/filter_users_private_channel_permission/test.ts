import { assertEquals } from "std/testing/asserts.ts";
import { filterUsersWithPrivateChannelPermission } from "./mod.ts";
// i18n is auto-initialized when imported

/**
 * Admin API から取得するユーザー情報の型（テスト用）
 */
interface AdminUser {
  id: string;
  email?: string;
  is_admin?: boolean;
  is_owner?: boolean;
  is_primary_owner?: boolean;
  is_restricted?: boolean;
  is_ultra_restricted?: boolean;
  is_bot?: boolean;
  deleted?: boolean;
}

Deno.test({
  name: "filterUsersWithPrivateChannelPermission: 管理者のみをフィルタリングする",
  fn: () => {
    const users: AdminUser[] = [
      { id: "U001", is_admin: true },
      { id: "U002", is_admin: false },
      { id: "U003", is_admin: true },
    ];

    const result = filterUsersWithPrivateChannelPermission(users);

    assertEquals(result, ["U001", "U003"]);
  },
});

Deno.test({
  name: "filterUsersWithPrivateChannelPermission: オーナーをフィルタリングする",
  fn: () => {
    const users: AdminUser[] = [
      { id: "U001", is_owner: true },
      { id: "U002", is_owner: false },
      { id: "U003", is_owner: true },
    ];

    const result = filterUsersWithPrivateChannelPermission(users);

    assertEquals(result, ["U001", "U003"]);
  },
});

Deno.test({
  name: "filterUsersWithPrivateChannelPermission: プライマリオーナーをフィルタリングする",
  fn: () => {
    const users: AdminUser[] = [
      { id: "U001", is_primary_owner: true },
      { id: "U002", is_primary_owner: false },
    ];

    const result = filterUsersWithPrivateChannelPermission(users);

    assertEquals(result, ["U001"]);
  },
});

Deno.test({
  name: "filterUsersWithPrivateChannelPermission: 管理者・オーナー・プライマリオーナーの全てをフィルタリングする",
  fn: () => {
    const users: AdminUser[] = [
      { id: "U001", is_admin: true },
      { id: "U002", is_owner: true },
      { id: "U003", is_primary_owner: true },
      { id: "U004" }, // 一般ユーザー
    ];

    const result = filterUsersWithPrivateChannelPermission(users);

    assertEquals(result, ["U001", "U002", "U003"]);
  },
});

Deno.test({
  name: "filterUsersWithPrivateChannelPermission: 削除済みユーザーを除外する",
  fn: () => {
    const users: AdminUser[] = [
      { id: "U001", is_admin: true, deleted: false },
      { id: "U002", is_admin: true, deleted: true },
      { id: "U003", is_owner: true, deleted: true },
    ];

    const result = filterUsersWithPrivateChannelPermission(users);

    assertEquals(result, ["U001"]);
  },
});

Deno.test({
  name: "filterUsersWithPrivateChannelPermission: ボットを除外する",
  fn: () => {
    const users: AdminUser[] = [
      { id: "U001", is_admin: true, is_bot: false },
      { id: "B001", is_admin: true, is_bot: true },
      { id: "U002", is_owner: true, is_bot: true },
    ];

    const result = filterUsersWithPrivateChannelPermission(users);

    assertEquals(result, ["U001"]);
  },
});

Deno.test({
  name: "filterUsersWithPrivateChannelPermission: 制限付きユーザー（ゲスト）を除外する",
  fn: () => {
    const users: AdminUser[] = [
      { id: "U001", is_admin: true, is_restricted: false },
      { id: "U002", is_admin: true, is_restricted: true },
      { id: "U003", is_owner: true, is_ultra_restricted: true },
    ];

    const result = filterUsersWithPrivateChannelPermission(users);

    assertEquals(result, ["U001"]);
  },
});

Deno.test({
  name: "filterUsersWithPrivateChannelPermission: 権限のあるユーザーがいない場合は空配列を返す",
  fn: () => {
    const users: AdminUser[] = [
      { id: "U001", is_admin: false },
      { id: "U002", is_owner: false },
      { id: "U003" },
    ];

    const result = filterUsersWithPrivateChannelPermission(users);

    assertEquals(result, []);
  },
});

Deno.test({
  name: "filterUsersWithPrivateChannelPermission: 空のユーザーリストに対しては空配列を返す",
  fn: () => {
    const users: AdminUser[] = [];

    const result = filterUsersWithPrivateChannelPermission(users);

    assertEquals(result, []);
  },
});

Deno.test({
  name: "filterUsersWithPrivateChannelPermission: 複合条件（管理者かつオーナー）も正しくフィルタリングする",
  fn: () => {
    const users: AdminUser[] = [
      { id: "U001", is_admin: true, is_owner: true, is_primary_owner: false },
      { id: "U002", is_admin: false, is_owner: false, is_primary_owner: false },
      {
        id: "U003",
        is_admin: true,
        is_owner: false,
        is_primary_owner: false,
        deleted: true,
      },
    ];

    const result = filterUsersWithPrivateChannelPermission(users);

    assertEquals(result, ["U001"]);
  },
});

Deno.test({
  name: "filterUsersWithPrivateChannelPermission: 全ての除外条件を複合的にテストする",
  fn: () => {
    const users: AdminUser[] = [
      // 含まれるべきユーザー
      { id: "U001", is_admin: true },
      { id: "U002", is_owner: true },
      { id: "U003", is_primary_owner: true },
      // 除外されるべきユーザー
      { id: "U004" }, // 一般ユーザー
      { id: "U005", is_admin: true, deleted: true }, // 削除済み
      { id: "U006", is_admin: true, is_bot: true }, // ボット
      { id: "U007", is_admin: true, is_restricted: true }, // ゲスト
      { id: "U008", is_owner: true, is_ultra_restricted: true }, // シングルチャンネルゲスト
      { id: "U009", is_admin: false, is_owner: false }, // 権限なし
    ];

    const result = filterUsersWithPrivateChannelPermission(users);

    assertEquals(result, ["U001", "U002", "U003"]);
    assertEquals(result.length, 3);
  },
});
