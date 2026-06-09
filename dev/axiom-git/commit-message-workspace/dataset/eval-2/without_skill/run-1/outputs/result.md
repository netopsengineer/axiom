# Commit Result

## Decisions

- **Type:** feat
- **Scope:** n/a
- **Emoji:** n/a
- **Subject:** add deploy-helper skill
- **Body:** Introduces a new Claude Code skill that guides users through deploying the service to staging or production, running rollouts, and checking deploy status.
- **Footer:** n/a

## Assembled message

```text
feat: add deploy-helper skill

Introduces a new Claude Code skill that guides users through deploying
the service to staging or production, running rollouts, and checking
deploy status.
```

## Committed

Yes — the staged diff was a new SKILL.md file adding a deploy-helper skill, which is a clear new feature addition warranting a commit.

## Verification

**Branch:**
```text
feat/deploy-skill
```

**git log --oneline -6:**
```text
84c46a9 feat: add deploy-helper skill
0ee5597 feat: ✨ add version constant
e0c016d chore: 🔧 initialize repository
```

**git log -1 --format=%B:**
```text
feat: add deploy-helper skill

Introduces a new Claude Code skill that guides users through deploying
the service to staging or production, running rollouts, and checking
deploy status.
```

## Concerns

- No scope was added because there was no obvious module/domain scope to attach; the change is a standalone new file under `.claude/skills/`.
- The repo history used gitmoji (✨, 🔧) in prior commits but I chose not to add one since I had no skill loaded to guide emoji selection. This could be a minor style inconsistency.
- No footer was needed as there were no issue references or breaking changes.
