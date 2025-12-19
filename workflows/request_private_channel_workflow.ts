import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
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
 * 4. モーダル送信を処理
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

// 1つの関数でローディングモーダル表示→情報取得→フォーム更新→送信処理を行う
// これにより、モーダルを開いた関数がモーダル送信イベントを正しく受け取れる
RequestPrivateChannelWorkflow.addStep(
  ShowPrivateChannelFormDefinition,
  {
    interactivity: RequestPrivateChannelWorkflow.inputs.interactivity,
    user_id: RequestPrivateChannelWorkflow.inputs.user_id,
    channel_id: RequestPrivateChannelWorkflow.inputs.channel_id,
  },
);

export default RequestPrivateChannelWorkflow;
