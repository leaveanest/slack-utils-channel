function translateHeadings(notes) {
  return notes
    .replace(/^### Features$/gm, "### 新機能 / Features")
    .replace(/^### Bug Fixes$/gm, "### 不具合修正 / Bug Fixes")
    .replace(/^### Documentation$/gm, "### ドキュメント / Documentation")
    .replace(/^### Style Updates$/gm, "### スタイル更新 / Style Updates")
    .replace(/^### Refactors$/gm, "### リファクタリング / Refactors")
    .replace(/^### Tests$/gm, "### テスト / Tests")
    .replace(/^### Chores$/gm, "### メンテナンス / Chores")
    .replace(
      /^### ⚠️ Breaking Changes$/gm,
      "### ⚠️ 破壊的変更 / Breaking Changes",
    );
}

function uniqueContributors(commits = []) {
  const seen = new Set();
  const contributors = [];
  for (const commit of commits) {
    const login = commit.author && commit.author.login;
    const name = commit.author && commit.author.name;
    const identifier = login || name;
    if (identifier && !seen.has(identifier)) {
      seen.add(identifier);
      contributors.push(login ? `@${login}` : name);
    }
  }
  return contributors;
}

module.exports = {
  generateNotes: (_pluginConfig, context) => {
    const englishNotes =
      (context.nextRelease && context.nextRelease.notes || "").trim();
    const translatedNotes = translateHeadings(englishNotes).trim();
    const hasBreakingChanges = /Breaking Changes/i.test(englishNotes);
    const contributors = uniqueContributors(context.commits);

    const sections = [];
    sections.push("## Release Notes / リリースノート");

    if (hasBreakingChanges) {
      sections.push(
        "**Breaking Changes / 破壊的変更**: 重要な変更点がありますので必ずご確認ください。",
      );
    }

    if (englishNotes.length > 0) {
      sections.push("### English");
      sections.push(englishNotes);
    }

    if (translatedNotes.length > 0) {
      sections.push("### 日本語");
      sections.push(translatedNotes);
    }

    if (contributors.length > 0) {
      sections.push("### Contributors / 貢献者");
      sections.push(
        contributors.map((contributor) => `- ${contributor}`).join("\n"),
      );
    }

    return sections.join("\n\n").trim() + "\n";
  },
};
