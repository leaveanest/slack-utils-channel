import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { GetChannelMembersDefinition } from "../functions/get_channel_members/mod.ts";

/**
 * チャンネルメンバー取得ワークフロー
 *
 * 指定したチャンネルの全メンバーIDリストを取得します。
 */
const GetMembersWorkflow = DefineWorkflow({
  callback_id: "get_members_workflow",
  title: "チャンネルメンバーを取得",
  description: "チャンネルの全メンバーを取得します",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "対象チャンネルID",
      },
    },
    required: ["channel_id"],
  },
});

// チャンネルメンバーを取得
GetMembersWorkflow.addStep(
  GetChannelMembersDefinition,
  {
    channel_id: GetMembersWorkflow.inputs.channel_id,
  },
);

// 結果をメッセージで表示
GetMembersWorkflow.addStep(Schema.slack.functions.SendMessage, {
  channel_id: GetMembersWorkflow.inputs.channel_id,
  message: "✅ チャンネルメンバーを取得しました！詳細はワークフロー出力を確認してください。",
});

export default GetMembersWorkflow;
