/**
 * Automatic translation script using Anthropic Claude API
 *
 * This script translates English locale files to Japanese using Claude Haiku 4.5.
 * It preserves placeholders (e.g., {name}) and JSON structure.
 *
 * Usage:
 *   deno run --allow-env --allow-read --allow-write --allow-net scripts/translate.ts
 */

interface ClaudeMessage {
  role: string;
  content: string;
}

interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
}

interface ClaudeResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  stop_reason: string;
}

/**
 * Call Anthropic Claude API to translate text
 *
 * @param text - Text to translate
 * @param apiKey - Anthropic API key
 * @returns Translated text
 */
async function translateWithClaude(
  text: string,
  apiKey: string,
): Promise<string> {
  const systemPrompt =
    `You are a professional translator. Translate the following English text to Japanese.

IMPORTANT RULES:
1. Preserve all placeholders in curly braces (e.g., {name}, {error}, {count}) EXACTLY as they are
2. Keep the same JSON structure
3. Translate only the text content, not keys or placeholders
4. Maintain technical terms when appropriate
5. Use natural Japanese that fits the context (error messages, logs, etc.)

Return ONLY the translated JSON, without any explanation or markdown formatting.`;

  const request: ClaudeRequest = {
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content:
          `${systemPrompt}\n\nTranslate this JSON to Japanese:\n\n${text}`,
      },
    ],
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data: ClaudeResponse = await response.json();

  // Concatenate all text blocks from the content array
  // Claude can split long responses across multiple blocks
  const translatedText = data.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  if (!translatedText) {
    throw new Error("No translation returned from Anthropic Claude API");
  }

  // Remove markdown code blocks if present
  return translatedText
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
}

/**
 * Main translation function
 */
async function main() {
  console.log("🌍 Starting automatic translation...\n");

  // Check for Anthropic API key
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error(
      "❌ Error: ANTHROPIC_API_KEY environment variable is not set",
    );
    console.error(
      "   Please set it in your .env file or environment variables",
    );
    Deno.exit(1);
  }

  // Read English locale file
  const enPath = new URL("../locales/en.json", import.meta.url);
  const jaPath = new URL("../locales/ja.json", import.meta.url);

  console.log("📖 Reading English locale file...");
  let enContent: string;
  try {
    enContent = await Deno.readTextFile(enPath);
  } catch (error) {
    console.error(`❌ Failed to read ${enPath}:`, error);
    Deno.exit(1);
  }

  // Validate JSON
  let enData: Record<string, unknown>;
  try {
    enData = JSON.parse(enContent);
  } catch (error) {
    console.error("❌ Invalid JSON in English locale file:", error);
    Deno.exit(1);
  }

  console.log("✅ English locale loaded\n");

  // Check if Japanese locale exists
  try {
    const existingJaContent = await Deno.readTextFile(jaPath);
    JSON.parse(existingJaContent);
    console.log("📝 Existing Japanese locale found");
  } catch {
    console.log("📝 No existing Japanese locale found, creating new one");
  }

  // Translate using Anthropic Claude API
  console.log(
    "🤖 Translating with Anthropic Claude API (claude-haiku-4-5-20251001)...",
  );
  console.log("   This may take a moment...\n");

  let translatedContent: string;
  try {
    translatedContent = await translateWithClaude(
      JSON.stringify(enData, null, 2),
      apiKey,
    );
  } catch (error) {
    console.error("❌ Translation failed:", error);
    Deno.exit(1);
  }

  // Validate translated JSON
  let jaData: Record<string, unknown>;
  try {
    jaData = JSON.parse(translatedContent);
  } catch (error) {
    console.error("❌ Invalid JSON returned from translation:", error);
    console.error("Raw response:", translatedContent);
    Deno.exit(1);
  }

  // Write Japanese locale file
  console.log("💾 Writing Japanese locale file...");
  try {
    await Deno.writeTextFile(
      jaPath,
      JSON.stringify(jaData, null, 2) + "\n",
    );
  } catch (error) {
    console.error(`❌ Failed to write ${jaPath}:`, error);
    Deno.exit(1);
  }

  console.log("✅ Japanese locale file updated successfully!\n");

  // Show summary
  console.log("📊 Translation Summary:");
  console.log(`   Source: locales/en.json`);
  console.log(`   Target: locales/ja.json`);
  console.log(`   Keys translated: ${countKeys(jaData)}`);
  console.log("\n🎉 Translation complete!");
}

/**
 * Count total number of keys in nested object
 */
function countKeys(obj: Record<string, unknown>): number {
  let count = 0;
  for (const value of Object.values(obj)) {
    if (typeof value === "object" && value !== null) {
      count += countKeys(value as Record<string, unknown>);
    } else {
      count++;
    }
  }
  return count;
}

// Run the script
if (import.meta.main) {
  main().catch((error) => {
    console.error("❌ Unexpected error:", error);
    Deno.exit(1);
  });
}
