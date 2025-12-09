import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { createChannel, normalizeChannelName } from "./mod.ts";
// i18n is auto-initialized when imported

type ConversationsInfo = SlackAPIClient["conversations"]["info"];
type ConversationsInfoArgs = Parameters<ConversationsInfo>[0];
type ConversationsInfoResult = Awaited<ReturnType<ConversationsInfo>>;

type ConversationsCreate = SlackAPIClient["conversations"]["create"];
type ConversationsCreateArgs = Parameters<ConversationsCreate>[0];
type ConversationsCreateResult = Awaited<ReturnType<ConversationsCreate>>;

type ConversationsSetPurpose = SlackAPIClient["conversations"]["setPurpose"];
type ConversationsSetPurposeArgs = Parameters<ConversationsSetPurpose>[0];
type ConversationsSetPurposeResult = Awaited<
  ReturnType<ConversationsSetPurpose>
>;

type ConversationsInvite = SlackAPIClient["conversations"]["invite"];
type ConversationsInviteArgs = Parameters<ConversationsInvite>[0];
type ConversationsInviteResult = Awaited<ReturnType<ConversationsInvite>>;

// Mock notification channel ID for testing
const MOCK_NOTIFICATION_CHANNEL_ID = "C09876NOTIFY";
// Mock workspace team ID (starts with T)
const MOCK_WORKSPACE_TEAM_ID = "T080TCW9CJ2";

/**
 * conversations.info のモックレスポンスを作成
 */
function createConversationsInfoMock() {
  return function (
    args: ConversationsInfoArgs,
  ): Promise<ConversationsInfoResult> {
    assertEquals(args!.channel, MOCK_NOTIFICATION_CHANNEL_ID);
    return Promise.resolve({
      ok: true,
      channel: {
        id: MOCK_NOTIFICATION_CHANNEL_ID,
        context_team_id: MOCK_WORKSPACE_TEAM_ID,
      },
    } as unknown as ConversationsInfoResult);
  };
}

Deno.test({
  name: "normalizeChannelName: チャンネル名を正しく正規化する",
  fn: () => {
    assertEquals(normalizeChannelName("Project Alpha"), "project-alpha");
    assertEquals(normalizeChannelName("Test@#Channel!"), "testchannel");
    assertEquals(normalizeChannelName("UPPERCASE"), "uppercase");
    assertEquals(normalizeChannelName("multiple   spaces"), "multiple-spaces");
    assertEquals(
      normalizeChannelName("a".repeat(100)),
      "a".repeat(80),
    ); // 80文字に制限
  },
});

Deno.test({
  name: "正常にプライベートチャンネルのみ作成できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      conversations: {
        info: createConversationsInfoMock(),
        create(
          args: ConversationsCreateArgs,
        ): Promise<ConversationsCreateResult> {
          assertEquals(args!.name, "test-channel");
          assertEquals(args!.is_private, true); // プライベートチャンネル作成
          assertEquals(args!.user_ids, "U0812GLUZD2"); // creator_idが渡される
          assertEquals(args!.team_id, MOCK_WORKSPACE_TEAM_ID); // conversations.infoから取得したteam_id
          return Promise.resolve({
            ok: true,
            channel: {
              id: "C12345",
              name: "test-channel",
            },
          } as unknown as ConversationsCreateResult);
        },
      },
    } as unknown as SlackAPIClient;

    const result = await createChannel(
      mockClient,
      "Test Channel",
      "U0812GLUZD2", // creator_id
      MOCK_NOTIFICATION_CHANNEL_ID, // notification_channel_id
      true, // is_private
    );

    assertEquals(result.channel_id, "C12345");
    assertEquals(result.channel_name, "test-channel");
    assertEquals(result.member_count, 1); // Bot自身のみ
  },
});

Deno.test({
  name: "正常にパブリックチャンネルを作成できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      conversations: {
        info: createConversationsInfoMock(),
        create(
          args: ConversationsCreateArgs,
        ): Promise<ConversationsCreateResult> {
          assertEquals(args!.name, "public-channel");
          assertEquals(args!.is_private, false); // パブリックチャンネル作成
          assertEquals(args!.user_ids, undefined); // パブリックではuser_idsは不要
          assertEquals(args!.team_id, MOCK_WORKSPACE_TEAM_ID);
          return Promise.resolve({
            ok: true,
            channel: {
              id: "C67890",
              name: "public-channel",
            },
          } as unknown as ConversationsCreateResult);
        },
      },
    } as unknown as SlackAPIClient;

    const result = await createChannel(
      mockClient,
      "Public Channel",
      "U0812GLUZD2", // creator_id
      MOCK_NOTIFICATION_CHANNEL_ID, // notification_channel_id
      false, // is_private = false (public)
    );

    assertEquals(result.channel_id, "C67890");
    assertEquals(result.channel_name, "public-channel");
    assertEquals(result.member_count, 1);
  },
});

