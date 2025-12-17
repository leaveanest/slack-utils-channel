import { assertEquals } from "std/testing/asserts.ts";
import { ShowLoadingModalDefinition } from "./mod.ts";

/**
 * ShowLoadingModalDefinition のテスト
 */
Deno.test("ShowLoadingModalDefinition: 関数定義がエクスポートされている", () => {
  // 関数定義が正しくエクスポートされていることを確認
  assertEquals(typeof ShowLoadingModalDefinition, "object");
  assertEquals(ShowLoadingModalDefinition !== null, true);
});

Deno.test("ShowLoadingModalDefinition: definitionプロパティが存在する", () => {
  // deno-lint-ignore no-explicit-any
  const def = ShowLoadingModalDefinition as any;
  // 定義オブジェクトが存在することを確認
  assertEquals("definition" in def || "id" in def, true);
});
