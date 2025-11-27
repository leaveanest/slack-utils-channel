import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { initI18n, t } from "../../lib/i18n/mod.ts";
import { channelIdSchema } from "../../lib/validation/schemas.ts";

// i18nを初期化
await initI18n();

/**
 * Admin API から取得するユーザー情報の型
 */
interface AdminUser {
  id: string;
  email?: string;
  is_admin?: boolean;
  is_owner?: boolean;
  is_primary_owner?: boolean;
  is_restricted?: boolean;
  is_ultra_restricted?: boolean;
  is_bot?: boolean;
  deleted?: boolean;
}

/**
 * admin.users.list API レスポンスの型
 */
interface AdminUsersListResponse {
  ok: boolean;
  users?: AdminUser[];
  next_cursor?: string;
  error?: string;
}

/**
 * プライベートチャンネル作成権限を持つユーザーをフィルタリングする関数の定義
 *
 * Admin API を使用してワークスペースのユーザーリストを取得し、
 * プライベートチャンネル作成権限を持つユーザーのみを返します。
 */
export const FilterUsersPrivateChannelPermissionDefinition = DefineFunction({
  callback_id: "filter_users_private_channel_permission",
  title: "Filter Users with Private Channel Permission",
  description:
    "Filter users who have permission to create private channels using Admin API",
  source_file: "functions/filter_users_private_channel_permission/mod.ts",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description:
          "Channel ID to get workspace team_id (any channel in the workspace)",
      },
    },
    required: ["channel_id"],
  },
  output_parameters: {
    properties: {
      user_ids: {
        type: Schema.types.array,
        items: {
          type: Schema.slack.types.user_id,
        },
        description: "User IDs who have permission to create private channels",
      },
      user_count: {
        type: Schema.types.integer,
        description: "Number of users with permission",
      },
    },
    required: ["user_ids", "user_count"],
  },
});

/**
 * ワークスペースの team_id を取得します
 *
 * @param client - Slack APIクライアント
 * @param channelId - ワークスペース内の任意のチャンネルID
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
 * Admin API を使用してワークスペースのユーザーリストを取得します
 *
 * @param adminToken - 管理者のユーザートークン（xoxp-...）
 * @param teamId - ワークスペースのチームID
 * @returns ユーザーリスト
 * @throws {Error} ユーザーリストの取得に失敗した場合
 */
export async function fetchWorkspaceUsers(
  adminToken: string,
  teamId: string,
): Promise<AdminUser[]> {
  const allUsers: AdminUser[] = [];
  let cursor: string | undefined;

  console.log(t("logs.fetching_workspace_users", { teamId }));

  do {
    const params = new URLSearchParams({
      team_id: teamId,
      limit: "200",
    });

    if (cursor) {
      params.append("cursor", cursor);
    }

    const response = await fetch(
      `https://slack.com/api/admin.users.list?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );

    const result: AdminUsersListResponse = await response.json();

    console.log("admin.users.list response:", {
      ok: result.ok,
      error: result.error,
      user_count: result.users?.length ?? 0,
      has_next_cursor: !!result.next_cursor,
    });

    if (!result.ok) {
      throw new Error(
        t("errors.users_list_failed", {
          error: result.error ?? t("errors.unknown_error"),
        }),
      );
    }

    if (result.users) {
      allUsers.push(...result.users);
    }

    cursor = result.next_cursor;
  } while (cursor);

  console.log(t("logs.users_fetched", { count: allUsers.length }));

  return allUsers;
}

/**
 * プライベートチャンネル作成権限を持つユーザーをフィルタリングします
 *
 * フィルタリング条件:
 * - is_admin = true（管理者）
 * - is_owner = true（オーナー）
 * - is_primary_owner = true（プライマリオーナー）
 * - かつ、削除済み・制限付き・ボットではないこと
 *
 * @param users - ワークスペースのユーザーリスト
 * @returns プライベートチャンネル作成権限を持つユーザーIDの配列
 */
export function filterUsersWithPrivateChannelPermission(
  users: AdminUser[],
): string[] {
  return users
    .filter((user) => {
      // 削除済みユーザーを除外
      if (user.deleted) {
        return false;
      }

      // ボットを除外
      if (user.is_bot) {
        return false;
      }

      // 制限付きユーザー（ゲスト）を除外
      if (user.is_restricted || user.is_ultra_restricted) {
        return false;
      }

      // 管理者、オーナー、プライマリオーナーのみを含める
      return user.is_admin || user.is_owner || user.is_primary_owner;
    })
    .map((user) => user.id);
}

export default SlackFunction(
  FilterUsersPrivateChannelPermissionDefinition,
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

      console.log(t("logs.filtering_users_with_permission", { teamId }));

      // Admin API でユーザーリストを取得
      const users = await fetchWorkspaceUsers(adminToken, teamId);

      // プライベートチャンネル作成権限を持つユーザーをフィルタリング
      const filteredUserIds = filterUsersWithPrivateChannelPermission(users);

      console.log(
        t("logs.users_filtered", {
          total: users.length,
          filtered: filteredUserIds.length,
        }),
      );

      return {
        outputs: {
          user_ids: filteredUserIds,
          user_count: filteredUserIds.length,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`;
      console.error("Function error:", message);
      return { error: message };
    }
  },
);
