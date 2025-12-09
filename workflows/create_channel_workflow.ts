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
  title: "チャンネルを作成",
  description: "新しいチャンネル（パブリックまたはプライベート）を作成します",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
        description: "フォームを開くためのインタラクティブコンテキスト",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "ワークフロー実行者のユーザーID（チャンネル作成に必要）",
      },
      notification_channel: {
        type: Schema.slack.types.channel_id,
        description: "通知を送信するチャンネル",
      },
    },
    required: ["interactivity", "user_id", "notification_channel"],
  },
});

// Step 1: OpenFormでユーザー入力を取得
const formStep = CreateChannelWorkflow.addStep(
  Schema.slack.functions.OpenForm,
  {
    title: "チャンネルを作成",
    interactivity: CreateChannelWorkflow.inputs.interactivity,
    submit_label: "作成",
    fields: {
      elements: [
        {
          name: "channel_name",
          title: "チャンネル名",
          type: Schema.types.string,
          description: "チャンネル名（#なし）",
        },
        {
          name: "is_private",
          title: "プライベートチャンネル",
          type: Schema.types.boolean,
          description:
            "プライベートチャンネルとして作成（パブリックの場合はチェックを外す）",
          default: true,
        },
        {
          name: "description",
          title: "説明",
          type: Schema.types.string,
          description: "チャンネルの説明（任意）",
        },
        {
          name: "initial_members",
          title: "初期メンバー",
          type: Schema.types.array,
          items: { type: Schema.slack.types.user_id },
          description: "チャンネルに招待するユーザー（任意）",
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
    `✅ チャンネルを作成しました: <#${createStep.outputs.channel_id}>\nメンバー数: ${createStep.outputs.member_count}`,
});

export default CreateChannelWorkflow;
