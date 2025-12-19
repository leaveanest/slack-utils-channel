import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import GetChannelInfoWorkflow from "../workflows/get_channel_info_workflow.ts";

/**
 * チャンネル情報取得トリガー
 *
 * ショートカットトリガー: 実行するとチャンネル情報を取得します。
 */
const GetChannelInfoTrigger: Trigger<
  typeof GetChannelInfoWorkflow.definition
> = {
  type: TriggerTypes.Shortcut,
  name: "チャンネル情報を検索",
  description: "チャンネル情報を取得します",
  workflow: `#/workflows/${GetChannelInfoWorkflow.definition.callback_id}`,
  inputs: {
    channel_id: {
      value: TriggerContextData.Shortcut.channel_id,
    },
  },
};

export default GetChannelInfoTrigger;
