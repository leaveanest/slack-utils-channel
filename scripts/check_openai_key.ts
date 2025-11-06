// deno-lint-ignore-file no-explicit-any
import "std/dotenv/load.ts";

function printUsageAndExit(message: string): never {
  console.error(message);
  console.error(
    "Environment setup: please create a .env file with OPENAI_API_KEY=...",
  );
  Deno.exit(1);
}

const apiKey = Deno.env.get("OPENAI_API_KEY");

if (!apiKey || apiKey.trim().length === 0) {
  printUsageAndExit(
    "OPENAI_API_KEY が見つかりませんでした (.env を確認してください)",
  );
}

// 軽量な検証: OpenAI API の models エンドポイントに HEAD/GET を投げて 200/2xx を確認
// Deno からの直接検証。Unauthorized(401) なら鍵不正、DNS や 5xx はネットワーク/一時障害の可能性。

const url = "https://api.openai.com/v1/models";

try {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401) {
    console.error(
      "検証失敗: 401 Unauthorized。APIキーが誤っている可能性があります。",
    );
    Deno.exit(2);
  }

  if (!res.ok) {
    console.error(`検証失敗: HTTP ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.error(text);
    Deno.exit(3);
  }

  // 最小限の出力（モデル数などを表示）
  const data: any = await res.json();
  const count = Array.isArray(data?.data) ? data.data.length : undefined;
  console.log("検証成功: OpenAI API に接続できました。");
  if (typeof count === "number") {
    console.log(`取得できたモデル数: ${count}`);
  }
  Deno.exit(0);
} catch (err) {
  console.error("検証中にエラーが発生しました。");
  console.error(String(err));
  Deno.exit(4);
}
