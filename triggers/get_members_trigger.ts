import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import GetMembersWorkflow from "../workflows/get_members_workflow.ts";

/**
 * チャンネルメンバー取得トリガー
 *
 * ショートカットメニューから実行できます。
 */
const GetMembersTrigger: Trigger<typeof GetMembersWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: "チャンネルメンバーを取得",
  description: "現在のチャンネルの全メンバーを取得します",
  workflow: `#/workflows/${GetMembersWorkflow.definition.callback_id}`,
  inputs: {
    channel_id: {
      value: TriggerContextData.Shortcut.channel_id,
    },
  },
};

export default GetMembersTrigger;
