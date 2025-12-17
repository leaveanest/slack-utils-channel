import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { ShowLoadingModalDefinition } from "../functions/show_loading_modal/mod.ts";
import { CheckPrivateChannelPermissionsDefinition } from "../functions/check_private_channel_permissions/mod.ts";
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
 *
 * 処理の流れ:
 * 1. ローディングモーダルを即座に表示（interactivityタイムアウト対策）
 * 2. バックグラウンドで権限確認・ユーザー取得
 * 3. モーダルを本来のフォームに更新
 */
const RequestPrivateChannelWorkflow = DefineWorkflow({
  callback_id: "request_private_channel_workflow",
  title: "プライベートチャンネルをリクエスト",
  description: "管理者にプライベートチャンネルの作成承認をリクエストします",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
        description: "フォームを開くためのインタラクティブコンテキスト",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "リクエスト者のユーザーID",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "リクエストが行われたチャンネル",
      },
    },
    required: ["interactivity", "user_id", "channel_id"],
  },
});

// Step 1: ローディングモーダルを即座に表示
// interactivityトークンが期限切れになる前にモーダルを開く
const showLoadingStep = RequestPrivateChannelWorkflow.addStep(
  ShowLoadingModalDefinition,
  {
    interactivity: RequestPrivateChannelWorkflow.inputs.interactivity,
    user_id: RequestPrivateChannelWorkflow.inputs.user_id,
    channel_id: RequestPrivateChannelWorkflow.inputs.channel_id,
  },
);

// Step 2: プライベートチャンネル作成権限を確認
// ワークスペースで誰がプライベートチャンネルを作成できるかを確認
const checkPermissionsStep = RequestPrivateChannelWorkflow.addStep(
  CheckPrivateChannelPermissionsDefinition,
  {
    channel_id: RequestPrivateChannelWorkflow.inputs.channel_id,
  },
);

// Step 3: 権限を持つユーザー（管理者/オーナー）を取得
const getAuthorizedUsersStep = RequestPrivateChannelWorkflow.addStep(
  GetAuthorizedUsersDefinition,
  {
    channel_id: RequestPrivateChannelWorkflow.inputs.channel_id,
  },
);

// Step 4: ローディングモーダルを本来のフォームに更新
// view_idを使ってviews.updateでモーダルを更新
RequestPrivateChannelWorkflow.addStep(
  ShowPrivateChannelFormDefinition,
  {
    view_id: showLoadingStep.outputs.view_id,
    user_id: showLoadingStep.outputs.user_id,
    channel_id: showLoadingStep.outputs.channel_id,
    authorized_users: getAuthorizedUsersStep.outputs.authorized_users,
    is_everyone_allowed: checkPermissionsStep.outputs.is_everyone_allowed,
  },
);

export default RequestPrivateChannelWorkflow;
