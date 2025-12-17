import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { z } from "zod";
import { initI18n, t } from "../../lib/i18n/mod.ts";
import { AuthorizedUserType } from "../../lib/types/authorized_user.ts";
import {
  nonEmptyStringSchema,
  userIdSchema,
} from "../../lib/validation/schemas.ts";

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
 * 複数の承認者を選択可能で、いずれかの承認者が承認できます。
 */
export const ShowPrivateChannelFormDefinition = DefineFunction({
  callback_id: "show_private_channel_form",
  title: "プライベートチャンネル申請フォーム表示",
  description:
    "承認者を選択してプライベートチャンネルを申請するフォームを表示します",
  source_file: "functions/show_private_channel_form/mod.ts",
  input_parameters: {
    properties: {
      view_id: {
        type: Schema.types.string,
        description:
          "更新対象のモーダルview_id（ローディングモーダルから渡される）",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "申請者のユーザーID",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "リクエストが行われたチャンネル",
      },
      authorized_users: {
        type: Schema.types.array,
        items: {
          type: AuthorizedUserType,
        },
        description: "承認権限を持つユーザー一覧",
      },
      is_everyone_allowed: {
        type: Schema.types.boolean,
        description: "全員がプライベートチャンネルを作成可能かどうか",
      },
    },
    required: [
      "view_id",
      "user_id",
      "channel_id",
      "authorized_users",
      "is_everyone_allowed",
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
 */
async function createPrivateChannelWithAdminApi(
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
 * チャンネルのメンバーを取得します
 */
async function getChannelMembers(
  // deno-lint-ignore no-explicit-any
  client: any,
  channelId: string,
): Promise<string[]> {
  try {
    const response = await client.conversations.members({ channel: channelId });
    if (!response.ok) {
      console.error("Failed to get channel members:", response.error);
      return [];
    }
    return response.members || [];
  } catch (error) {
    console.error("Error getting channel members:", error);
    return [];
  }
}

/**
 * ユーザーをチャンネルに招待します
 */
async function inviteUserToChannel(
  // deno-lint-ignore no-explicit-any
  client: any,
  channelId: string,
  userId: string,
): Promise<boolean> {
  try {
    const response = await client.conversations.invite({
      channel: channelId,
      users: userId,
    });
    return response.ok;
  } catch (error) {
    console.error(`Failed to invite user ${userId} to channel:`, error);
    return false;
  }
}

/**
 * Admin API を使用してメンバーを招待します
 */
async function inviteMembersWithAdminApi(
  adminToken: string,
  channelId: string,
  userIds: string[],
): Promise<{ ok: boolean; error?: string }> {
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
        channel_id: channelId,
        user_ids: userIds.join(","),
      }),
    },
  );
  return await response.json();
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

/**
 * 承認リクエストのブロックを生成します
 */
function buildApprovalRequestBlocks(
  normalizedName: string,
  requesterId: string,
  descriptionText: string,
  membersText: string,
  approverIds: string[],
  buttonValue: string,
) {
  const approverMentions = approverIds.map((id) => `<@${id}>`).join(", ");

  return [
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
          value: buttonValue,
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
          value: buttonValue,
        },
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: t("messages.approval_context_multiple", {
            approvers: approverMentions,
          }),
        },
      ],
    },
  ];
}

/**
 * 承認済みメッセージのブロックを生成します
 */
function buildApprovedBlocks(
  channelName: string,
  newChannelId: string,
  reviewerId: string,
  requesterId: string,
) {
  return [
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
  ];
}

/**
 * 拒否済みメッセージのブロックを生成します
 */
function buildDeniedBlocks(
  channelName: string,
  reviewerId: string,
  requesterId: string,
) {
  return [
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
  ];
}

