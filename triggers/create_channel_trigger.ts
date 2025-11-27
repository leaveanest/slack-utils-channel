import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import CreateChannelWorkflow from "../workflows/create_channel_workflow.ts";

/**
 * チャンネル作成トリガー（カスタム関数使用版）
 *
 * ショートカットトリガー: 実行するとOpenFormが表示され、
 * チャンネル名を入力してパブリック/プライベートチャンネルを作成できます。
 *
 * カスタム関数により詳細なログとエラーメッセージが出力されます。
 */

const CreateChannelTrigger: Trigger<typeof CreateChannelWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: "Create Channel",
  description: "Create a new channel (public or private) with detailed logging",
  workflow: `#/workflows/${CreateChannelWorkflow.definition.callback_id}`,
  inputs: {
    interactivity: {
      value: TriggerContextData.Shortcut.interactivity,
    },
    user_id: {
      value: TriggerContextData.Shortcut.user_id,
    },
    notification_channel: {
      value: TriggerContextData.Shortcut.channel_id,
    },
  },
};

export default CreateChannelTrigger;
