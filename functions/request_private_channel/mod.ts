import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { z } from "zod";
import { initI18n, t } from "../../lib/i18n/mod.ts";
import {
  nonEmptyStringSchema,
  userIdSchema,
} from "../../lib/validation/schemas.ts";

// i18nを初期化
await initI18n();

/**
 * プライベートチャンネル作成リクエスト関数の定義
 *
 * ユーザーからのリクエストを受け付け、管理者に承認を求めます。
 * 承認後は Admin API を使用してプライベートチャンネルを作成します。
 */
export const RequestPrivateChannelDefinition = DefineFunction({
  callback_id: "request_private_channel",
  title: "プライベートチャンネル申請",
  description: "管理者にプライベートチャンネル作成の承認を申請します",
  source_file: "functions/request_private_channel/mod.ts",
  input_parameters: {
    properties: {
      channel_name: {
        type: Schema.types.string,
        description: "作成するチャンネル名（#なし）",
      },
      requester_id: {
        type: Schema.slack.types.user_id,
        description: "申請者のユーザーID",
      },
      approver_id: {
        type: Schema.slack.types.user_id,
        description: "承認する管理者のユーザーID",
      },
      approval_channel_id: {
        type: Schema.slack.types.channel_id,
        description: "承認リクエストを送信するチャンネルID",
      },
      description: {
        type: Schema.types.string,
        description: "チャンネルの説明（任意）",
      },
      initial_members: {
        type: Schema.types.array,
        items: {
          type: Schema.slack.types.user_id,
        },
        description: "チャンネルに招待するユーザーID（任意）",
      },
    },
    required: [
      "channel_name",
      "requester_id",
      "approver_id",
      "approval_channel_id",
    ],
  },
  output_parameters: {
    properties: {
      approved: {
        type: Schema.types.boolean,
        description: "承認されたかどうか",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "作成されたチャンネルのID（承認時）",
      },
      channel_name: {
        type: Schema.types.string,
        description: "作成されたチャンネル名（承認時）",
      },
      reviewer_id: {
        type: Schema.slack.types.user_id,
        description: "レビューしたユーザーのID",
      },
    },
    required: ["approved", "reviewer_id"],
  },
});

/**
 * チャンネル名を正規化します
 */
export function normalizeChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 80);
}

/**
 * Admin API を使用してプライベートチャンネルを作成します
 *
 * @param adminToken - 管理者のユーザートークン（xoxp-...）
 * @param channelName - 作成するチャンネル名
 * @param teamId - ワークスペースのチームID
 * @param description - チャンネルの説明（オプション）
 * @returns 作成されたチャンネル情報
 */
export async function createPrivateChannelWithAdminApi(
  adminToken: string,
  channelName: string,
  teamId: string,
  description?: string,
): Promise<{ ok: boolean; channel_id?: string; error?: string }> {
  console.log(t("logs.creating_channel_admin_api", { name: channelName }));

  const requestBody: Record<string, unknown> = {
    name: channelName,
    is_private: true,
    team_id: teamId,
  };

  // 説明がある場合は追加
  if (description && description.trim().length > 0) {
    requestBody.description = description;
    console.log("Creating channel with description:", description);
  }

  const response = await fetch(
    "https://slack.com/api/admin.conversations.create",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${adminToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(requestBody),
    },
  );

  const result = await response.json();

  console.log("admin.conversations.create response:", {
    ok: result.ok,
    error: result.error,
    has_channel_id: !!result.channel_id,
  });

  if (!result.ok) {
    return { ok: false, error: result.error ?? t("errors.unknown_error") };
  }

  return { ok: true, channel_id: result.channel_id };
}

