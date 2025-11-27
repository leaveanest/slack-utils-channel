import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import RequestPrivateChannelWorkflow from "../workflows/request_private_channel_workflow.ts";

/**
 * プライベートチャンネル作成リクエストトリガー
 *
 * ショートカットから起動し、管理者の承認を経て
 * プライベートチャンネルを作成します。
 */
const RequestPrivateChannelTrigger: Trigger<
  typeof RequestPrivateChannelWorkflow.definition
> = {
  type: TriggerTypes.Shortcut,
  name: "Request Private Channel",
  description:
    "Request approval for private channel creation from an administrator",
  workflow:
    `#/workflows/${RequestPrivateChannelWorkflow.definition.callback_id}`,
  inputs: {
    interactivity: {
      value: TriggerContextData.Shortcut.interactivity,
    },
    user_id: {
      value: TriggerContextData.Shortcut.user_id,
    },
    channel_id: {
      value: TriggerContextData.Shortcut.channel_id,
    },
  },
};

export default RequestPrivateChannelTrigger;
