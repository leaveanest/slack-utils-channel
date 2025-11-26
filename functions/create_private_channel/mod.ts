import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { t } from "../../lib/i18n/mod.ts";
import {
  nonEmptyStringSchema,
  userIdSchema,
} from "../../lib/validation/schemas.ts";
import { z } from "zod";

export const CreatePrivateChannelDefinition = DefineFunction({
  callback_id: "create_private_channel",
  title: "Create Private Channel",
  description: "Create a new private channel with optional initial members",
  source_file: "functions/create_private_channel/mod.ts",
  input_parameters: {
    properties: {
      channel_name: {
        type: Schema.types.string,
        description: "Name of the channel to create (without #)",
      },
      description: {
        type: Schema.types.string,
        description: "Channel description (optional)",
      },
      initial_members: {
        type: Schema.types.array,
        items: {
          type: Schema.slack.types.user_id,
        },
        description: "User IDs to invite to the channel (optional)",
      },
    },
    required: ["channel_name"],
  },
  output_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "ID of the created channel",
      },
      channel_name: {
        type: Schema.types.string,
        description: "Name of the created channel",
      },
      member_count: {
        type: Schema.types.number,
        description: "Number of initial members (including bot)",
      },
    },
    required: ["channel_id", "channel_name", "member_count"],
  },
});

/**
 * チャンネル作成結果
 */
export interface CreateChannelResult {
  /** 作成されたチャンネルのID */
  channel_id: string;
  /** 作成されたチャンネルの名前 */
  channel_name: string;
  /** 初期メンバー数（Botを含む） */
  member_count: number;
}

/**
 * チャンネル名を正規化します
 *
 * Slackのチャンネル名規則に従って、小文字化、スペースをハイフンに変換、
 * 許可された文字のみを使用し、80文字以内に制限します。
 *
 * @param name - 正規化前のチャンネル名
 * @returns 正規化されたチャンネル名
 *
 * @example
 * ```typescript
 * normalizeChannelName("Project Alpha") // => "project-alpha"
 * normalizeChannelName("Test@#Channel!") // => "testchannel"
 * ```
 */
export function normalizeChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-") // スペースをハイフンに
    .replace(/[^a-z0-9-_]/g, "") // 許可された文字のみ
    .slice(0, 80); // Slackの最大長に制限
}

/**
 * プライベートチャンネルを作成し、初期メンバーを招待します
 *
 * チャンネル名の正規化（小文字化、スペースをハイフンに変換）を自動的に実行します。
 * 初期メンバーが指定された場合、チャンネル作成後に招待を実行します。
 *
 * @param client - Slack APIクライアント
 * @param channelName - チャンネル名（#なし、自動で正規化される）
 * @param description - チャンネルの説明（オプション）
 * @param initialMembers - 初期メンバーのユーザーIDリスト（オプション）
 * @returns 作成されたチャンネルの情報
 * @throws {Error} チャンネル作成または招待に失敗した場合
 *
 * @example
 * ```typescript
 * const result = await createPrivateChannel(
 *   client,
 *   "project-alpha",
 *   "Alpha project private discussion",
 *   ["U12345", "U67890"]
 * );
 * console.log(`チャンネル作成: ${result.channel_name} (${result.channel_id})`);
 * ```
 */
export async function createPrivateChannel(
  client: SlackAPIClient,
  channelName: string,
  description?: string,
  initialMembers?: string[],
): Promise<CreateChannelResult> {
  // チャンネル名を正規化
  const normalizedName = normalizeChannelName(channelName);

  if (normalizedName.length === 0) {
    throw new Error(t("errors.invalid_channel_name", { name: channelName }));
  }

  console.log(t("logs.creating_channel", { name: normalizedName }));

  // 1. プライベートチャンネルを作成
  // Note: Run on Slack does not support team:read scope,
  // so we cannot use team_id parameter for Enterprise Grid.
  // This may cause issues in Enterprise Grid environments.
  const createResponse = await client.conversations.create({
    name: normalizedName,
    is_private: true,
  });

  if (!createResponse.ok || !createResponse.channel) {
    const error = createResponse.error ?? t("errors.unknown_error");
    throw new Error(t("errors.channel_create_failed", { error }));
  }

  const channelId = createResponse.channel.id as string;
  console.log(t("logs.channel_created_private", { id: channelId }));

  let memberCount = 1; // Bot自身

  // 2. 説明（トピック）を設定（オプション）
  if (description && description.trim().length > 0) {
    const topicResponse = await client.conversations.setTopic({
      channel: channelId,
      topic: description,
    });

    if (!topicResponse.ok) {
      const error = topicResponse.error ?? t("errors.unknown_error");
      console.error(t("errors.channel_topic_set_failed", { error }));
      // トピック設定失敗はエラーにしない（チャンネルは作成済み）
    }
  }

  // 3. 初期メンバーを招待（オプション）
  if (initialMembers && initialMembers.length > 0) {
    console.log(t("logs.inviting_members", { count: initialMembers.length }));

    const inviteResponse = await client.conversations.invite({
      channel: channelId,
      users: initialMembers.join(","),
    });

    if (!inviteResponse.ok) {
      const error = inviteResponse.error ?? t("errors.unknown_error");
      console.error(t("errors.member_invite_failed", { error }));
      // 招待失敗はエラーにしない（チャンネルは作成済み）
    } else {
      memberCount += initialMembers.length;
    }
  }

  console.log(t("messages.channel_created", { name: normalizedName }));

  return {
    channel_id: channelId,
    channel_name: normalizedName,
    member_count: memberCount,
  };
}

export default SlackFunction(
  CreatePrivateChannelDefinition,
  async ({ inputs, client }) => {
    try {
      // Zodバリデーション
      const channelName = nonEmptyStringSchema.parse(inputs.channel_name);

      // オプショナルパラメータの処理
      const description = inputs.description as string | undefined;
      const initialMembers = inputs.initial_members as string[] | undefined;

      // 初期メンバーのバリデーション
      if (initialMembers) {
        const membersSchema = z.array(userIdSchema);
        membersSchema.parse(initialMembers);
      }

      const result = await createPrivateChannel(
        client,
        channelName,
        description,
        initialMembers,
      );

      return { outputs: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`;
      console.error("Function error:", message);
      return { error: message };
    }
  },
);