/**
 * ワークスペースの team_id を取得します
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

export default SlackFunction(
  RequestPrivateChannelDefinition,
  async ({ inputs, client }) => {
    try {
      // バリデーション
      const channelName = nonEmptyStringSchema.parse(inputs.channel_name);
      const requesterId = userIdSchema.parse(inputs.requester_id);
      const approverId = userIdSchema.parse(inputs.approver_id);
      const approvalChannelId = inputs.approval_channel_id as string;

      const normalizedName = normalizeChannelName(channelName);

      if (normalizedName.length === 0) {
        throw new Error(
          t("errors.invalid_channel_name", { name: channelName }),
        );
      }

      // オプショナルパラメータ
      const description = inputs.description as string | undefined;
      const initialMembers = inputs.initial_members as string[] | undefined;

      // 初期メンバーのバリデーション
      if (initialMembers) {
        const membersSchema = z.array(userIdSchema);
        membersSchema.parse(initialMembers);
      }

      // 承認リクエストメッセージを送信
      console.log(
        t("logs.sending_approval_request", {
          channel: normalizedName,
          approver: approverId,
        }),
      );

      // リクエスト情報をメッセージに含める
      const membersText = initialMembers && initialMembers.length > 0
        ? initialMembers.map((m) => `<@${m}>`).join(", ")
        : t("messages.no_initial_members");

      const descriptionText = description || t("messages.no_description");

      await client.chat.postMessage({
        channel: approvalChannelId,
        text: t("messages.approval_request_title", { channel: normalizedName }),
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: t("messages.approval_request_header"),
              emoji: true,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: t("messages.approval_request_details", {
                requester: requesterId,
                channel: normalizedName,
                description: descriptionText,
                members: membersText,
              }),
            },
          },
          {
            type: "actions",
            block_id: "approval_actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: t("messages.approve_button"),
                  emoji: true,
                },
                action_id: "approve_channel_request",
                style: "primary",
                value: JSON.stringify({
                  channel_name: normalizedName,
                  requester_id: requesterId,
                  approver_id: approverId,
                  description: description || "",
                  initial_members: initialMembers || [],
                  approval_channel_id: approvalChannelId,
                }),
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: t("messages.deny_button"),
                  emoji: true,
                },
                action_id: "deny_channel_request",
                style: "danger",
                value: JSON.stringify({
                  channel_name: normalizedName,
                  requester_id: requesterId,
                  approver_id: approverId,
                }),
              },
            ],
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: t("messages.approval_context", { approver: approverId }),
              },
            ],
          },
        ],
      });

      console.log(t("logs.approval_request_sent"));

      // 関数を未完了状態で返す（ボタンクリックを待つ）
      return { completed: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`;
      console.error("Function error:", message);
      return { error: message };
    }
  },
)
  // 承認ボタンのハンドラー
  .addBlockActionsHandler(
    ["approve_channel_request"],
    async ({ action, body, client, env }) => {
      console.log("=== Approval button clicked ===");

      const reviewerId = body.user.id;
      const messageTs = body.message?.ts;
      // deno-lint-ignore no-explicit-any
      const channelId = (body as any).channel?.id ||
        body.function_data?.inputs?.approval_channel_id;

      // ボタンの value から情報を取得
      const requestData = JSON.parse(action.value || "{}");
      const channelName = requestData.channel_name;
      const requesterId = requestData.requester_id;
      const approverId = requestData.approver_id;
      const description = requestData.description;
      const initialMembers = requestData.initial_members || [];
      const approvalChannelId = requestData.approval_channel_id;

      console.log("Request details:", {
        channelName,
        requesterId,
        approverId,
        approvalChannelId,
        initialMembers,
      });

      // 承認者チェック: 指定された承認者のみが承認可能
      if (approverId && reviewerId !== approverId) {
        console.log(
          `Unauthorized approval attempt: ${reviewerId} is not the designated approver ${approverId}`,
        );
        // エラーメッセージを投稿
        await client.chat.postEphemeral({
          channel: approvalChannelId,
          user: reviewerId,
          text: t("errors.not_authorized_approver", { approver: approverId }),
        });
        return;
      }

      try {
        // 環境変数から Admin User Token を取得
        const adminToken = env.SLACK_ADMIN_USER_TOKEN;

        if (!adminToken) {
          throw new Error(t("errors.missing_admin_token"));
        }

        // ワークスペースの team_id を取得
        const teamId = await getWorkspaceTeamId(client, approvalChannelId);

        console.log(
          t("logs.creating_channel_after_approval", { name: channelName }),
        );

        // Admin API でプライベートチャンネルを作成（説明も同時に設定）
        const createResult = await createPrivateChannelWithAdminApi(
          adminToken,
          channelName,
          teamId,
          description, // 説明をチャンネル作成時に設定
        );

        if (!createResult.ok) {
          console.error("Channel creation failed:", createResult.error);
          throw new Error(
            t("errors.channel_create_failed", {
              error: createResult.error || t("errors.unknown_error"),
            }),
          );
        }

        const newChannelId = createResult.channel_id!;

        console.log("=== Private channel created successfully ===");
        console.log("Channel Name:", channelName);
        console.log("Channel ID:", newChannelId);
        console.log("==========================================");

        // Admin API でメンバーを招待する関数
        // user_ids はカンマ区切り文字列で渡す必要がある
        const inviteWithAdminApi = async (
          userIds: string[],
        ): Promise<{ ok: boolean; error?: string }> => {
          if (userIds.length === 0) {
            return { ok: true };
          }
          const response = await fetch(
            "https://slack.com/api/admin.conversations.invite",
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${adminToken}`,
                "Content-Type": "application/json; charset=utf-8",
              },
              body: JSON.stringify({
                channel_id: newChannelId,
                user_ids: userIds.join(","), // カンマ区切り文字列に変換
              }),
            },
          );
          return await response.json();
        };

        // リクエスト者と承認者と初期メンバーをまとめて招待
        const allMembersToInvite = [requesterId];
        // Add the approver to the channel
        if (approverId && !allMembersToInvite.includes(approverId)) {
          allMembersToInvite.push(approverId);
        }
        for (const member of initialMembers) {
          if (!allMembersToInvite.includes(member)) {
            allMembersToInvite.push(member);
          }
        }

        console.log("Inviting members via Admin API:", allMembersToInvite);
        try {
          const inviteResult = await inviteWithAdminApi(allMembersToInvite);
          console.log("Invite result:", {
            ok: inviteResult.ok,
            error: inviteResult.error,
          });
          if (!inviteResult.ok) {
            console.error("Failed to invite members:", inviteResult.error);
          }
        } catch (inviteError) {
          console.error("Failed to invite members:", inviteError);
        }

        // メッセージを更新
        if (messageTs && channelId) {
          await client.chat.update({
            channel: channelId,
            ts: messageTs,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: t("messages.channel_approved", {
                    channel: channelName,
                    channel_id: newChannelId,
                    reviewer: reviewerId,
                    requester: requesterId,
                  }),
                },
              },
              {
                type: "context",
                elements: [
                  {
                    type: "mrkdwn",
                    text: `✅ ${
                      t("messages.approved_at", {
                        time: new Date().toISOString(),
                      })
                    }`,
                  },
                ],
              },
            ],
          });
        }

        // 関数を完了
        await client.functions.completeSuccess({
          function_execution_id: body.function_data.execution_id,
          outputs: {
            approved: true,
            channel_id: newChannelId,
            channel_name: channelName,
            reviewer_id: reviewerId,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : `${error}`;
        console.error("Approval handler error:", errorMessage);

        // エラーメッセージを更新
        if (messageTs && channelId) {
          await client.chat.update({
            channel: channelId,
            ts: messageTs,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: t("messages.channel_creation_failed", {
                    channel: channelName,
                    error: errorMessage,
                  }),
                },
              },
            ],
          });
        }

        await client.functions.completeError({
          function_execution_id: body.function_data.execution_id,
          error: errorMessage,
        });
      }
    },
  )
  // 拒否ボタンのハンドラー
  .addBlockActionsHandler(
    ["deny_channel_request"],
    async ({ action, body, client }) => {
      console.log("Deny button clicked");

      const reviewerId = body.user.id;
      const messageTs = body.message?.ts;
      // deno-lint-ignore no-explicit-any
      const channelId = (body as any).channel?.id ||
        body.function_data?.inputs?.approval_channel_id;

      // ボタンの value から情報を取得
      const requestData = JSON.parse(action.value || "{}");
      const channelName = requestData.channel_name;
      const requesterId = requestData.requester_id;
      const approverId = requestData.approver_id;

      // 承認者チェック: 指定された承認者のみが拒否可能
      if (approverId && reviewerId !== approverId) {
        console.log(
          `Unauthorized denial attempt: ${reviewerId} is not the designated approver ${approverId}`,
        );
        await client.chat.postEphemeral({
          channel: channelId,
          user: reviewerId,
          text: t("errors.not_authorized_approver", { approver: approverId }),
        });
        return;
      }

      // メッセージを更新
      if (messageTs && channelId) {
        await client.chat.update({
          channel: channelId,
          ts: messageTs,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: t("messages.channel_denied", {
                  channel: channelName,
                  reviewer: reviewerId,
                  requester: requesterId,
                }),
              },
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `❌ ${
                    t("messages.denied_at", { time: new Date().toISOString() })
                  }`,
                },
              ],
            },
          ],
        });
      }

      // 関数を完了
      await client.functions.completeSuccess({
        function_execution_id: body.function_data.execution_id,
        outputs: {
          approved: false,
          reviewer_id: reviewerId,
        },
      });
    },
  );
