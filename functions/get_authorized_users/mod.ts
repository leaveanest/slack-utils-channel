import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { initI18n, t } from "../../lib/i18n/mod.ts";
import { channelIdSchema } from "../../lib/validation/schemas.ts";

// i18nを初期化
await initI18n();

/**
 * 認可ユーザー情報の型定義
 */
export interface AuthorizedUser {
  id: string;
  name: string;
  real_name: string;
  is_admin: boolean;
  is_owner: boolean;
  is_primary_owner: boolean;
}

/**
 * admin.users.list APIのレスポンス型
 */
interface AdminUsersListResponse {
  ok: boolean;
  users?: Array<{
    id: string;
    name?: string;
    real_name?: string;
    is_admin?: boolean;
    is_owner?: boolean;
    is_primary_owner?: boolean;
    is_bot?: boolean;
    deleted?: boolean;
    is_restricted?: boolean;
    is_ultra_restricted?: boolean;
  }>;
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
}

/**
 * プライベートチャンネル作成権限を持つユーザーを取得する関数の定義
 *
 * Admin API (admin.users.list) を使用して、
 * 管理者(is_admin)またはオーナー(is_owner)のユーザーをフィルタリングします。
 */
export const GetAuthorizedUsersDefinition = DefineFunction({
  callback_id: "get_authorized_users",
  title: "Get Authorized Users",
  description:
    "Get users who have permission to create private channels (admins and owners)",
  source_file: "functions/get_authorized_users/mod.ts",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description:
          "Channel ID to get workspace team_id (for Enterprise Grid)",
      },
    },
    required: ["channel_id"],
  },
  output_parameters: {
    properties: {
      authorized_users: {
        type: Schema.types.array,
        items: {
          type: Schema.types.object,
          properties: {
            id: { type: Schema.types.string },
            name: { type: Schema.types.string },
            real_name: { type: Schema.types.string },
            is_admin: { type: Schema.types.boolean },
            is_owner: { type: Schema.types.boolean },
            is_primary_owner: { type: Schema.types.boolean },
          },
          required: ["id", "name", "real_name", "is_admin", "is_owner"],
        },
        description: "List of users with private channel creation permission",
      },
      user_ids: {
        type: Schema.types.array,
        items: { type: Schema.slack.types.user_id },
        description: "List of user IDs with permission",
      },
      count: {
        type: Schema.types.integer,
        description: "Number of authorized users",
      },
    },
    required: ["authorized_users", "user_ids", "count"],
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
 * Admin API を使用してプライベートチャンネル作成権限を持つユーザーを取得します
 *
 * @param adminToken - 管理者のユーザートークン（xoxp-...）
 * @param teamId - ワークスペースのチームID
 * @returns 権限を持つユーザーのリスト
 * @throws {Error} APIリクエストに失敗した場合
 *
 * @example
 * ```typescript
 * const users = await getAuthorizedUsersWithAdminApi(adminToken, teamId);
 * console.log(users); // [{ id: "U123", name: "admin", ... }]
 * ```
 */
export async function getAuthorizedUsersWithAdminApi(
  adminToken: string,
  teamId: string,
): Promise<AuthorizedUser[]> {
  console.log(t("logs.fetching_authorized_users", { teamId }));

  const authorizedUsers: AuthorizedUser[] = [];
  let cursor: string | undefined;

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
      has_next_cursor: !!result.response_metadata?.next_cursor,
    });

    if (!result.ok) {
      throw new Error(
        t("errors.fetch_authorized_users_failed", {
          error: result.error ?? t("errors.unknown_error"),
        }),
      );
    }

    if (result.users) {
      for (const user of result.users) {
        // ボット、削除済み、ゲストユーザーを除外
        if (user.is_bot || user.deleted || user.is_restricted || user.is_ultra_restricted) {
          continue;
        }

        // 管理者またはオーナーのみを抽出
        if (user.is_admin || user.is_owner || user.is_primary_owner) {
          authorizedUsers.push({
            id: user.id,
            name: user.name ?? "",
            real_name: user.real_name ?? "",
            is_admin: user.is_admin ?? false,
            is_owner: user.is_owner ?? false,
            is_primary_owner: user.is_primary_owner ?? false,
          });
        }
      }
    }

    cursor = result.response_metadata?.next_cursor;
  } while (cursor);

  console.log(
    t("logs.authorized_users_fetched", { count: authorizedUsers.length }),
  );

  return authorizedUsers;
}

export default SlackFunction(
  GetAuthorizedUsersDefinition,
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

      // Admin API で権限を持つユーザーを取得
      const authorizedUsers = await getAuthorizedUsersWithAdminApi(
        adminToken,
        teamId,
      );

      // ユーザーIDのリストを作成
      const userIds = authorizedUsers.map((user) => user.id);

      return {
        outputs: {
          authorized_users: authorizedUsers,
          user_ids: userIds,
          count: authorizedUsers.length,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`;
      console.error("Function error:", message);
      return { error: message };
    }
  },
);
