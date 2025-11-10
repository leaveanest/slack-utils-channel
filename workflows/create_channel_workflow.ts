import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { CreatePrivateChannelDefinition } from "../functions/create_private_channel/mod.ts";

/**
 * プライベートチャンネル作成ワークフロー
 *
 * プライベートチャンネルを作成し、オプションで説明と初期メンバーを設定します。
 */
const CreateChannelWorkflow = DefineWorkflow({
  callback_id: "create_channel_workflow",
  title: "Create Private Channel",
  description: "Create a new private channel with optional members",
  input_parameters: {
    properties: {
      channel_name: {
        type: Schema.types.string,
        description: "Channel name (without #)",
      },
      description: {
        type: Schema.types.string,
        description: "Channel description (optional)",
      },
      initial_members: {
        type: Schema.types.array,
        items: {
          type: Schema.slack.types.user_id,
        },
        description: "Initial members to invite (optional)",
      },
      notification_channel: {
        type: Schema.slack.types.channel_id,
        description: "Channel to send notification",
      },
    },
    required: ["channel_name", "notification_channel"],
  },
});

// プライベートチャンネルを作成
const createStep = CreateChannelWorkflow.addStep(
  CreatePrivateChannelDefinition,
  {
    channel_name: CreateChannelWorkflow.inputs.channel_name,
    description: CreateChannelWorkflow.inputs.description,
    initial_members: CreateChannelWorkflow.inputs.initial_members,
  },
);

// 結果をメッセージで表示
CreateChannelWorkflow.addStep(Schema.slack.functions.SendMessage, {
  channel_id: CreateChannelWorkflow.inputs.notification_channel,
  message:
    "✅ Private channel created successfully! Check the workflow output for details.",
});

export default CreateChannelWorkflow;
