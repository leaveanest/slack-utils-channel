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
  title: "Create Channel",
  description:
    "Create a new channel (public or private) with optional initial members",
  source_file: "functions/create_private_channel/mod.ts",
  input_parameters: {
    properties: {
      channel_name: {
        type: Schema.types.string,
        description: "Name of the channel to create (without #)",
      },
      creator_id: {
        type: Schema.slack.types.user_id,
        description:
          "User ID of the channel creator (required for workspace apps)",
      },
      notification_channel_id: {
        type: Schema.slack.types.channel_id,
        description:
          "Channel ID where shortcut was triggered (used to get workspace team_id)",
      },
      is_private: {
        type: Schema.types.boolean,
        description: "Whether to create a private channel (default: true)",
        default: true,
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
    required: ["channel_name", "creator_id", "notification_channel_id"],
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
 * チャンネルを作成し、初期メンバーを招待します
 *
 * チャンネル名の正規化（小文字化、スペースをハイフンに変換）を自動的に実行します。
 * 初期メンバーが指定された場合、チャンネル作成後に招待を実行します。
 * Enterprise Grid環境では、notificationChannelIdからワークスペースのteam_idを取得します。
 *
 * @param client - Slack APIクライアント
 * @param channelName - チャンネル名（#なし、自動で正規化される）
 * @param creatorId - チャンネル作成者のユーザーID（ワークスペースアプリでは必須）
 * @param notificationChannelId - 通知先チャンネルID（workspace team_idを取得するために使用）
 * @param isPrivate - プライベートチャンネルとして作成するか（デフォルト: true）
 * @param description - チャンネルの説明（オプション）
 * @param initialMembers - 初期メンバーのユーザーIDリスト（オプション）
 * @returns 作成されたチャンネルの情報
 * @throws {Error} チャンネル作成または招待に失敗した場合
 *
 * @example
 * ```typescript
 * const result = await createChannel(
 *   client,
 *   "project-alpha",
 *   "U12345",
 *   "C12345",
 *   true, // private channel
 *   "Alpha project private discussion",
 *   ["U67890", "U11111"]
 * );
 * console.log(`チャンネル作成: ${result.channel_name} (${result.channel_id})`);
 * ```
 */
export async function createChannel(
  client: SlackAPIClient,
  channelName: string,
  creatorId: string,
  notificationChannelId: string,
  isPrivate: boolean = true,
  description?: string,
  initialMembers?: string[],
): Promise<CreateChannelResult> {
  // チャンネル名を正規化
  const normalizedName = normalizeChannelName(channelName);

  if (normalizedName.length === 0) {
    throw new Error(t("errors.invalid_channel_name", { name: channelName }));
  }

  console.log(t("logs.creating_channel", { name: normalizedName }));

  // Step 0: conversations.info でワークスペースの team_id を取得
  console.log("Step 0: Getting workspace team_id from channel:", {
    channel: notificationChannelId,
  });

  const channelInfoResponse = await client.conversations.info({
    channel: notificationChannelId,
  });

  if (!channelInfoResponse.ok || !channelInfoResponse.channel) {
    const error = channelInfoResponse.error ?? t("errors.unknown_error");
    throw new Error(t("errors.channel_info_failed", { error }));
  }

  // context_team_id がワークスペースの team_id (Tで始まる)
  // deno-lint-ignore no-explicit-any
  const workspaceTeamId = (channelInfoResponse.channel as any)
    .context_team_id as string;

  console.log("Retrieved workspace team_id:", {
    context_team_id: workspaceTeamId,
  });

  if (!workspaceTeamId) {
    throw new Error(t("errors.missing_team_id"));
  }

  // Step 1: チャンネルを作成（Enterprise Gridではteam_id、プライベートチャンネルではuser_idsが必須）
  const channelType = isPrivate ? "private" : "public";
  console.log(`Step 1: Creating ${channelType} channel:`, {
    name: normalizedName,
    is_private: isPrivate,
    user_ids: isPrivate ? creatorId : undefined,
    team_id: workspaceTeamId,
  });

  // deno-lint-ignore no-explicit-any
  const createParams: any = {
    name: normalizedName,
    is_private: isPrivate,
    team_id: workspaceTeamId, // Enterprise Gridでは必須（conversations.infoから取得）
  };

  // プライベートチャンネルの場合のみuser_idsが必須
  if (isPrivate) {
    createParams.user_ids = creatorId;
  }

  const createResponse = await client.conversations.create(createParams);

  console.log("conversations.create response:", {
    ok: createResponse.ok,
    error: createResponse.error,
    has_channel: !!createResponse.channel,
  });

  if (!createResponse.ok || !createResponse.channel) {
    const error = createResponse.error ?? t("errors.unknown_error");
    throw new Error(t("errors.channel_create_failed", { error }));
  }

  const channelId = createResponse.channel.id as string;
  console.log(
    `${
      channelType.charAt(0).toUpperCase() + channelType.slice(1)
    } channel created with ID:`,
    channelId,
  );

  let memberCount = 1; // 作成者自身

  // 3. 説明（トピック）を設定（オプション）
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
      const creatorId = userIdSchema.parse(inputs.creator_id);
      const notificationChannelId = inputs.notification_channel_id as string;

      // notification_channel_idの検証
      if (!notificationChannelId) {
        throw new Error(t("errors.missing_notification_channel"));
      }

      // オプショナルパラメータの処理
      // is_private: デフォルトはtrue（プライベートチャンネル）
      const isPrivate = inputs.is_private !== false;
      const description = inputs.description as string | undefined;
      const initialMembers = inputs.initial_members as string[] | undefined;

      // 初期メンバーのバリデーション
      if (initialMembers) {
        const membersSchema = z.array(userIdSchema);
        membersSchema.parse(initialMembers);
      }

      const result = await createChannel(
        client,
        channelName,
        creatorId,
        notificationChannelId,
        isPrivate,
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
