import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { initI18n, t } from "../../lib/i18n/mod.ts";
import { channelIdSchema } from "../../lib/validation/schemas.ts";

// i18nを初期化
await initI18n();

/**
 * admin.teams.settings.info APIのレスポンス型
 */
interface AdminTeamsSettingsInfoResponse {
  ok: boolean;
  team?: {
    id: string;
    name?: string;
    domain?: string;
    default_channels?: string[];
    who_can_create_private_channels?: string;
  };
  error?: string;
}

/**
 * プライベートチャンネル作成権限を確認する関数の定義
 *
 * Admin API (admin.teams.settings.info) を使用して、
 * ワークスペースのプライベートチャンネル作成権限設定を取得します。
 */
export const CheckPrivateChannelPermissionsDefinition = DefineFunction({
  callback_id: "check_private_channel_permissions",
  title: "プライベートチャンネル作成権限確認",
  description: "ワークスペースのプライベートチャンネル作成権限設定を確認します",
  source_file: "functions/check_private_channel_permissions/mod.ts",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
        description: "インタラクティブコンテキスト（出力に渡されます）",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "team_id取得用チャンネルID（Enterprise Grid用）",
      },
    },
    required: ["interactivity", "channel_id"],
  },
  output_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
        description: "インタラクティブコンテキスト（入力から引き継ぎ）",
      },
      who_can_create_private_channels: {
        type: Schema.types.string,
        description:
          "プライベートチャンネル作成権限（everyone, admin, ownerなど）",
      },
      is_everyone_allowed: {
        type: Schema.types.boolean,
        description: "全員がプライベートチャンネルを作成可能かどうか",
      },
    },
    required: [
      "interactivity",
      "who_can_create_private_channels",
      "is_everyone_allowed",
    ],
  },
});

/**
 * ワークスペースの team_id を取得します
 *
 * @param client - Slack APIクライアント
 * @param channelId - チャンネルID
 * @returns ワークスペースのteam_id
 * @throws {Error} チャンネル情報の取得に失敗した場合
 */
async function getWorkspaceTeamId(
  // deno-lint-ignore no-explicit-any
  client: any,
  channelId: string,
): Promise<string> {
  const response = await client.conversations.info({ channel: channelId });

  if (!response.ok || !response.channel) {
    throw new Error(
      t("errors.channel_info_failed", {
        error: response.error ?? t("errors.unknown_error"),
      }),
    );
  }

  // deno-lint-ignore no-explicit-any
  const teamId = (response.channel as any).context_team_id as string;

  if (!teamId) {
    throw new Error(t("errors.missing_team_id"));
  }

  return teamId;
}

/**
 * Admin API を使用してワークスペースの設定を取得します
 *
 * @param adminToken - 管理者のユーザートークン（xoxp-...）
 * @param teamId - ワークスペースのチームID
 * @returns ワークスペース設定情報
 * @throws {Error} APIリクエストに失敗した場合
 *
 * @example
 * ```typescript
 * const settings = await getTeamSettings(adminToken, teamId);
 * console.log(settings.who_can_create_private_channels); // "everyone" | "admin" | "owner"
 * ```
 */
export async function getTeamSettings(
  adminToken: string,
  teamId: string,
): Promise<{ who_can_create_private_channels: string }> {
  console.log(t("logs.fetching_team_settings", { teamId }));

  const params = new URLSearchParams({
    team_id: teamId,
  });

  const response = await fetch(
    `https://slack.com/api/admin.teams.settings.info?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${adminToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  );

  const result: AdminTeamsSettingsInfoResponse = await response.json();

  console.log("admin.teams.settings.info response:", {
    ok: result.ok,
    error: result.error,
    who_can_create_private_channels: result.team
      ?.who_can_create_private_channels,
  });

  if (!result.ok) {
    throw new Error(
      t("errors.fetch_team_settings_failed", {
        error: result.error ?? t("errors.unknown_error"),
      }),
    );
  }

  // デフォルトは "admin"（制限あり）として扱う
  const whoCanCreatePrivateChannels =
    result.team?.who_can_create_private_channels ?? "admin";

  return {
    who_can_create_private_channels: whoCanCreatePrivateChannels,
  };
}

export default SlackFunction(
  CheckPrivateChannelPermissionsDefinition,
  async ({ inputs, client, env }) => {
    try {
      // バリデーション
      const channelId = channelIdSchema.parse(inputs.channel_id);

      // 環境変数から Admin User Token を取得
      const adminToken = env.SLACK_ADMIN_USER_TOKEN;

      if (!adminToken) {
        throw new Error(t("errors.missing_admin_token"));
      }

      // ワークスペースの team_id を取得
      const teamId = await getWorkspaceTeamId(client, channelId);

      // Admin API でワークスペース設定を取得
      const settings = await getTeamSettings(adminToken, teamId);

      const whoCanCreatePrivateChannels =
        settings.who_can_create_private_channels;
      const isEveryoneAllowed = whoCanCreatePrivateChannels === "everyone";

      console.log(
        t("logs.private_channel_permissions_checked", {
          permission: whoCanCreatePrivateChannels,
          isEveryoneAllowed: isEveryoneAllowed.toString(),
        }),
      );

      return {
        outputs: {
          interactivity: inputs.interactivity,
          who_can_create_private_channels: whoCanCreatePrivateChannels,
          is_everyone_allowed: isEveryoneAllowed,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`;
      console.error("Function error:", message);
      return { error: message };
    }
  },
);
