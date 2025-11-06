/**
 * 共通バリデーションスキーマ
 * Zodを使用した型安全なバリデーション
 * i18n対応のエラーメッセージをサポート
 */
import { z } from "zod";
import { initI18n, t } from "../i18n/mod.ts";

// トップレベルawaitでi18nを初期化
await initI18n();

/**
 * i18n対応のSlackチャンネル ID スキーマを生成
 * 形式: C + 英数字大文字
 *
 * エラーメッセージは検証時に動的に評価されるため、
 * ロケール変更に対応します。
 *
 * @returns Zodスキーマ
 *
 * @example
 * ```typescript
 * const schema = createChannelIdSchema();
 * const channelId = schema.parse("C12345678");
 * ```
 */
export function createChannelIdSchema() {
  return z.string().superRefine((val, ctx) => {
    if (val.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 1,
        type: "string",
        inclusive: true,
        message: t("errors.validation.channel_id_empty"),
      });
      return;
    }
    if (!/^C[A-Z0-9]+$/.test(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_string,
        validation: "regex",
        message: t("errors.validation.channel_id_format"),
      });
    }
  });
}

/**
 * i18n対応のSlack ユーザー ID スキーマを生成
 * 形式: U または W + 英数字大文字
 *
 * エラーメッセージは検証時に動的に評価されるため、
 * ロケール変更に対応します。
 *
 * @returns Zodスキーマ
 *
 * @example
 * ```typescript
 * const schema = createUserIdSchema();
 * const userId = schema.parse("U0812GLUZD2");
 * ```
 */
export function createUserIdSchema() {
  return z.string().superRefine((val, ctx) => {
    if (val.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 1,
        type: "string",
        inclusive: true,
        message: t("errors.validation.user_id_empty"),
      });
      return;
    }
    if (!/^[UW][A-Z0-9]+$/.test(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_string,
        validation: "regex",
        message: t("errors.validation.user_id_format"),
      });
    }
  });
}

/**
 * i18n対応の空でない文字列スキーマを生成
 *
 * エラーメッセージは検証時に動的に評価されるため、
 * ロケール変更に対応します。
 *
 * @returns Zodスキーマ
 *
 * @example
 * ```typescript
 * const schema = createNonEmptyStringSchema();
 * const text = schema.parse("Hello");
 * ```
 */
export function createNonEmptyStringSchema() {
  return z.string().superRefine((val, ctx) => {
    if (val.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 1,
        type: "string",
        inclusive: true,
        message: t("errors.validation.value_empty"),
      });
    }
  });
}

/**
 * Slackチャンネル ID スキーマ（デフォルトインスタンス）
 *
 * エラーメッセージは検証時に動的に評価されるため、
 * ロケール変更に自動的に対応します。
 *
 * @example
 * ```typescript
 * const channelId = channelIdSchema.parse("C12345678");
 * ```
 */
export const channelIdSchema = createChannelIdSchema();

/**
 * Slack ユーザー ID スキーマ（デフォルトインスタンス）
 *
 * エラーメッセージは検証時に動的に評価されるため、
 * ロケール変更に自動的に対応します。
 *
 * @example
 * ```typescript
 * const userId = userIdSchema.parse("U0812GLUZD2");
 * ```
 */
export const userIdSchema = createUserIdSchema();

/**
 * 空でない文字列スキーマ（デフォルトインスタンス）
 *
 * エラーメッセージは検証時に動的に評価されるため、
 * ロケール変更に自動的に対応します。
 *
 * @example
 * ```typescript
 * const text = nonEmptyStringSchema.parse("Hello");
 * ```
 */
export const nonEmptyStringSchema = createNonEmptyStringSchema();

/**
 * 型推論のエクスポート
 */
export type ChannelId = z.infer<ReturnType<typeof createChannelIdSchema>>;
export type UserId = z.infer<ReturnType<typeof createUserIdSchema>>;
export type NonEmptyString = z.infer<
  ReturnType<typeof createNonEmptyStringSchema>
>;