export default SlackFunction(
  ShowPrivateChannelFormDefinition,
  async ({ inputs, client }) => {
    try {
      const authorizedUsers = inputs.authorized_users as AuthorizedUser[];
      const channelId = inputs.channel_id as string;
      const userId = inputs.user_id as string;
      const isEveryoneAllowed = inputs.is_everyone_allowed as boolean;
      const viewId = inputs.view_id as string;

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

      // ローディングモーダルを本来のフォームに更新
      const viewResult = await client.views.update({
        view_id: viewId,
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
            is_everyone_allowed: isEveryoneAllowed,
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
                type: "multi_static_select",
                action_id: "approver_select",
                placeholder: {
                  type: "plain_text",
                  text: t("form.approver_placeholder_multiple"),
                },
                options: approverOptions,
              },
              label: {
                type: "plain_text",
                text: t("form.approver_label_multiple"),
                emoji: true,
              },
              hint: {
                type: "plain_text",
                text: t("form.approver_hint_multiple"),
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
          t("errors.modal_update_failed", {
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
    async ({ view, body: _body, client, env }) => {
      console.log("=== Modal submitted ===");

      // private_metadataから情報を取得
      const metadata = JSON.parse(view.private_metadata || "{}");
      const approvalChannelId = metadata.channel_id;
      const requesterId = metadata.user_id;
      const isEveryoneAllowed = metadata.is_everyone_allowed === true;

      // フォーム入力値を取得
      const values = view.state.values;
      const channelName =
        values.channel_name_block?.channel_name_input?.value || "";
      // 複数選択の承認者を取得
      const selectedApprovers =
        values.approver_block?.approver_select?.selected_options || [];
      const approverIds = selectedApprovers.map(
        (opt: { value: string }) => opt.value,
      );
      const description = values.description_block?.description_input?.value ||
        "";
      const initialMembers =
        values.initial_members_block?.initial_members_select?.selected_users ||
        [];

      console.log("Form values:", {
        channelName,
        approverIds,
        description,
        initialMembersCount: initialMembers.length,
        isEveryoneAllowed,
      });

      try {
        // バリデーション
        const validatedChannelName = nonEmptyStringSchema.parse(channelName);
        const normalizedName = normalizeChannelName(validatedChannelName);

        if (normalizedName.length === 0) {
          throw new Error(
            t("errors.invalid_channel_name", { name: channelName }),
          );
        }

        // 承認者のバリデーション
        if (approverIds.length === 0) {
          throw new Error(t("errors.no_approver_selected"));
        }
        const membersSchema = z.array(userIdSchema);
        membersSchema.parse(approverIds);

        // 初期メンバーのバリデーション
        if (initialMembers.length > 0) {
          membersSchema.parse(initialMembers);
        }

        // リクエスト情報をメッセージに含める
        const membersText = initialMembers.length > 0
          ? initialMembers.map((m: string) => `<@${m}>`).join(", ")
          : t("messages.no_initial_members");

        const descriptionText = description || t("messages.no_description");

        // 全員がプライベートチャンネルを作成可能な場合は、承認なしで直接作成
        if (isEveryoneAllowed) {
          console.log(
            "Everyone is allowed to create private channels - creating directly",
          );

          const adminToken = env.SLACK_ADMIN_USER_TOKEN;
          if (!adminToken) {
            throw new Error(t("errors.missing_admin_token"));
          }

          const teamId = await getWorkspaceTeamId(client, approvalChannelId);

          console.log(
            t("logs.creating_channel_admin_api", { name: normalizedName }),
          );

          // Admin API でプライベートチャンネルを作成
          const createResult = await createPrivateChannelWithAdminApi(
            adminToken,
            normalizedName,
            teamId,
            description,
          );

          if (!createResult.ok) {
            throw new Error(
              t("errors.channel_create_failed", {
                error: createResult.error || t("errors.unknown_error"),
              }),
            );
          }

          const newChannelId = createResult.channel_id!;
          console.log(t("logs.channel_created_private", { id: newChannelId }));

          // メンバー招待（Admin API使用）
          const allMembersToInvite = [requesterId];
          // 選択された承認者をチャンネルに参加させる（承認不要でも必ず参加）
          for (const approverId of approverIds) {
            if (!allMembersToInvite.includes(approverId)) {
              allMembersToInvite.push(approverId);
            }
          }
          for (const member of initialMembers) {
            if (!allMembersToInvite.includes(member)) {
              allMembersToInvite.push(member);
            }
          }

          console.log(
            t("logs.inviting_members", { count: allMembersToInvite.length }),
          );
          try {
            const inviteResult = await inviteMembersWithAdminApi(
              adminToken,
              newChannelId,
              allMembersToInvite,
            );
            if (!inviteResult.ok) {
              console.error("Failed to invite members:", inviteResult.error);
            }
          } catch (inviteError) {
            console.error("Failed to invite members:", inviteError);
          }

          // 作成完了メッセージを送信（複数承認者対応）
          const participantMentions = approverIds.map((id: string) =>
            `<@${id}>`
          ).join(", ");
          await client.chat.postMessage({
            channel: approvalChannelId,
            text: t("messages.channel_created_directly", {
              channel: normalizedName,
            }),
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: t("messages.channel_created_directly_details", {
                    channel: normalizedName,
                    channel_id: newChannelId,
                    requester: requesterId,
                    participant: participantMentions,
                  }),
                },
              },
              {
                type: "context",
                elements: [
                  {
                    type: "mrkdwn",
                    text: `${
                      t("messages.created_at", {
                        time: new Date().toISOString(),
                      })
                    }`,
                  },
                ],
              },
            ],
          });

          // モーダルを閉じる
          return;
        }

        // ボタンのvalueに含めるデータ
        const buttonValue = JSON.stringify({
          channel_name: normalizedName,
          requester_id: requesterId,
          approver_ids: approverIds,
          description: description || "",
          initial_members: initialMembers,
          approval_channel_id: approvalChannelId,
          dm_messages: [] as { user_id: string; ts: string }[],
          channel_message_ts: "",
        });

        // 承認者がチャンネルに参加しているか確認し、未参加なら招待
        const channelMembers = await getChannelMembers(
          client,
          approvalChannelId,
        );
        for (const approverId of approverIds) {
          if (!channelMembers.includes(approverId)) {
            console.log(
              `Approver ${approverId} is not in channel, inviting...`,
            );
            await inviteUserToChannel(client, approvalChannelId, approverId);
          }
        }

        // 承認リクエストメッセージをチャンネルに送信
        const channelMessageResult = await client.chat.postMessage({
          channel: approvalChannelId,
          text: t("messages.approval_request_title", {
            channel: normalizedName,
          }),
          blocks: buildApprovalRequestBlocks(
            normalizedName,
            requesterId,
            descriptionText,
            membersText,
            approverIds,
            buttonValue,
          ),
        });

        const channelMessageTs = channelMessageResult.ts;

        // DMメッセージの情報を保存
        const dmMessages: {
          channel_id: string;
          user_id: string;
          ts: string;
        }[] = [];

        // 各承認者にDMを送信
        for (const approverId of approverIds) {
          try {
            // DMチャンネルを開く
            const dmOpenResult = await client.conversations.open({
              users: approverId,
            });

            if (!dmOpenResult.ok || !dmOpenResult.channel?.id) {
              console.error(
                `Failed to open DM channel for ${approverId}:`,
                dmOpenResult.error,
              );
              continue;
            }

            const dmChannelId = dmOpenResult.channel.id;

            const dmResult = await client.chat.postMessage({
              channel: dmChannelId,
              text: t("messages.dm_approval_request_title", {
                channel: normalizedName,
                requester: requesterId,
              }),
              blocks: buildApprovalRequestBlocks(
                normalizedName,
                requesterId,
                descriptionText,
                membersText,
                approverIds,
                JSON.stringify({
                  channel_name: normalizedName,
                  requester_id: requesterId,
                  approver_ids: approverIds,
                  description: description || "",
                  initial_members: initialMembers,
                  approval_channel_id: approvalChannelId,
                  channel_message_ts: channelMessageTs,
                  dm_messages: [], // Will be updated later
                }),
              ),
            });

            if (dmResult.ok && dmResult.ts) {
              dmMessages.push({
                channel_id: dmChannelId,
                user_id: approverId,
                ts: dmResult.ts,
              });
            }
          } catch (dmError) {
            console.error(`Failed to send DM to ${approverId}:`, dmError);
          }
        }

        // チャンネルメッセージを更新して、DMメッセージ情報を含める
        const updatedButtonValue = JSON.stringify({
          channel_name: normalizedName,
          requester_id: requesterId,
          approver_ids: approverIds,
          description: description || "",
          initial_members: initialMembers,
          approval_channel_id: approvalChannelId,
          channel_message_ts: channelMessageTs,
          dm_messages: dmMessages,
        });

        await client.chat.update({
          channel: approvalChannelId,
          ts: channelMessageTs,
          blocks: buildApprovalRequestBlocks(
            normalizedName,
            requesterId,
            descriptionText,
            membersText,
            approverIds,
            updatedButtonValue,
          ),
        });

        // 各DMメッセージも更新
        for (const dm of dmMessages) {
          try {
            await client.chat.update({
              channel: dm.channel_id,
              ts: dm.ts,
              blocks: buildApprovalRequestBlocks(
                normalizedName,
                requesterId,
                descriptionText,
                membersText,
                approverIds,
                updatedButtonValue,
              ),
            });
          } catch (updateError) {
            console.error(
              `Failed to update DM for ${dm.user_id}:`,
              updateError,
            );
          }
        }

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
      const currentChannelId = (body as any).channel?.id;

      // ボタンの value から情報を取得
      const requestData = JSON.parse(action.value || "{}");
      const channelName = requestData.channel_name;
      const requesterId = requestData.requester_id;
      const approverIds: string[] = requestData.approver_ids || [];
      const description = requestData.description;
      const initialMembers = requestData.initial_members || [];
      const approvalChannelId = requestData.approval_channel_id;
      const channelMessageTs = requestData.channel_message_ts;
      const dmMessages: { channel_id: string; user_id: string; ts: string }[] =
        requestData.dm_messages || [];

      // 承認者チェック: 選択された承認者のいずれかであること
      if (approverIds.length > 0 && !approverIds.includes(reviewerId)) {
        console.log(
          `Unauthorized approval attempt: ${reviewerId} is not in approvers list`,
        );
        const approverMentions = approverIds.map((id: string) => `<@${id}>`)
          .join(", ");
        await client.chat.postEphemeral({
          channel: currentChannelId,
          user: reviewerId,
          text: t("errors.not_authorized_approver_multiple", {
            approvers: approverMentions,
          }),
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

        // Admin API でプライベートチャンネルを作成（説明も同時に設定）
        const createResult = await createPrivateChannelWithAdminApi(
          adminToken,
          channelName,
          teamId,
          description,
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
        // 全ての承認者をチャンネルに追加
        for (const approverId of approverIds) {
          if (!allMembersToInvite.includes(approverId)) {
            allMembersToInvite.push(approverId);
          }
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

        // 承認済みブロックを生成
        const approvedBlocks = buildApprovedBlocks(
          channelName,
          newChannelId,
          reviewerId,
          requesterId,
        );

        // チャンネルメッセージを更新
        if (channelMessageTs) {
          try {
            await client.chat.update({
              channel: approvalChannelId,
              ts: channelMessageTs,
              blocks: approvedBlocks,
            });
          } catch (updateError) {
            console.error("Failed to update channel message:", updateError);
          }
        } else if (messageTs && currentChannelId) {
          // フォールバック: 現在のメッセージを更新
          await client.chat.update({
            channel: currentChannelId,
            ts: messageTs,
            blocks: approvedBlocks,
          });
        }

        // 全てのDMメッセージを更新（close）
        for (const dm of dmMessages) {
          try {
            await client.chat.update({
              channel: dm.channel_id,
              ts: dm.ts,
              blocks: approvedBlocks,
            });
          } catch (updateError) {
            console.error(
              `Failed to update DM for ${dm.user_id}:`,
              updateError,
            );
          }
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

        if (messageTs && currentChannelId) {
          await client.chat.update({
            channel: currentChannelId,
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
      const currentChannelId = (body as any).channel?.id;

      const requestData = JSON.parse(action.value || "{}");
      const channelName = requestData.channel_name;
      const requesterId = requestData.requester_id;
      const approverIds: string[] = requestData.approver_ids || [];
      const approvalChannelId = requestData.approval_channel_id;
      const channelMessageTs = requestData.channel_message_ts;
      const dmMessages: { channel_id: string; user_id: string; ts: string }[] =
        requestData.dm_messages || [];

      // 承認者チェック
      if (approverIds.length > 0 && !approverIds.includes(reviewerId)) {
        const approverMentions = approverIds.map((id: string) => `<@${id}>`)
          .join(", ");
        await client.chat.postEphemeral({
          channel: currentChannelId,
          user: reviewerId,
          text: t("errors.not_authorized_approver_multiple", {
            approvers: approverMentions,
          }),
        });
        return;
      }

      // 拒否済みブロックを生成
      const deniedBlocks = buildDeniedBlocks(
        channelName,
        reviewerId,
        requesterId,
      );

      // チャンネルメッセージを更新
      if (channelMessageTs) {
        try {
          await client.chat.update({
            channel: approvalChannelId,
            ts: channelMessageTs,
            blocks: deniedBlocks,
          });
        } catch (updateError) {
          console.error("Failed to update channel message:", updateError);
        }
      } else if (messageTs && currentChannelId) {
        await client.chat.update({
          channel: currentChannelId,
          ts: messageTs,
          blocks: deniedBlocks,
        });
      }

      // 全てのDMメッセージを更新（close）
      for (const dm of dmMessages) {
        try {
          await client.chat.update({
            channel: dm.channel_id,
            ts: dm.ts,
            blocks: deniedBlocks,
          });
        } catch (updateError) {
          console.error(`Failed to update DM for ${dm.user_id}:`, updateError);
        }
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
