module.exports = {
  branches: ["main"],
  tagFormat: "${version}",
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        releaseRules: [
          { type: "feat", release: "minor" },
          { type: "fix", release: "patch" },
          { type: "docs", release: "patch" },
          { type: "style", release: "patch" },
          { type: "refactor", release: "patch" },
          { type: "test", release: "patch" },
          { type: "chore", release: "patch" },
        ],
      },
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
        presetConfig: {
          types: [
            { type: "feat", section: "Features" },
            { type: "fix", section: "Bug Fixes" },
            { type: "docs", section: "Documentation" },
            { type: "style", section: "Style Updates" },
            { type: "refactor", section: "Refactors" },
            { type: "test", section: "Tests" },
            { type: "chore", section: "Chores" },
          ],
        },
      },
    ],
    ["./scripts/semantic-release-bilingual.cjs"],
  ],
};
