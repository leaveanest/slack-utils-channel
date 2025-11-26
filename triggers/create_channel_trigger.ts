import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import CreateChannelWorkflow from "../workflows/create_channel_workflow.ts";

/**
 * プライベートチャンネル作成トリガー（組み込み関数使用版）
 *
 * ショートカットトリガー: 実行するとフォームが表示され、
 * チャンネル名を入力してプライベートチャンネルを作成できます。
 */
const CreateChannelTrigger: Trigger<typeof CreateChannelWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: "Create Private Channel",
  description: "Create a new private channel using built-in Slack function",
  workflow: `#/workflows/${CreateChannelWorkflow.definition.callback_id}`,
  inputs: {
    channel_name: {
      customizable: true,
    },
    team_id: {
      value: TriggerContextData.Shortcut.team_id,
    },
    notification_channel: {
      value: TriggerContextData.Shortcut.channel_id,
    },
  },
};

export default CreateChannelTrigger;
