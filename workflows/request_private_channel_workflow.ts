import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { GetAuthorizedUsersDefinition } from "../functions/get_authorized_users/mod.ts";
import { ShowPrivateChannelFormDefinition } from "../functions/show_private_channel_form/mod.ts";

/**
 * プライベートチャンネル作成リクエストワークフロー
 *
 * 管理者の承認を経てプライベートチャンネルを作成します。
 * Admin API を使用するため、ワークスペースの権限設定に関係なく
 * プライベートチャンネルを作成できます。
 *
 * 承認者選択はプライベートチャンネル作成権限を持つユーザー
 * （管理者/オーナー）のみに制限されます。
 */
const RequestPrivateChannelWorkflow = DefineWorkflow({
  callback_id: "request_private_channel_workflow",
  title: "Request Private Channel",
  description:
    "Request approval for private channel creation from an administrator",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
        description: "Interactivity context for opening forms",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "User ID of the requester",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "Channel where the request was made",
      },
    },
    required: ["interactivity", "user_id", "channel_id"],
  },
});

// Step 1: 権限を持つユーザー（管理者/オーナー）を取得
// interactivityを入力として渡し、出力としてStep 2に引き継ぐ
const getAuthorizedUsersStep = RequestPrivateChannelWorkflow.addStep(
  GetAuthorizedUsersDefinition,
  {
    interactivity: RequestPrivateChannelWorkflow.inputs.interactivity,
    channel_id: RequestPrivateChannelWorkflow.inputs.channel_id,
  },
);

// Step 2: フィルタリングされた承認者リストを使用してフォームを表示
// interactivityはStep 1の出力から取得
RequestPrivateChannelWorkflow.addStep(
  ShowPrivateChannelFormDefinition,
  {
    interactivity: getAuthorizedUsersStep.outputs.interactivity,
    user_id: RequestPrivateChannelWorkflow.inputs.user_id,
    channel_id: RequestPrivateChannelWorkflow.inputs.channel_id,
    authorized_users: getAuthorizedUsersStep.outputs.authorized_users,
  },
);

export default RequestPrivateChannelWorkflow;
