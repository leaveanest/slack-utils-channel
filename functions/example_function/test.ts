import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { retrieveChannelSummary } from "./mod.ts";
// i18n is auto-initialized when imported

type ConversationsInfo = SlackAPIClient["conversations"]["info"];
type ConversationsInfoArgs = Parameters<ConversationsInfo>[0];
type ConversationsInfoResult = Awaited<ReturnType<ConversationsInfo>>;

Deno.test({
  name: "正常にチャンネル情報を取得できる",
  sanitizeResources: false, // i18n auto-init causes resource tracking issues
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      conversations: {
        info(_args: ConversationsInfoArgs): Promise<ConversationsInfoResult> {
          return Promise.resolve({
            ok: true,
            channel: {
              id: "C12345",
              name: "general",
              is_archived: false,
              num_members: 42,
            },
          } as unknown as ConversationsInfoResult);
        },
      },
    } as unknown as SlackAPIClient;

    const summary = await retrieveChannelSummary(mockClient, "C12345");
    assertEquals(summary, {
      id: "C12345",
      name: "general",
      is_archived: false,
      member_count: 42,
    });
  },
});

Deno.test({
  name: "API エラー時には例外を投げる",
  sanitizeResources: false, // i18n auto-init causes resource tracking issues
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      conversations: {
        info(_args: ConversationsInfoArgs): Promise<ConversationsInfoResult> {
          return Promise.resolve({
            ok: false,
            error: "not_in_channel",
          } as unknown as ConversationsInfoResult);
        },
      },
    } as unknown as SlackAPIClient;

    // Wait a bit for i18n to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    const error = await assertRejects(
      () => retrieveChannelSummary(mockClient, "C00000"),
      Error,
    );

    // Check that error message contains the error code
    assertEquals(error.message.includes("not_in_channel"), true);
  },
});
