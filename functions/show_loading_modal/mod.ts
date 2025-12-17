import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { initI18n, t } from "../../lib/i18n/mod.ts";

// i18nを初期化
await initI18n();

/**
 * ローディングモーダルを表示する関数の定義
 *
 * インタラクティブトークンが期限切れになる前に、即座にモーダルを表示します。
 * その後、views.updateで本来のフォームに更新することで、
 * 処理時間が長くてもモーダルを表示できます。
 */
export const ShowLoadingModalDefinition = DefineFunction({
  callback_id: "show_loading_modal",
  title: "ローディングモーダル表示",
  description: "処理中であることを示すローディングモーダルを表示します",
  source_file: "functions/show_loading_modal/mod.ts",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
        description: "インタラクティブコンテキスト",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "リクエストを行ったユーザーのID",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "リクエストが行われたチャンネルのID",
      },
    },
    required: ["interactivity", "user_id", "channel_id"],
  },
  output_parameters: {
    properties: {
      view_id: {
        type: Schema.types.string,
        description: "表示されたモーダルのview_id（後続でupdateに使用）",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "リクエストを行ったユーザーのID（パススルー）",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "リクエストが行われたチャンネルのID（パススルー）",
      },
    },
    required: ["view_id", "user_id", "channel_id"],
  },
});

export default SlackFunction(
  ShowLoadingModalDefinition,
  async ({ inputs, client }) => {
    try {
      console.log("Opening loading modal...");

      // ローディングモーダルを即座に表示
      const response = await client.views.open({
        interactivity_pointer: inputs.interactivity.interactivity_pointer,
        view: {
          type: "modal",
          callback_id: "loading_modal",
          notify_on_close: false,
          title: {
            type: "plain_text",
            text: t("form.loading_title"),
          },
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: t("form.loading_message"),
              },
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: t("form.loading_hint"),
                },
              ],
            },
          ],
        },
      });

      if (!response.ok) {
        console.error("Failed to open loading modal:", response.error);
        throw new Error(
          t("errors.modal_open_failed", {
            error: response.error ?? t("errors.unknown_error"),
          }),
        );
      }

      const viewId = response.view?.id;
      if (!viewId) {
        throw new Error(t("errors.view_id_not_found"));
      }

      console.log("Loading modal opened successfully:", { viewId });

      return {
        outputs: {
          view_id: viewId,
          user_id: inputs.user_id,
          channel_id: inputs.channel_id,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`;
      console.error("Function error:", message);
      return { error: message };
    }
  },
);
