import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { GetChannelMembersDefinition } from "../functions/get_channel_members/mod.ts";

/**
 * チャンネルメンバー取得ワークフロー
 *
 * 指定したチャンネルの全メンバーIDリストを取得します。
 */
const GetMembersWorkflow = DefineWorkflow({
  callback_id: "get_members_workflow",
  title: "Get Channel Members",
  description: "Retrieve all members in a channel",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "Target channel ID",
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
  message:
    "✅ Channel members retrieved! Check the workflow output for details.",
});

export default GetMembersWorkflow;
