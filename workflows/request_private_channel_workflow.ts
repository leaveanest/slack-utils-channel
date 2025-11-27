import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { RequestPrivateChannelDefinition } from "../functions/request_private_channel/mod.ts";

/**
 * プライベートチャンネル作成リクエストワークフロー
 *
 * 管理者の承認を経てプライベートチャンネルを作成します。
 * Admin API を使用するため、ワークスペースの権限設定に関係なく
 * プライベートチャンネルを作成できます。
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

// Step 1: OpenFormでユーザー入力を取得
const formStep = RequestPrivateChannelWorkflow.addStep(
  Schema.slack.functions.OpenForm,
  {
    title: "Request Private Channel",
    interactivity: RequestPrivateChannelWorkflow.inputs.interactivity,
    submit_label: "Request",
    fields: {
      elements: [
        {
          name: "channel_name",
          title: "Channel Name",
          type: Schema.types.string,
          description: "Name of the private channel (without #)",
        },
        {
          name: "approver_id",
          title: "Approver",
          type: Schema.slack.types.user_id,
          description: "Administrator who will approve this request",
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
      required: ["channel_name", "approver_id"],
    },
  },
);

// Step 2: 承認リクエスト関数を呼び出し
RequestPrivateChannelWorkflow.addStep(
  RequestPrivateChannelDefinition,
  {
    channel_name: formStep.outputs.fields.channel_name,
    requester_id: RequestPrivateChannelWorkflow.inputs.user_id,
    approver_id: formStep.outputs.fields.approver_id,
    approval_channel_id: RequestPrivateChannelWorkflow.inputs.channel_id,
    description: formStep.outputs.fields.description,
    initial_members: formStep.outputs.fields.initial_members,
  },
);

export default RequestPrivateChannelWorkflow;
