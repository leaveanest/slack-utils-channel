import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { t } from "../../lib/i18n/mod.ts";
import { channelIdSchema } from "../../lib/validation/schemas.ts";

export const GetChannelMembersDefinition = DefineFunction({
  callback_id: "get_channel_members",
  title: "チャンネルメンバー取得",
  description: "チャンネルのメンバー一覧を取得します",
  source_file: "functions/get_channel_members/mod.ts",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "対象チャンネルID",
      },
    },
    required: ["channel_id"],
  },
  output_parameters: {
    properties: {
      member_ids: {
        type: Schema.types.array,
        items: {
          type: Schema.types.string,
        },
        description: "チャンネル内のユーザーID一覧",
      },
      member_count: {
        type: Schema.types.number,
        description: "メンバー総数",
      },
    },
    required: ["member_ids", "member_count"],
  },
});

/**
 * メンバーリスト取得結果
 */
export interface ChannelMembersResult {
  /** メンバーのユーザーIDリスト */
  member_ids: string[];
  /** メンバー総数 */
  member_count: number;
}

/**
 * チャンネルに所属する全メンバーのIDリストを取得します
 *
 * ページネーションを自動的に処理し、全メンバーを取得します。
 * プライベートチャンネルの場合、Botがメンバーである必要があります。
 *
 * @param client - Slack APIクライアント
 * @param channelId - 取得対象のチャンネルID（例: "C12345678"）
 * @returns メンバーIDリストと総数
 * @throws {Error} メンバー情報の取得に失敗した場合
 *
 * @example
 * ```typescript
 * const result = await getChannelMembers(client, "C12345678");
 * console.log(`メンバー数: ${result.member_count}`);
 * console.log(`メンバーID: ${result.member_ids.join(", ")}`);
 * ```
 */
export async function getChannelMembers(
  client: SlackAPIClient,
  channelId: string,
): Promise<ChannelMembersResult> {
  const allMemberIds: string[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.conversations.members({
      channel: channelId,
      cursor: cursor,
      limit: 1000, // Maximum allowed
    });

    if (!response.ok) {
      const error = response.error ?? t("errors.unknown_error");
      throw new Error(t("errors.channel_members_fetch_failed", { error }));
    }

    // response.membersは string[] なので型安全に扱える
    const members = response.members ?? [];
    allMemberIds.push(...members);

    // 次のページがあるかチェック
    cursor = response.response_metadata?.next_cursor;
  } while (cursor);

  return {
    member_ids: allMemberIds,
    member_count: allMemberIds.length,
  };
}

export default SlackFunction(
  GetChannelMembersDefinition,
  async ({ inputs, client }) => {
    try {
      // Zodバリデーション
      const channelId = channelIdSchema.parse(inputs.channel_id);

      const result = await getChannelMembers(client, channelId);
      return { outputs: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`;
      console.error("Function error:", message);
      return { error: message };
    }
  },
);