Deno.test({
  name: "チャンネル + 説明を設定できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      conversations: {
        info: createConversationsInfoMock(),
        create(
          _args: ConversationsCreateArgs,
        ): Promise<ConversationsCreateResult> {
          return Promise.resolve({
            ok: true,
            channel: {
              id: "C12345",
              name: "test-channel",
            },
          } as unknown as ConversationsCreateResult);
        },
        setPurpose(
          args: ConversationsSetPurposeArgs,
        ): Promise<ConversationsSetPurposeResult> {
          assertEquals(args!.channel, "C12345");
          assertEquals(args!.purpose, "Test description");
          return Promise.resolve({
            ok: true,
          } as unknown as ConversationsSetPurposeResult);
        },
      },
    } as unknown as SlackAPIClient;

    const result = await createChannel(
      mockClient,
      "Test Channel",
      "U0812GLUZD2", // creator_id
      MOCK_NOTIFICATION_CHANNEL_ID, // notification_channel_id
      true, // is_private
      "Test description",
    );

    assertEquals(result.channel_id, "C12345");
    assertEquals(result.channel_name, "test-channel");
    assertEquals(result.member_count, 1);
  },
});

Deno.test({
  name: "チャンネル + 初期メンバーを招待できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      conversations: {
        info: createConversationsInfoMock(),
        create(
          _args: ConversationsCreateArgs,
        ): Promise<ConversationsCreateResult> {
          return Promise.resolve({
            ok: true,
            channel: {
              id: "C12345",
              name: "test-channel",
            },
          } as unknown as ConversationsCreateResult);
        },
        invite(
          args: ConversationsInviteArgs,
        ): Promise<ConversationsInviteResult> {
          assertEquals(args!.channel, "C12345");
          assertEquals(args!.users, "U12345,U67890");
          return Promise.resolve({
            ok: true,
          } as unknown as ConversationsInviteResult);
        },
      },
    } as unknown as SlackAPIClient;

    const result = await createChannel(
      mockClient,
      "Test Channel",
      "U0812GLUZD2", // creator_id
      MOCK_NOTIFICATION_CHANNEL_ID, // notification_channel_id
      true, // is_private
      undefined,
      ["U12345", "U67890"],
    );

    assertEquals(result.channel_id, "C12345");
    assertEquals(result.channel_name, "test-channel");
    assertEquals(result.member_count, 3); // Bot + 2メンバー
  },
});

Deno.test({
  name: "チャンネル + 説明 + 初期メンバーの全て設定できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      conversations: {
        info: createConversationsInfoMock(),
        create(
          _args: ConversationsCreateArgs,
        ): Promise<ConversationsCreateResult> {
          return Promise.resolve({
            ok: true,
            channel: {
              id: "C12345",
              name: "project-alpha",
            },
          } as unknown as ConversationsCreateResult);
        },
        setPurpose(
          args: ConversationsSetPurposeArgs,
        ): Promise<ConversationsSetPurposeResult> {
          assertEquals(args!.channel, "C12345");
          assertEquals(args!.purpose, "Alpha project discussion");
          return Promise.resolve({
            ok: true,
          } as unknown as ConversationsSetPurposeResult);
        },
        invite(
          args: ConversationsInviteArgs,
        ): Promise<ConversationsInviteResult> {
          assertEquals(args!.channel, "C12345");
          assertEquals(args!.users, "U11111,U22222,U33333");
          return Promise.resolve({
            ok: true,
          } as unknown as ConversationsInviteResult);
        },
      },
    } as unknown as SlackAPIClient;

    const result = await createChannel(
      mockClient,
      "Project Alpha",
      "U0812GLUZD2", // creator_id
      MOCK_NOTIFICATION_CHANNEL_ID, // notification_channel_id
      true, // is_private
      "Alpha project discussion",
      ["U11111", "U22222", "U33333"],
    );

    assertEquals(result.channel_id, "C12345");
    assertEquals(result.channel_name, "project-alpha");
    assertEquals(result.member_count, 4); // Bot + 3メンバー
  },
});

