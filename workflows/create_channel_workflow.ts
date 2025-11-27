import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { CreatePrivateChannelDefinition } from "../functions/create_private_channel/mod.ts";

/**
 * チャンネル作成ワークフロー（カスタム関数使用版）
 *
 * カスタム関数を使用してパブリック/プライベートチャンネルを作成します。
 * OpenFormを使用してユーザーからチャンネル名などを入力させます。
 * 詳細なログとエラーメッセージが出るため、デバッグが容易です。
 */
const CreateChannelWorkflow = DefineWorkflow({
  callback_id: "create_channel_workflow",
  title: "Create Channel",
  description: "Create a new channel (public or private) with detailed logging",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
        description: "Interactivity context for opening forms",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description:
          "User ID of the workflow executor (required for channel creation)",
      },
      notification_channel: {
        type: Schema.slack.types.channel_id,
        description: "Channel to send notification",
      },
    },
    required: ["interactivity", "user_id", "notification_channel"],
  },
});

// Step 1: OpenFormでユーザー入力を取得
const formStep = CreateChannelWorkflow.addStep(
  Schema.slack.functions.OpenForm,
  {
    title: "Create Channel",
    interactivity: CreateChannelWorkflow.inputs.interactivity,
    submit_label: "Create",
    fields: {
      elements: [
        {
          name: "channel_name",
          title: "Channel Name",
          type: Schema.types.string,
          description: "Name of the channel (without #)",
        },
        {
          name: "is_private",
          title: "Private Channel",
          type: Schema.types.boolean,
          description: "Create as private channel (uncheck for public)",
          default: true,
        },
        {
          name: "description",
          title: "Description",
          type: Schema.types.string,
          description: "Channel description (optional)",
        },
        {
          name: "initial_members",
          title: "Initial Members",
          type: Schema.types.array,
          items: { type: Schema.slack.types.user_id },
          description: "Users to invite to the channel (optional)",
        },
      ],
      required: ["channel_name"],
    },
  },
);

// Step 2: カスタム関数を使用してチャンネルを作成
const createStep = CreateChannelWorkflow.addStep(
  CreatePrivateChannelDefinition,
  {
    channel_name: formStep.outputs.fields.channel_name,
    creator_id: CreateChannelWorkflow.inputs.user_id,
    notification_channel_id: CreateChannelWorkflow.inputs.notification_channel,
    is_private: formStep.outputs.fields.is_private,
    description: formStep.outputs.fields.description,
    initial_members: formStep.outputs.fields.initial_members,
  },
);

// Step 3: 結果をメッセージで表示
CreateChannelWorkflow.addStep(Schema.slack.functions.SendMessage, {
  channel_id: CreateChannelWorkflow.inputs.notification_channel,
  message:
    `✅ Channel created: <#${createStep.outputs.channel_id}>\nMembers: ${createStep.outputs.member_count}`,
});

export default CreateChannelWorkflow;
