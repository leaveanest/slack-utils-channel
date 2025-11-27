import { Manifest } from "deno-slack-sdk/mod.ts";
import { ExampleFunctionDefinition } from "./functions/example_function/mod.ts";
import { GetChannelMembersDefinition } from "./functions/get_channel_members/mod.ts";
import { CreatePrivateChannelDefinition } from "./functions/create_private_channel/mod.ts";
import { RequestPrivateChannelDefinition } from "./functions/request_private_channel/mod.ts";
import { FilterUsersPrivateChannelPermissionDefinition } from "./functions/filter_users_private_channel_permission/mod.ts";
import CreateChannelWorkflow from "./workflows/create_channel_workflow.ts";
import RequestPrivateChannelWorkflow from "./workflows/request_private_channel_workflow.ts";
import ExampleWorkflow from "./workflows/example_workflow.ts";
import GetMembersWorkflow from "./workflows/get_members_workflow.ts";

// Load from environment variables with fallback defaults
const APP_NAME = Deno.env.get("SLACK_APP_NAME") || "Slack Utils Template";
const APP_DESCRIPTION = Deno.env.get("SLACK_APP_DESCRIPTION") ||
  "A template for Slack workflow development";

export default Manifest({
  name: APP_NAME,
  description: APP_DESCRIPTION,
  icon: "assets/icon.png",
  workflows: [
    ExampleWorkflow,
    GetMembersWorkflow,
    CreateChannelWorkflow,
    RequestPrivateChannelWorkflow,
  ],
  functions: [
    ExampleFunctionDefinition,
    GetChannelMembersDefinition,
    CreatePrivateChannelDefinition,
    RequestPrivateChannelDefinition,
    FilterUsersPrivateChannelPermissionDefinition,
  ],
  outgoingDomains: [], // slack.com はデフォルトで許可済み
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public", // 公開チャンネルへのメッセージ送信
    "channels:read", // チャンネル情報の読み取り
    "channels:manage", // チャンネルの作成・管理
    "groups:read", // プライベートチャンネル情報の読み取り
    "groups:write", // プライベートチャンネルの作成・管理
    "users:read", // ユーザー情報の読み取り
  ],
});