Deno.test({
  name: "チャンネル作成API エラー時には例外を投げる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      conversations: {
        info: createConversationsInfoMock(),
        create(
          _args: ConversationsCreateArgs,
        ): Promise<ConversationsCreateResult> {
          return Promise.resolve({
            ok: false,
            error: "name_taken",
          } as unknown as ConversationsCreateResult);
        },
      },
    } as unknown as SlackAPIClient;

    // Wait a bit for i18n to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    const error = await assertRejects(
      () =>
        createChannel(
          mockClient,
          "existing-channel",
          "U0812GLUZD2",
          MOCK_NOTIFICATION_CHANNEL_ID,
          true, // is_private
        ),
      Error,
    );

    assertEquals(error.message.includes("name_taken"), true);
  },
});

Deno.test({
  name: "無効なチャンネル名（空文字）に対するエラー処理",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      conversations: {
        info: createConversationsInfoMock(),
      },
    } as unknown as SlackAPIClient;

    // Wait a bit for i18n to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    const error = await assertRejects(
      () =>
        createChannel(
          mockClient,
          "!!!",
          "U0812GLUZD2",
          MOCK_NOTIFICATION_CHANNEL_ID,
          true, // is_private
        ),
      Error,
    );

    // 正規化後に空文字になるため、invalid_channel_nameエラー
    // デフォルトロケールは日本語
    assertEquals(error.message.includes("無効なチャンネル名です"), true);
  },
});

Deno.test({
  name: "説明設定失敗時もチャンネル作成は成功する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      conversations: {
        info: createConversationsInfoMock(),
        create(
          _args: ConversationsCreateArgs,
        ): Promise<ConversationsCreateResult> {
          return Promise.resolve({
            ok: true,
            channel: {
              id: "C12345",
              name: "test-channel",
            },
          } as unknown as ConversationsCreateResult);
        },
        setPurpose(
          _args: ConversationsSetPurposeArgs,
        ): Promise<ConversationsSetPurposeResult> {
          return Promise.resolve({
            ok: false,
            error: "purpose_too_long",
          } as unknown as ConversationsSetPurposeResult);
        },
      },
    } as unknown as SlackAPIClient;

    // 説明設定失敗でもチャンネル作成は成功する
    const result = await createChannel(
      mockClient,
      "Test Channel",
      "U0812GLUZD2", // creator_id
      MOCK_NOTIFICATION_CHANNEL_ID, // notification_channel_id
      true, // is_private
      "Very long description that might fail",
    );

    assertEquals(result.channel_id, "C12345");
    assertEquals(result.channel_name, "test-channel");
  },
});

Deno.test({
  name: "メンバー招待失敗時もチャンネル作成は成功する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      conversations: {
        info: createConversationsInfoMock(),
        create(
          _args: ConversationsCreateArgs,
        ): Promise<ConversationsCreateResult> {
          return Promise.resolve({
            ok: true,
            channel: {
              id: "C12345",
              name: "test-channel",
            },
          } as unknown as ConversationsCreateResult);
        },
        invite(
          _args: ConversationsInviteArgs,
        ): Promise<ConversationsInviteResult> {
          return Promise.resolve({
            ok: false,
            error: "user_not_found",
          } as unknown as ConversationsInviteResult);
        },
      },
    } as unknown as SlackAPIClient;

    // メンバー招待失敗でもチャンネル作成は成功する
    const result = await createChannel(
      mockClient,
      "Test Channel",
      "U0812GLUZD2", // creator_id
      MOCK_NOTIFICATION_CHANNEL_ID, // notification_channel_id
      true, // is_private
      undefined,
      ["U99999"], // 存在しないユーザー
    );

    assertEquals(result.channel_id, "C12345");
    assertEquals(result.channel_name, "test-channel");
    assertEquals(result.member_count, 1); // Botのみ（招待失敗）
  },
});

Deno.test({
  name: "conversations.info エラー時には例外を投げる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      conversations: {
        info(
          _args: ConversationsInfoArgs,
        ): Promise<ConversationsInfoResult> {
          return Promise.resolve({
            ok: false,
            error: "channel_not_found",
          } as unknown as ConversationsInfoResult);
        },
      },
    } as unknown as SlackAPIClient;

    // Wait a bit for i18n to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    const error = await assertRejects(
      () =>
        createChannel(
          mockClient,
          "test-channel",
          "U0812GLUZD2",
          MOCK_NOTIFICATION_CHANNEL_ID,
          true, // is_private
        ),
      Error,
    );

    // エラーメッセージに channel_not_found または channel_info_failed が含まれることを確認
    const hasExpectedError = error.message.includes("channel_not_found") ||
      error.message.includes("channel_info_failed") ||
      error.message.includes("Failed to get channel info");
    assertEquals(hasExpectedError, true);
  },
});
