import assert from "node:assert/strict";

export const RELEASE_NOTE_FIXTURES = [
  {
    message: "feat: add marketplace support",
    expected: [/### Features/u, /add marketplace support/u],
  },
  {
    message: "fix(api): correct validation",
    expected: [/### Bug Fixes/u, /api:/u, /correct validation/u],
  },
  {
    message: "feat!: remove a legacy manifest",
    expected: [/BREAKING CHANGES/u, /remove a legacy manifest/u],
  },
  {
    message:
      "feat(api): change behavior\n\nBREAKING CHANGE: the old API is removed",
    expected: [/BREAKING CHANGES/u, /the old API is removed/u],
  },
];

export const RELEASE_NOTE_OPTIONS = {
  preset: "conventionalcommits",
  presetConfig: {},
};

export async function assertReleaseNoteFixtures({
  cwd,
  generateNotes,
  pluginName = "release-note-probe",
}) {
  for (const fixture of RELEASE_NOTE_FIXTURES) {
    const notes = await generateNotes(RELEASE_NOTE_OPTIONS, {
      commits: [
        {
          hash: "38399bc12861a1db9cfa75c1ff29c92fe9f955b1",
          message: fixture.message,
        },
      ],
      cwd,
      lastRelease: { gitTag: `${pluginName}-v1.0.0` },
      nextRelease: {
        gitTag: `${pluginName}-v1.1.0`,
        version: "1.1.0",
      },
      options: {
        repositoryUrl: "https://github.com/netopsengineer/axiom.git",
      },
    });
    for (const expected of fixture.expected) {
      assert.match(notes, expected, `${pluginName}: ${fixture.message}`);
    }
  }
}
