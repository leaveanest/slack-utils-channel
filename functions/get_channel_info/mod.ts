import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { t } from "../../lib/i18n/mod.ts";
import { channelIdSchema } from "../../lib/validation/schemas.ts";

export const GetChannelInfoDefinition = DefineFunction({
  callback_id: "get_channel_info",
  title: "チャンネル詳細取得",
  description: "チャンネル情報を取得します",
  source_file: "functions/get_channel_info/mod.ts",
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
      id: {
        type: Schema.types.string,
        description: "チャンネルID",
      },
      name: {
        type: Schema.types.string,
        description: "チャンネル名",
      },
      is_archived: {
        type: Schema.types.boolean,
        description: "アーカイブ済みかどうか",
      },
      member_count: {
        type: Schema.types.number,
        description: "メンバー数",
      },
    },
    required: ["id", "name", "is_archived", "member_count"],
  },
});

/**
 * チャンネルの概要情報
 */
export interface ChannelSummary {
  /** チャンネルID */
  id: string;
  /** チャンネル名 */
  name: string;
  /** アーカイブされているかどうか */
  is_archived: boolean;
  /** メンバー数 */
  member_count: number;
}

/**
 * Slackチャンネルの情報を取得します
 *
 * 指定されたチャンネルIDから、チャンネルの詳細情報（ID、名前、アーカイブ状態、メンバー数）を取得し、
 * 簡潔なサマリー形式で返します。
 *
 * @param client - Slack APIクライアント
 * @param channelId - 取得対象のチャンネルID（例: "C12345678"）
 * @returns チャンネルの概要情報
 * @throws {Error} チャンネル情報の取得に失敗した場合、またはチャンネルが存在しない場合
 *
 * @example
 * ```typescript
 * const summary = await retrieveChannelSummary(client, "C12345678");
 * console.log(`チャンネル名: ${summary.name}, メンバー数: ${summary.member_count}`);
 * ```
 */
export async function retrieveChannelSummary(
  client: SlackAPIClient,
  channelId: string,
): Promise<ChannelSummary> {
  const response = await client.conversations.info({
    channel: channelId,
  });

  if (!response.ok || response.channel === undefined) {
    const error = response.error ?? t("errors.unknown_error");
    throw new Error(t("errors.channel_not_found", { error }));
  }

  const channel = response.channel as {
    id: string;
    name?: string;
    is_archived?: boolean;
    num_members?: number;
  };

  return {
    id: channel.id,
    name: channel.name ?? "(no name)",
    is_archived: Boolean(channel.is_archived),
    member_count: channel.num_members ?? 0,
  };
}

export default SlackFunction(
  GetChannelInfoDefinition,
  async ({ inputs, client }) => {
    try {
      // Zodバリデーション
      const channelId = channelIdSchema.parse(inputs.channel_id);

      const summary = await retrieveChannelSummary(client, channelId);
      return { outputs: summary };
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`;
      console.error("Function error:", message);
      return { error: message };
    }
  },
);
