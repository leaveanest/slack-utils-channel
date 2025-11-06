/**
 * I18n integrity checker
 *
 * This script verifies that all locale files have consistent keys
 * and that translations are complete.
 *
 * Usage:
 *   deno run --allow-read lib/i18n/check.ts
 */

interface CheckResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalKeys: number;
    languages: Record<string, number>;
  };
}

/**
 * Get all keys from a nested object with dot notation
 */
function getAllKeys(
  obj: Record<string, unknown>,
  prefix = "",
): Set<string> {
  const keys = new Set<string>();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (
      typeof value === "object" && value !== null &&
      !Array.isArray(value)
    ) {
      const nestedKeys = getAllKeys(
        value as Record<string, unknown>,
        fullKey,
      );
      nestedKeys.forEach((k) => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }

  return keys;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (
      current === null || current === undefined ||
      typeof current !== "object"
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Extract placeholders from a string
 */
function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{(\w+)\}/g);
  return matches ? matches.map((m) => m.slice(1, -1)) : [];
}

/**
 * Check i18n integrity
 */
export async function checkI18n(): Promise<CheckResult> {
  const result: CheckResult = {
    success: true,
    errors: [],
    warnings: [],
    stats: {
      totalKeys: 0,
      languages: {},
    },
  };

  // Load locale files
  const locales = ["en", "ja"];
  const localeData: Record<string, Record<string, unknown>> = {};

  for (const locale of locales) {
    try {
      const path = new URL(`../../locales/${locale}.json`, import.meta.url);
      const content = await Deno.readTextFile(path);
      localeData[locale] = JSON.parse(content);
    } catch (error) {
      result.errors.push(`Failed to load ${locale}.json: ${error}`);
      result.success = false;
      return result;
    }
  }

  // Get all keys from each locale
  const keysByLocale: Record<string, Set<string>> = {};
  for (const locale of locales) {
    keysByLocale[locale] = getAllKeys(localeData[locale]);
    result.stats.languages[locale] = keysByLocale[locale].size;
  }

  // Use English as the reference
  const referenceKeys = keysByLocale["en"];
  result.stats.totalKeys = referenceKeys.size;

  // Check for missing keys in other locales
  for (const locale of locales) {
    if (locale === "en") continue;

    const localeKeys = keysByLocale[locale];

    // Check for missing keys
    for (const key of referenceKeys) {
      if (!localeKeys.has(key)) {
        result.errors.push(
          `Missing translation in ${locale}.json: "${key}"`,
        );
        result.success = false;
      }
    }

    // Check for extra keys (keys that don't exist in English)
    for (const key of localeKeys) {
      if (!referenceKeys.has(key)) {
        result.warnings.push(
          `Extra key in ${locale}.json (not in en.json): "${key}"`,
        );
      }
    }
  }

  // Check placeholder consistency
  for (const key of referenceKeys) {
    const enValue = getNestedValue(localeData["en"], key);
    if (typeof enValue !== "string") continue;

    const enPlaceholders = extractPlaceholders(enValue);

    for (const locale of locales) {
      if (locale === "en") continue;

      const localeValue = getNestedValue(localeData[locale], key);
      if (typeof localeValue !== "string") {
        result.errors.push(
          `Type mismatch for "${key}": en is string, ${locale} is ${typeof localeValue}`,
        );
        result.success = false;
        continue;
      }

      const localePlaceholders = extractPlaceholders(localeValue);

      // Check if all placeholders are present
      const enSet = new Set(enPlaceholders);
      const localeSet = new Set(localePlaceholders);

      for (const placeholder of enPlaceholders) {
        if (!localeSet.has(placeholder)) {
          result.errors.push(
            `Missing placeholder {${placeholder}} in ${locale}.json for key "${key}"`,
          );
          result.success = false;
        }
      }

      for (const placeholder of localePlaceholders) {
        if (!enSet.has(placeholder)) {
          result.warnings.push(
            `Extra placeholder {${placeholder}} in ${locale}.json for key "${key}"`,
          );
        }
      }
    }
  }

  return result;
}

/**
 * Main function
 */
async function main() {
  console.log("🔍 Checking i18n integrity...\n");

  const result = await checkI18n();

  // Print statistics
  console.log("📊 Statistics:");
  console.log(`   Total keys: ${result.stats.totalKeys}`);
  for (const [lang, count] of Object.entries(result.stats.languages)) {
    console.log(`   ${lang}: ${count} keys`);
  }
  console.log();

  // Print errors
  if (result.errors.length > 0) {
    console.log("❌ Errors:");
    for (const error of result.errors) {
      console.log(`   - ${error}`);
    }
    console.log();
  }

  // Print warnings
  if (result.warnings.length > 0) {
    console.log("⚠️  Warnings:");
    for (const warning of result.warnings) {
      console.log(`   - ${warning}`);
    }
    console.log();
  }

  // Print result
  if (result.success) {
    console.log("✅ All checks passed!");
    Deno.exit(0);
  } else {
    console.log("❌ I18n integrity check failed!");
    console.log(
      `   Found ${result.errors.length} error(s) and ${result.warnings.length} warning(s)`,
    );
    Deno.exit(1);
  }
}

// Run the script
if (import.meta.main) {
  main().catch((error) => {
    console.error("❌ Unexpected error:", error);
    Deno.exit(1);
  });
}
