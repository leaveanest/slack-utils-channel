import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { z } from "zod";
import { initI18n, t } from "../../lib/i18n/mod.ts";
import {
  nonEmptyStringSchema,
  userIdSchema,
} from "../../lib/validation/schemas.ts";
import { AuthorizedUserType } from "../../lib/types/authorized_user.ts";

// i18nを初期化
await initI18n();

/**
 * 認可ユーザー情報の型定義
 */
interface AuthorizedUser {
  id: string;
  name: string;
  real_name: string;
  is_admin: boolean;
  is_owner: boolean;
  is_primary_owner: boolean;
}

/**
 * プライベートチャンネル作成リクエストフォームを表示する関数の定義
 *
 * 権限を持つユーザーのみを承認者として選択できるカスタムモーダルを表示します。
 */
export const ShowPrivateChannelFormDefinition = DefineFunction({
  callback_id: "show_private_channel_form",
  title: "Show Private Channel Request Form",
  description:
    "Display a form for private channel creation with filtered approver list",
  source_file: "functions/show_private_channel_form/mod.ts",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
        description: "Interactivity context for opening the modal",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "User ID of the requester",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "Channel where the request was made",
      },
      authorized_users: {
        type: Schema.types.array,
        items: {
          type: AuthorizedUserType,
        },
        description: "List of users authorized to approve requests",
      },
    },
    required: ["interactivity", "user_id", "channel_id", "authorized_users"],
  },
  output_parameters: {
    properties: {
      approved: {
        type: Schema.types.boolean,
        description: "Whether the request was approved",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "ID of the created channel (if approved)",
      },
      channel_name: {
        type: Schema.types.string,
        description: "Name of the created channel (if approved)",
      },
      reviewer_id: {
        type: Schema.slack.types.user_id,
        description: "ID of the user who reviewed the request",
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
 */
async function createPrivateChannelWithAdminApi(
  adminToken: string,
  channelName: string,
  teamId: string,
): Promise<{ ok: boolean; channel_id?: string; error?: string }> {
  console.log(t("logs.creating_channel_admin_api", { name: channelName }));

  const response = await fetch(
    "https://slack.com/api/admin.conversations.create",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${adminToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        name: channelName,
        is_private: true,
        team_id: teamId,
      }),
    },
  );

  const result = await response.json();

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

/**
 * 承認者選択のオプションを生成します
 */
function buildApproverOptions(authorizedUsers: AuthorizedUser[]) {
  return authorizedUsers.map((user) => {
    // 役割を表示用に追加
    const roles: string[] = [];
    if (user.is_primary_owner) roles.push("Primary Owner");
    else if (user.is_owner) roles.push("Owner");
    if (user.is_admin) roles.push("Admin");

    const roleText = roles.length > 0 ? ` (${roles.join(", ")})` : "";
    const displayName = user.real_name || user.name;

    return {
      text: {
        type: "plain_text" as const,
        text: `${displayName}${roleText}`.slice(0, 75),
        emoji: true,
      },
      value: user.id,
    };
  });
}

export default SlackFunction(
  ShowPrivateChannelFormDefinition,
  async ({ inputs, client }) => {
    try {
      const authorizedUsers = inputs.authorized_users as AuthorizedUser[];
      const channelId = inputs.channel_id as string;
      const userId = inputs.user_id as string;

      // 権限ユーザーがいない場合はエラー
      if (!authorizedUsers || authorizedUsers.length === 0) {
        throw new Error(t("errors.no_authorized_users"));
      }

      // 承認者選択のオプションを生成
      const approverOptions = buildApproverOptions(authorizedUsers);

      console.log(
        t("logs.opening_form_with_authorized_users", {
          count: authorizedUsers.length,
        }),
      );

      // カスタムモーダルを開く
      const viewResult = await client.views.open({
        interactivity_pointer: inputs.interactivity.interactivity_pointer,
        view: {
          type: "modal",
          callback_id: "private_channel_request_modal",
          title: {
            type: "plain_text",
            text: t("form.title"),
            emoji: true,
          },
          submit: {
            type: "plain_text",
            text: t("form.submit_button"),
            emoji: true,
          },
          close: {
            type: "plain_text",
            text: t("form.cancel_button"),
            emoji: true,
          },
          private_metadata: JSON.stringify({
            channel_id: channelId,
            user_id: userId,
          }),
          blocks: [
            {
              type: "input",
              block_id: "channel_name_block",
              element: {
                type: "plain_text_input",
                action_id: "channel_name_input",
                placeholder: {
                  type: "plain_text",
                  text: t("form.channel_name_placeholder"),
                },
              },
              label: {
                type: "plain_text",
                text: t("form.channel_name_label"),
                emoji: true,
              },
              hint: {
                type: "plain_text",
                text: t("form.channel_name_hint"),
              },
            },
            {
              type: "input",
              block_id: "approver_block",
              element: {
                type: "static_select",
                action_id: "approver_select",
                placeholder: {
                  type: "plain_text",
                  text: t("form.approver_placeholder"),
                },
                options: approverOptions,
              },
              label: {
                type: "plain_text",
                text: t("form.approver_label"),
                emoji: true,
              },
              hint: {
                type: "plain_text",
                text: t("form.approver_hint"),
              },
            },
            {
              type: "input",
              block_id: "description_block",
              optional: true,
              element: {
                type: "plain_text_input",
                action_id: "description_input",
                multiline: true,
                placeholder: {
                  type: "plain_text",
                  text: t("form.description_placeholder"),
                },
              },
              label: {
                type: "plain_text",
                text: t("form.description_label"),
                emoji: true,
              },
            },
            {
              type: "input",
              block_id: "initial_members_block",
              optional: true,
              element: {
                type: "multi_users_select",
                action_id: "initial_members_select",
                placeholder: {
                  type: "plain_text",
                  text: t("form.initial_members_placeholder"),
                },
              },
              label: {
                type: "plain_text",
                text: t("form.initial_members_label"),
                emoji: true,
              },
            },
          ],
        },
      });

      if (!viewResult.ok) {
        throw new Error(
          t("errors.modal_open_failed", {
            error: viewResult.error ?? t("errors.unknown_error"),
          }),
        );
      }

      console.log(t("logs.modal_opened"));

      // 関数を未完了状態で返す（モーダル送信を待つ）
      return { completed: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`;
      console.error("Function error:", message);
      return { error: message };
    }
  },
)
  // モーダル送信時のハンドラー
  .addViewSubmissionHandler(
    ["private_channel_request_modal"],
    async ({ view, body: _body, client }) => {
      console.log("=== Modal submitted ===");

      // private_metadataから情報を取得
      const metadata = JSON.parse(view.private_metadata || "{}");
      const approvalChannelId = metadata.channel_id;
      const requesterId = metadata.user_id;

      // フォーム入力値を取得
      const values = view.state.values;
      const channelName =
        values.channel_name_block?.channel_name_input?.value || "";
      const approverId =
        values.approver_block?.approver_select?.selected_option?.value || "";
      const description = values.description_block?.description_input?.value ||
        "";
      const initialMembers =
        values.initial_members_block?.initial_members_select?.selected_users ||
        [];

      console.log("Form values:", {
        channelName,
        approverId,
        description,
        initialMembersCount: initialMembers.length,
      });

      try {
        // バリデーション
        const validatedChannelName = nonEmptyStringSchema.parse(channelName);
        const validatedApproverId = userIdSchema.parse(approverId);
        const normalizedName = normalizeChannelName(validatedChannelName);

        if (normalizedName.length === 0) {
          throw new Error(
            t("errors.invalid_channel_name", { name: channelName }),
          );
        }

        // 初期メンバーのバリデーション
        if (initialMembers.length > 0) {
          const membersSchema = z.array(userIdSchema);
          membersSchema.parse(initialMembers);
        }

        // リクエスト情報をメッセージに含める
        const membersText = initialMembers.length > 0
          ? initialMembers.map((m: string) => `<@${m}>`).join(", ")
          : t("messages.no_initial_members");

        const descriptionText = description || t("messages.no_description");

        // 承認リクエストメッセージを送信
        await client.chat.postMessage({
          channel: approvalChannelId,
          text: t("messages.approval_request_title", {
            channel: normalizedName,
          }),
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
                  action_id: "approve_filtered_channel_request",
                  style: "primary",
                  value: JSON.stringify({
                    channel_name: normalizedName,
                    requester_id: requesterId,
                    approver_id: validatedApproverId,
                    description: description || "",
                    initial_members: initialMembers,
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
                  action_id: "deny_filtered_channel_request",
                  style: "danger",
                  value: JSON.stringify({
                    channel_name: normalizedName,
                    requester_id: requesterId,
                    approver_id: validatedApproverId,
                  }),
                },
              ],
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: t("messages.approval_context", {
                    approver: validatedApproverId,
                  }),
                },
              ],
            },
          ],
        });

        console.log(t("logs.approval_request_sent"));

        // モーダルを閉じる（空のレスポンスを返す）
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : `${error}`;
        console.error("View submission error:", message);

        // エラー時はモーダルにエラーを表示
        return {
          response_action: "errors" as const,
          errors: {
            channel_name_block: message,
          },
        };
      }
    },
  )
  // 承認ボタンのハンドラー
  .addBlockActionsHandler(
    ["approve_filtered_channel_request"],
    async ({ action, body, client, env }) => {
      console.log("=== Filtered approval button clicked ===");

      const reviewerId = body.user.id;
      const messageTs = body.message?.ts;
      // deno-lint-ignore no-explicit-any
      const channelId = (body as any).channel?.id;

      // ボタンの value から情報を取得
      const requestData = JSON.parse(action.value || "{}");
      const channelName = requestData.channel_name;
      const requesterId = requestData.requester_id;
      const approverId = requestData.approver_id;
      const description = requestData.description;
      const initialMembers = requestData.initial_members || [];
      const approvalChannelId = requestData.approval_channel_id;

      // 承認者チェック
      if (approverId && reviewerId !== approverId) {
        console.log(
          `Unauthorized approval attempt: ${reviewerId} is not ${approverId}`,
        );
        await client.chat.postEphemeral({
          channel: approvalChannelId,
          user: reviewerId,
          text: t("errors.not_authorized_approver", { approver: approverId }),
        });
        return;
      }

      try {
        const adminToken = env.SLACK_ADMIN_USER_TOKEN;

        if (!adminToken) {
          throw new Error(t("errors.missing_admin_token"));
        }

        const teamId = await getWorkspaceTeamId(client, approvalChannelId);

        console.log(
          t("logs.creating_channel_after_approval", { name: channelName }),
        );

        const createResult = await createPrivateChannelWithAdminApi(
          adminToken,
          channelName,
          teamId,
        );

        if (!createResult.ok) {
          throw new Error(
            t("errors.channel_create_failed", {
              error: createResult.error || t("errors.unknown_error"),
            }),
          );
        }

        const newChannelId = createResult.channel_id!;

        console.log("=== Private channel created successfully ===");
        console.log("Channel ID:", newChannelId);

        // トピック設定
        if (description && description.trim().length > 0) {
          try {
            await client.conversations.setTopic({
              channel: newChannelId,
              topic: description,
            });
          } catch (topicError) {
            console.error("Failed to set topic:", topicError);
          }
        }

        // メンバー招待（Admin API使用）
        const inviteWithAdminApi = async (
          userIds: string[],
        ): Promise<{ ok: boolean; error?: string }> => {
          if (userIds.length === 0) return { ok: true };
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
                user_ids: userIds.join(","),
              }),
            },
          );
          return await response.json();
        };

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

        console.log("Inviting members:", allMembersToInvite);
        try {
          const inviteResult = await inviteWithAdminApi(allMembersToInvite);
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
    ["deny_filtered_channel_request"],
    async ({ action, body, client }) => {
      console.log("Deny button clicked");

      const reviewerId = body.user.id;
      const messageTs = body.message?.ts;
      // deno-lint-ignore no-explicit-any
      const channelId = (body as any).channel?.id;

      const requestData = JSON.parse(action.value || "{}");
      const channelName = requestData.channel_name;
      const requesterId = requestData.requester_id;
      const approverId = requestData.approver_id;

      if (approverId && reviewerId !== approverId) {
        await client.chat.postEphemeral({
          channel: channelId,
          user: reviewerId,
          text: t("errors.not_authorized_approver", { approver: approverId }),
        });
        return;
      }

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

      await client.functions.completeSuccess({
        function_execution_id: body.function_data.execution_id,
        outputs: {
          approved: false,
          reviewer_id: reviewerId,
        },
      });
    },
  )
  // モーダルクローズ時のハンドラー
  .addViewClosedHandler(
    ["private_channel_request_modal"],
    async ({ body, client }) => {
      console.log("Modal closed by user");

      // ユーザーがモーダルを閉じた場合、関数をエラーなしで完了
      await client.functions.completeSuccess({
        function_execution_id: body.function_data.execution_id,
        outputs: {
          approved: false,
          reviewer_id: body.user.id,
        },
      });
    },
  );
