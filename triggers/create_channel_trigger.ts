import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import CreateChannelWorkflow from "../workflows/create_channel_workflow.ts";

/**
 * プライベートチャンネル作成トリガー
 *
 * リンクトリガー: URLをクリックするとフォームが表示され、
 * チャンネル名、説明、初期メンバーを入力してチャンネルを作成できます。
 */
const CreateChannelTrigger: Trigger<typeof CreateChannelWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: "Create Private Channel",
  description: "Create a new private channel with optional members",
  workflow: `#/workflows/${CreateChannelWorkflow.definition.callback_id}`,
  inputs: {
    channel_name: {
      customizable: true,
    },
    description: {
      customizable: true,
    },
    initial_members: {
      customizable: true,
    },
    notification_channel: {
      value: TriggerContextData.Shortcut.channel_id,
    },
  },
};

export default CreateChannelTrigger;
