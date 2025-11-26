import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";

/**
 * プライベートチャンネル作成ワークフロー（組み込み関数使用版）
 *
 * Slack組み込みのCreateChannel関数を使用してプライベートチャンネルを作成します。
 * Run on Slack環境で確実に動作します。
 */
const CreateChannelWorkflow = DefineWorkflow({
  callback_id: "create_channel_workflow",
  title: "Create Private Channel",
  description: "Create a new private channel using built-in Slack function",
  input_parameters: {
    properties: {
      channel_name: {
        type: Schema.types.string,
        description: "Channel name (without #)",
      },
      team_id: {
        type: Schema.slack.types.team_id,
        description: "Team ID (required for Enterprise Grid, can be set via SLACK_TEAM_ID env var)",
      },
      notification_channel: {
        type: Schema.slack.types.channel_id,
        description: "Channel to send notification",
      },
    },
    required: ["channel_name", "team_id", "notification_channel"],
  },
});

// Slack組み込みのCreateChannel関数を使用してプライベートチャンネルを作成
// team_id is required for Enterprise Grid environments
CreateChannelWorkflow.addStep(
  Schema.slack.functions.CreateChannel,
  {
    channel_name: CreateChannelWorkflow.inputs.channel_name,
    team_id: CreateChannelWorkflow.inputs.team_id,
    is_private: true, // プライベートチャンネルとして作成
  },
);

// 結果をメッセージで表示
CreateChannelWorkflow.addStep(Schema.slack.functions.SendMessage, {
  channel_id: CreateChannelWorkflow.inputs.notification_channel,
  message: "✅ Private channel created successfully!",
});

export default CreateChannelWorkflow;
