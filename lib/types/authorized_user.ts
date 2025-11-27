import { DefineType, Schema } from "deno-slack-sdk/mod.ts";

/**
 * AuthorizedUser カスタム型定義
 *
 * プライベートチャンネル作成権限を持つユーザーの情報を表すカスタム型です。
 * Slack Manifestに登録して、関数のinput/output parametersで使用します。
 */
export const AuthorizedUserType = DefineType({
  name: "authorized_user",
  type: Schema.types.object,
  properties: {
    id: {
      type: Schema.types.string,
      description: "User ID",
    },
    name: {
      type: Schema.types.string,
      description: "Username",
    },
    real_name: {
      type: Schema.types.string,
      description: "Real name",
    },
    is_admin: {
      type: Schema.types.boolean,
      description: "Whether the user is an admin",
    },
    is_owner: {
      type: Schema.types.boolean,
      description: "Whether the user is an owner",
    },
    is_primary_owner: {
      type: Schema.types.boolean,
      description: "Whether the user is the primary owner",
    },
  },
  required: ["id", "name", "real_name", "is_admin", "is_owner"],
});
