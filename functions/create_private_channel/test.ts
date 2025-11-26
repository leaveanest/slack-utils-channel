import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { createPrivateChannel, normalizeChannelName } from "./mod.ts";
// i18n is auto-initialized when imported

type ConversationsCreate = SlackAPIClient["conversations"]["create"];
type ConversationsCreateArgs = Parameters<ConversationsCreate>[0];
type ConversationsCreateResult = Awaited<ReturnType<ConversationsCreate>>;

type ConversationsSetTopic = SlackAPIClient["conversations"]["setTopic"];
type ConversationsSetTopicArgs = Parameters<ConversationsSetTopic>[0];
type ConversationsSetTopicResult = Awaited<ReturnType<ConversationsSetTopic>>;

type ConversationsInvite = SlackAPIClient["conversations"]["invite"];
type ConversationsInviteArgs = Parameters<ConversationsInvite>[0];
type ConversationsInviteResult = Awaited<ReturnType<ConversationsInvite>>;

type AdminConversationsConvertToPrivate =
  SlackAPIClient["admin"]["conversations"]["convertToPrivate"];
type AdminConversationsConvertToPrivateArgs = Parameters<
  AdminConversationsConvertToPrivate
>[0];
type AdminConversationsConvertToPrivateResult = Awaited<
  ReturnType<AdminConversationsConvertToPrivate>
>;

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
  name: "正常にチャンネルのみ作成できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      conversations: {
        create(
          args: ConversationsCreateArgs,
        ): Promise<ConversationsCreateResult> {
          assertEquals(args!.name, "test-channel");
          assertEquals(args!.is_private, false); // パブリックとして作成
          return Promise.resolve({
            ok: true,
            channel: {
              id: "C12345",
              name: "test-channel",
            },
          } as unknown as ConversationsCreateResult);
        },
      },
      admin: {
        conversations: {
          convertToPrivate(
            args: AdminConversationsConvertToPrivateArgs,
          ): Promise<AdminConversationsConvertToPrivateResult> {
            assertEquals(args!.channel_id, "C12345");
            return Promise.resolve({
              ok: true,
            } as unknown as AdminConversationsConvertToPrivateResult);
          },
        },
      },
    } as unknown as SlackAPIClient;

    const result = await createPrivateChannel(
      mockClient,
      "Test Channel",
    );

    assertEquals(result.channel_id, "C12345");
    assertEquals(result.channel_name, "test-channel");
    assertEquals(result.member_count, 1); // Bot自身のみ
  },
});

Deno.test({
  name: "チャンネル + 説明を設定できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      conversations: {
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
        setTopic(
          args: ConversationsSetTopicArgs,
        ): Promise<ConversationsSetTopicResult> {
          assertEquals(args!.channel, "C12345");
          assertEquals(args!.topic, "Test description");
          return Promise.resolve({
            ok: true,
          } as unknown as ConversationsSetTopicResult);
        },
      },
      admin: {
        conversations: {
          convertToPrivate(
            args: AdminConversationsConvertToPrivateArgs,
          ): Promise<AdminConversationsConvertToPrivateResult> {
            assertEquals(args!.channel_id, "C12345");
            return Promise.resolve({
              ok: true,
            } as unknown as AdminConversationsConvertToPrivateResult);
          },
        },
      },
    } as unknown as SlackAPIClient;

    const result = await createPrivateChannel(
      mockClient,
      "Test Channel",
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
      admin: {
        conversations: {
          convertToPrivate(
            args: AdminConversationsConvertToPrivateArgs,
          ): Promise<AdminConversationsConvertToPrivateResult> {
            assertEquals(args!.channel_id, "C12345");
            return Promise.resolve({
              ok: true,
            } as unknown as AdminConversationsConvertToPrivateResult);
          },
        },
      },
    } as unknown as SlackAPIClient;

    const result = await createPrivateChannel(
      mockClient,
      "Test Channel",
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
        setTopic(
          args: ConversationsSetTopicArgs,
        ): Promise<ConversationsSetTopicResult> {
          assertEquals(args!.channel, "C12345");
          assertEquals(args!.topic, "Alpha project discussion");
          return Promise.resolve({
            ok: true,
          } as unknown as ConversationsSetTopicResult);
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
      admin: {
        conversations: {
          convertToPrivate(
            args: AdminConversationsConvertToPrivateArgs,
          ): Promise<AdminConversationsConvertToPrivateResult> {
            assertEquals(args!.channel_id, "C12345");
            return Promise.resolve({
              ok: true,
            } as unknown as AdminConversationsConvertToPrivateResult);
          },
        },
      },
    } as unknown as SlackAPIClient;

    const result = await createPrivateChannel(
      mockClient,
      "Project Alpha",
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
      () => createPrivateChannel(mockClient, "existing-channel"),
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
    const mockClient = {} as unknown as SlackAPIClient;

    // Wait a bit for i18n to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    const error = await assertRejects(
      () => createPrivateChannel(mockClient, "!!!"),
      Error,
    );

    // 正規化後に空文字になるため、invalid_channel_nameエラー
    assertEquals(error.message.includes("Invalid channel name"), true);
  },
});

Deno.test({
  name: "トピック設定失敗時もチャンネル作成は成功する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      conversations: {
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
        setTopic(
          _args: ConversationsSetTopicArgs,
        ): Promise<ConversationsSetTopicResult> {
          return Promise.resolve({
            ok: false,
            error: "topic_too_long",
          } as unknown as ConversationsSetTopicResult);
        },
      },
      admin: {
        conversations: {
          convertToPrivate(
            _args: AdminConversationsConvertToPrivateArgs,
          ): Promise<AdminConversationsConvertToPrivateResult> {
            return Promise.resolve({
              ok: true,
            } as unknown as AdminConversationsConvertToPrivateResult);
          },
        },
      },
    } as unknown as SlackAPIClient;

    // トピック設定失敗でもチャンネル作成は成功する
    const result = await createPrivateChannel(
      mockClient,
      "Test Channel",
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
      admin: {
        conversations: {
          convertToPrivate(
            _args: AdminConversationsConvertToPrivateArgs,
          ): Promise<AdminConversationsConvertToPrivateResult> {
            return Promise.resolve({
              ok: true,
            } as unknown as AdminConversationsConvertToPrivateResult);
          },
        },
      },
    } as unknown as SlackAPIClient;

    // メンバー招待失敗でもチャンネル作成は成功する
    const result = await createPrivateChannel(
      mockClient,
      "Test Channel",
      undefined,
      ["U99999"], // 存在しないユーザー
    );

    assertEquals(result.channel_id, "C12345");
    assertEquals(result.channel_name, "test-channel");
    assertEquals(result.member_count, 1); // Botのみ（招待失敗）
  },
});

Deno.test({
  name: "プライベート変換API エラー時には例外を投げる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      conversations: {
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
      },
      admin: {
        conversations: {
          convertToPrivate(
            _args: AdminConversationsConvertToPrivateArgs,
          ): Promise<AdminConversationsConvertToPrivateResult> {
            return Promise.resolve({
              ok: false,
              error: "channel_not_found",
            } as unknown as AdminConversationsConvertToPrivateResult);
          },
        },
      },
    } as unknown as SlackAPIClient;

    // Wait a bit for i18n to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    const error = await assertRejects(
      () => createPrivateChannel(mockClient, "test-channel"),
      Error,
    );

    // エラーメッセージに変換失敗と元のエラーが含まれる
    assertEquals(error.message.includes("channel_not_found"), true);
    assertEquals(error.message.includes("C12345"), true);
  },
});
