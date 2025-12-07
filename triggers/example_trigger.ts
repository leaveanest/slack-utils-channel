import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import ExampleWorkflow from "../workflows/example_workflow.ts";

// Load category from environment variable
const CATEGORY = Deno.env.get("SLACK_CATEGORY") || "チャンネル";

const ExampleTrigger: Trigger<typeof ExampleWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: `${CATEGORY}情報を検索`,
  description: `${CATEGORY}情報を取得します`,
  workflow: `#/workflows/${ExampleWorkflow.definition.callback_id}`,
  inputs: {
    channel_id: {
      value: TriggerContextData.Shortcut.channel_id,
    },
  },
};

export default ExampleTrigger;
