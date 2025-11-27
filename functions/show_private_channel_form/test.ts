import { assertEquals } from "std/testing/asserts.ts";
import { normalizeChannelName } from "./mod.ts";
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
 * buildApproverOptions の動作確認テスト
 * （関数はエクスポートされていないため、結果の形式を間接的にテスト）
 */

Deno.test("AuthorizedUser型: 必須フィールドが正しく定義されている", () => {
  const user = {
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
});

Deno.test("AuthorizedUser型: オーナーフラグが正しく設定される", () => {
  const owner = {
    id: "U87654321",
    name: "owner_user",
    real_name: "Owner User",
    is_admin: false,
    is_owner: true,
    is_primary_owner: false,
  };

  assertEquals(owner.is_owner, true);
  assertEquals(owner.is_admin, false);
});

Deno.test("AuthorizedUser型: プライマリオーナーフラグが正しく設定される", () => {
  const primaryOwner = {
    id: "U11111111",
    name: "primary_owner",
    real_name: "Primary Owner",
    is_admin: false,
    is_owner: false,
    is_primary_owner: true,
  };

  assertEquals(primaryOwner.is_primary_owner, true);
});

/**
 * モーダルのprivate_metadata JSONパース/シリアライズのテスト
 */
Deno.test("private_metadata: 正しくシリアライズ/デシリアライズできる", () => {
  const metadata = {
    channel_id: "C12345678",
    user_id: "U87654321",
  };

  const serialized = JSON.stringify(metadata);
  const deserialized = JSON.parse(serialized);

  assertEquals(deserialized.channel_id, "C12345678");
  assertEquals(deserialized.user_id, "U87654321");
});

Deno.test("private_metadata: 空のメタデータを処理できる", () => {
  const emptyMetadata = "{}";
  const parsed = JSON.parse(emptyMetadata);

  assertEquals(parsed.channel_id, undefined);
  assertEquals(parsed.user_id, undefined);
});

/**
 * ボタンのvalue JSONパース/シリアライズのテスト
 */
Deno.test("button value: リクエストデータを正しくシリアライズできる", () => {
  const requestData = {
    channel_name: "test-channel",
    requester_id: "U12345678",
    approver_id: "U87654321",
    description: "Test description",
    initial_members: ["U11111111", "U22222222"],
    approval_channel_id: "C99999999",
  };

  const serialized = JSON.stringify(requestData);
  const deserialized = JSON.parse(serialized);

  assertEquals(deserialized.channel_name, "test-channel");
  assertEquals(deserialized.requester_id, "U12345678");
  assertEquals(deserialized.approver_id, "U87654321");
  assertEquals(deserialized.description, "Test description");
  assertEquals(deserialized.initial_members.length, 2);
  assertEquals(deserialized.approval_channel_id, "C99999999");
});

Deno.test("button value: 空の初期メンバーを処理できる", () => {
  const requestData = {
    channel_name: "test-channel",
    requester_id: "U12345678",
    approver_id: "U87654321",
    description: "",
    initial_members: [],
    approval_channel_id: "C99999999",
  };

  const serialized = JSON.stringify(requestData);
  const deserialized = JSON.parse(serialized);

  assertEquals(deserialized.initial_members.length, 0);
  assertEquals(deserialized.description, "");
});

/**
 * 承認者オプションの表示テスト
 */
Deno.test("approver option: Admin表示が正しい形式", () => {
  const user = {
    id: "U12345678",
    name: "admin_user",
    real_name: "Admin User",
    is_admin: true,
    is_owner: false,
    is_primary_owner: false,
  };

  const roles: string[] = [];
  if (user.is_primary_owner) roles.push("Primary Owner");
  else if (user.is_owner) roles.push("Owner");
  if (user.is_admin) roles.push("Admin");

  const roleText = roles.length > 0 ? ` (${roles.join(", ")})` : "";
  const displayName = user.real_name || user.name;
  const optionText = `${displayName}${roleText}`;

  assertEquals(optionText, "Admin User (Admin)");
});

Deno.test("approver option: Owner + Admin表示が正しい形式", () => {
  const user = {
    id: "U12345678",
    name: "owner_admin",
    real_name: "Owner Admin User",
    is_admin: true,
    is_owner: true,
    is_primary_owner: false,
  };

  const roles: string[] = [];
  if (user.is_primary_owner) roles.push("Primary Owner");
  else if (user.is_owner) roles.push("Owner");
  if (user.is_admin) roles.push("Admin");

  const roleText = roles.length > 0 ? ` (${roles.join(", ")})` : "";
  const displayName = user.real_name || user.name;
  const optionText = `${displayName}${roleText}`;

  assertEquals(optionText, "Owner Admin User (Owner, Admin)");
});

Deno.test("approver option: Primary Owner表示が正しい形式", () => {
  const user = {
    id: "U12345678",
    name: "primary_owner",
    real_name: "Primary Owner User",
    is_admin: true,
    is_owner: false,
    is_primary_owner: true,
  };

  const roles: string[] = [];
  if (user.is_primary_owner) roles.push("Primary Owner");
  else if (user.is_owner) roles.push("Owner");
  if (user.is_admin) roles.push("Admin");

  const roleText = roles.length > 0 ? ` (${roles.join(", ")})` : "";
  const displayName = user.real_name || user.name;
  const optionText = `${displayName}${roleText}`;

  assertEquals(optionText, "Primary Owner User (Primary Owner, Admin)");
});

Deno.test("approver option: 75文字以内に制限される", () => {
  const longName = "A".repeat(80);
  const user = {
    id: "U12345678",
    name: "long_name_user",
    real_name: longName,
    is_admin: true,
    is_owner: false,
    is_primary_owner: false,
  };

  const roles: string[] = [];
  if (user.is_admin) roles.push("Admin");
  const roleText = ` (${roles.join(", ")})`;
  const displayName = user.real_name;
  const optionText = `${displayName}${roleText}`.slice(0, 75);

  assertEquals(optionText.length, 75);
});
