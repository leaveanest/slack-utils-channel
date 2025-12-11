import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { initI18n, t } from "../../lib/i18n/mod.ts";
import { channelIdSchema } from "../../lib/validation/schemas.ts";
import { AuthorizedUserType } from "../../lib/types/authorized_user.ts";

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
    username?: string;
    full_name?: string;
    email?: string;
    is_admin?: boolean;
    is_owner?: boolean;
    is_primary_owner?: boolean;
    is_bot?: boolean;
    deleted?: boolean;
    is_active?: boolean;
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
  title: "承認権限ユーザー取得",
  description:
    "プライベートチャンネル作成権限を持つユーザー（管理者とオーナー）を取得します",
  source_file: "functions/get_authorized_users/mod.ts",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
        description: "インタラクティブコンテキスト（出力に渡されます）",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description:
          "team_id取得用チャンネルID（Enterprise Grid用）",
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
      authorized_users: {
        type: Schema.types.array,
        items: {
          type: AuthorizedUserType,
        },
        description: "プライベートチャンネル作成権限を持つユーザー一覧",
      },
      user_ids: {
        type: Schema.types.array,
        items: { type: Schema.slack.types.user_id },
        description: "権限を持つユーザーのID一覧",
      },
      count: {
        type: Schema.types.integer,
        description: "権限ユーザー数",
      },
    },
    required: ["interactivity", "authorized_users", "user_ids", "count"],
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

  // 無限ループを防ぐための最大ページ数制限
  const MAX_PAGES = 50;
  let pageCount = 0;

  do {
    pageCount++;
    if (pageCount > MAX_PAGES) {
      console.warn(
        t("logs.max_page_limit_reached", { limit: MAX_PAGES }),
      );
      break;
    }

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

    // カーソル値をログに出力してデバッグを容易にする
    const nextCursor = result.response_metadata?.next_cursor;
    console.log("admin.users.list response:", {
      ok: result.ok,
      error: result.error,
      user_count: result.users?.length ?? 0,
      has_next_cursor: !!nextCursor,
      cursor_value: nextCursor ? nextCursor.substring(0, 20) + "..." : "none",
      page: pageCount,
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
        if (
          user.is_bot || user.deleted || user.is_restricted ||
          user.is_ultra_restricted
        ) {
          continue;
        }

        // 管理者またはオーナーのみを抽出（重複を防ぐ）
        if (user.is_admin || user.is_owner || user.is_primary_owner) {
          // 既に追加済みのユーザーはスキップ
          if (authorizedUsers.some((u) => u.id === user.id)) {
            continue;
          }

          authorizedUsers.push({
            id: user.id,
            name: user.username ?? "",
            real_name: user.full_name ?? "",
            is_admin: user.is_admin ?? false,
            is_owner: user.is_owner ?? false,
            is_primary_owner: user.is_primary_owner ?? false,
          });
        }
      }
    }

    // カーソルチェックの改善: 空文字列、undefined、同じカーソルの場合はループ終了
    const newCursor = result.response_metadata?.next_cursor;
    if (!newCursor || newCursor === "" || newCursor === cursor) {
      break;
    }
    cursor = newCursor;
  } while (true);

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
          interactivity: inputs.interactivity,
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
