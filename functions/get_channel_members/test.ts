import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { getChannelMembers } from "./mod.ts";
// i18n is auto-initialized when imported

type ConversationsMembers = SlackAPIClient["conversations"]["members"];
type ConversationsMembersArgs = Parameters<ConversationsMembers>[0];
type ConversationsMembersResult = Awaited<ReturnType<ConversationsMembers>>;

Deno.test({
  name: "正常にメンバーリストを取得できる",
  sanitizeResources: false, // i18n auto-init causes resource tracking issues
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      conversations: {
        members(
          _args: ConversationsMembersArgs,
        ): Promise<ConversationsMembersResult> {
          return Promise.resolve({
            ok: true,
            members: ["U12345", "U67890", "U11111"],
            response_metadata: {
              next_cursor: "",
            },
          } as unknown as ConversationsMembersResult);
        },
      },
    } as unknown as SlackAPIClient;

    const result = await getChannelMembers(mockClient, "C12345");
    assertEquals(result.member_ids, ["U12345", "U67890", "U11111"]);
    assertEquals(result.member_count, 3);
  },
});

Deno.test({
  name: "ページネーションが正しく動作する（複数ページ）",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    let callCount = 0;
    const mockClient = {
      conversations: {
        members(
          args: ConversationsMembersArgs,
        ): Promise<ConversationsMembersResult> {
          callCount++;

          // 1回目の呼び出し: 最初のページ（cursorなし）
          if (callCount === 1) {
            assertEquals(args!.cursor, undefined);
            return Promise.resolve({
              ok: true,
              members: ["U00001", "U00002"],
              response_metadata: {
                next_cursor: "cursor_page_2",
              },
            } as unknown as ConversationsMembersResult);
          }

          // 2回目の呼び出し: 2ページ目
          if (callCount === 2) {
            assertEquals(args!.cursor, "cursor_page_2");
            return Promise.resolve({
              ok: true,
              members: ["U00003", "U00004"],
              response_metadata: {
                next_cursor: "cursor_page_3",
              },
            } as unknown as ConversationsMembersResult);
          }

          // 3回目の呼び出し: 最後のページ
          assertEquals(args!.cursor, "cursor_page_3");
          return Promise.resolve({
            ok: true,
            members: ["U00005"],
            response_metadata: {
              next_cursor: "",
            },
          } as unknown as ConversationsMembersResult);
        },
      },
    } as unknown as SlackAPIClient;

    const result = await getChannelMembers(mockClient, "C12345");

    // 全ページのメンバーが取得できている
    assertEquals(result.member_ids, [
      "U00001",
      "U00002",
      "U00003",
      "U00004",
      "U00005",
    ]);
    assertEquals(result.member_count, 5);
    assertEquals(callCount, 3); // 3回呼び出されている
  },
});

Deno.test({
  name: "API エラー時には例外を投げる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      conversations: {
        members(
          _args: ConversationsMembersArgs,
        ): Promise<ConversationsMembersResult> {
          return Promise.resolve({
            ok: false,
            error: "channel_not_found",
          } as unknown as ConversationsMembersResult);
        },
      },
    } as unknown as SlackAPIClient;

    // Wait a bit for i18n to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    const error = await assertRejects(
      () => getChannelMembers(mockClient, "C00000"),
      Error,
    );

    // Check that error message contains the error code
    assertEquals(error.message.includes("channel_not_found"), true);
  },
});

Deno.test({
  name: "メンバーが空のチャンネルでも正常に動作する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      conversations: {
        members(
          _args: ConversationsMembersArgs,
        ): Promise<ConversationsMembersResult> {
          return Promise.resolve({
            ok: true,
            members: [],
            response_metadata: {
              next_cursor: "",
            },
          } as unknown as ConversationsMembersResult);
        },
      },
    } as unknown as SlackAPIClient;

    const result = await getChannelMembers(mockClient, "C12345");
    assertEquals(result.member_ids, []);
    assertEquals(result.member_count, 0);
  },
});
