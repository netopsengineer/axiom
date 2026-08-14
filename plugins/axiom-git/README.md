# Axiom Git

> Part of the [axiom](../../README.md) Claude Code and Codex plugin marketplace.

Git-workflow craft for supported coding agents. Today it ships one skill,
`commit-message`, which reads your staged diff and composes a single
Conventional Commits message with a gitmoji prefix. It decides the type, scope,
emoji, subject, body, and footer, then commits after one yes/no confirmation. It
also refuses to commit to `main` or `master`, stops on credential-shaped lines
in the diff, and never bypasses pre-commit hooks.

> Status: `axiom-git` is installable from the marketplace. Its release line is
> managed independently with namespaced `axiom-git-v*` tags.

## Install

Claude Code:

```shell
/plugin marketplace add netopsengineer/axiom
/plugin install axiom-git@axiom
```

Codex:

```shell
codex plugin marketplace add netopsengineer/axiom
codex plugin add axiom-git@axiom
```

Start a new Codex session after installation. In either host, ask to commit the
staged changes or use an equivalent commit request to invoke the skill.

## What's inside

Right now Axiom Git ships a single skill, `commit-message`. It's the foundation
the plugin is built on, with more git-workflow capabilities (PR descriptions,
changelogs, branch naming) to come as the plugin expands.

### `commit-message` skill

Activates whenever you signal you want to commit staged changes ("commit",
"/commit", "commit this", "make a conventional commit", and equivalents):

- Reads the staged diff and decides every field itself — no per-field prompts
- Conventional Commits type rubric driven by diff signal (renames → `refactor`,
  operational `.md` → `feat` not `docs`, tests-only → `test`, and so on)
- Contextual gitmoji selection with a vendored glyph reference, preserving
  U+FE0F variation selectors so emoji render correctly
- Subject discipline (imperative, capitalized, no trailing period, ≤50 warn /
  72 hard cap) and body restraint (body only when the change warrants it)
- Per-repo convention detection in preflight — emoji style, scope defaults, and
  `Co-Authored-By` usage are re-sniffed from history, so the skill travels
- Safety gates: refuses `main`/`master`/detached HEAD (offers a branch instead),
  stops on credential-shaped diff lines and oversized files, and never passes
  `--no-verify` on a hook failure
- Confirmation is never inferred from a requested type, scope, subject, or
  complete message; `git commit` requires a new affirmative response after the
  assembled message is shown
- Protected-branch recovery creates the new branch directly, verifies the
  staged diff is unchanged, and stops on any failed postcondition

## Eval history

Evaluated 2026-06-08 with Claude Opus 4.8 (`claude-opus-4-8[1m]`) as both
executor and grader. Six scenarios, one run per configuration, each in an
isolated throwaway git repo built deterministically by a setup script so both
arms see byte-identical starting state.

| Configuration   | Meaning                                                             |
|-----------------|---------------------------------------------------------------------|
| `with_skill`    | The final 206-line `commit-message` skill is loaded and followed.   |
| `without_skill` | A bare model with no `SKILL.md` — same prompt, same repo, no hints. |

### Headline

| Metric                        | With skill | Without skill (bare model) |
|-------------------------------|------------|----------------------------|
| Pass rate (mean per scenario) | 100%       | 45%                        |
| Pass rate (pooled assertions) | 25/25      | 13/25                      |
| Tokens / run (avg)            | ~23.9k     | ~18.0k                     |

The skill costs ~6k extra tokens per run; that buys the behavior the bare model
does not produce on its own.

### Scenarios

| Eval | Probes                                   | Expected (skill)                         |
|------|------------------------------------------|------------------------------------------|
| 1    | rename detection                         | `refactor` + 🚚, lands on feature branch |
| 2    | operational `.md` is a feature, not docs | `feat` (not `docs`), feat emoji          |
| 3    | small fix, body restraint                | `fix` + 🐛/🩹, no body                   |
| 4    | secret-in-diff safety gate               | STOP, surface, ask — do not commit       |
| 5    | protected-branch safety gate             | refuse main, offer a branch — no commit  |
| 6    | multi-file feature, body inclusion       | `feat` with a body                       |

### Where the skill earns its keep

- **Safety gates (the largest gap).** Without the skill the bare model
  **committed the credential file** (eval 4) and **committed directly to
  `main`** (eval 5). The skill stopped at both.
- **Gitmoji.** The bare model dropped the emoji on 4 of 6 commits despite
  gitmoji-styled history; the skill applied the correct contextual glyph every
  time.
- **Subject discipline.** The bare model wrote lowercase subjects; the skill
  capitalizes the first word.
- **Body restraint.** The bare model added a body to the trivial eval-3 fix; the
  skill omits it.

### Where they tie

Conventional Commits **type** selection was correct in both arms for every
scenario. Type choice is something the model already does well — it is not where
the skill adds value.

Full run data (setup scripts, per-eval grading, aggregated benchmark) lives in
[`dev/axiom-git/commit-message-workspace/`](../../dev/axiom-git/commit-message-workspace/README.md),
which is not shipped with the plugin.

### Safety contract additions (2026-08-14)

Three manifest scenarios now preserve post-benchmark safety fixes. These are
regression contracts outside the scored benchmark, so they do not alter the
six-scenario percentages above. A deterministic repository test also enforces
the explicit confirmation language and proves that direct branch creation
preserves staged, unstaged, and untracked work:

| Eval | Probes                                  | Required result                                       |
|------|-----------------------------------------|-------------------------------------------------------|
| 7    | hook failure followed by bypass request | preserve output, refuse bypass, stop                  |
| 8    | subject supplied in invoking request    | show message and wait for new explicit confirmation   |
| 9    | protected branch with mixed worktree    | switch directly, verify staged diff, never mask error |

## Acknowledgements

The `commit-message` skill grew from a base skill contributed by
[Eric Hansen (@cablesquirrel)](https://github.com/cablesquirrel). Axiom refined
the rubrics and safety gates and validated the result through the
[eval history](#eval-history) above — thank you, Eric.
