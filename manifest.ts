import { Manifest } from "deno-slack-sdk/mod.ts";
import { GetChannelInfoDefinition } from "./functions/get_channel_info/mod.ts";
import { GetChannelMembersDefinition } from "./functions/get_channel_members/mod.ts";
import { RequestPrivateChannelDefinition } from "./functions/request_private_channel/mod.ts";
import { GetAuthorizedUsersDefinition } from "./functions/get_authorized_users/mod.ts";
import { ShowPrivateChannelFormDefinition } from "./functions/show_private_channel_form/mod.ts";
import RequestPrivateChannelWorkflow from "./workflows/request_private_channel_workflow.ts";
import GetChannelInfoWorkflow from "./workflows/get_channel_info_workflow.ts";
import GetMembersWorkflow from "./workflows/get_members_workflow.ts";
import { AuthorizedUserType } from "./lib/types/authorized_user.ts";

// Load from environment variables with fallback defaults
const APP_NAME = Deno.env.get("SLACK_APP_NAME") || "Slack Utils Template";
const APP_DESCRIPTION = Deno.env.get("SLACK_APP_DESCRIPTION") ||
  "A template for Slack workflow development";

export default Manifest({
  name: APP_NAME,
  description: APP_DESCRIPTION,
  icon: "assets/icon.png",
  types: [AuthorizedUserType],
  workflows: [
    GetChannelInfoWorkflow,
    GetMembersWorkflow,
    RequestPrivateChannelWorkflow,
  ],
  functions: [
    GetChannelInfoDefinition,
    GetChannelMembersDefinition,
    RequestPrivateChannelDefinition,
    GetAuthorizedUsersDefinition,
    ShowPrivateChannelFormDefinition,
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
