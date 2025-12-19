import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { GetChannelInfoDefinition } from "../functions/get_channel_info/mod.ts";

const GetChannelInfoWorkflow = DefineWorkflow({
  callback_id: "get_channel_info_workflow",
  title: "チャンネル情報を取得",
  description: "チャンネル情報を取得します",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "対象チャンネルID",
      },
    },
    required: ["channel_id"],
  },
});

GetChannelInfoWorkflow.addStep(GetChannelInfoDefinition, {
  channel_id: GetChannelInfoWorkflow.inputs.channel_id,
});

export default GetChannelInfoWorkflow;
