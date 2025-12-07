import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { ExampleFunctionDefinition } from "../functions/example_function/mod.ts";

// Load category from environment variable
const CATEGORY = Deno.env.get("SLACK_CATEGORY") || "チャンネル";

const ExampleWorkflow = DefineWorkflow({
  callback_id: "example_workflow",
  title: `${CATEGORY}エクスプローラー`,
  description: `${CATEGORY}情報を探索します`,
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: `対象${CATEGORY}ID`,
      },
    },
    required: ["channel_id"],
  },
});

ExampleWorkflow.addStep(ExampleFunctionDefinition, {
  channel_id: ExampleWorkflow.inputs.channel_id,
});

export default ExampleWorkflow;
