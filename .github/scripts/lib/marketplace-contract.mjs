import { randomUUID } from "node:crypto";
import {
  access,
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
  rename,
  rmdir,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

export const CANONICAL_MARKETPLACE_PATH = ".axiom/marketplace.json";
export const CLAUDE_MARKETPLACE_PATH = ".claude-plugin/marketplace.json";
export const CODEX_MARKETPLACE_PATH = ".agents/plugins/marketplace.json";

const CLAUDE_MARKETPLACE_SCHEMA =
  "https://json.schemastore.org/claude-code-marketplace.json";
const CLAUDE_PLUGIN_SCHEMA =
  "https://json.schemastore.org/claude-code-plugin-manifest.json";
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/u;
const INSTALLATION_POLICIES = new Set([
  "NOT_AVAILABLE",
  "AVAILABLE",
  "INSTALLED_BY_DEFAULT",
]);
const AUTHENTICATION_POLICIES = new Set(["ON_INSTALL", "ON_USE"]);

export async function loadMarketplaceContract(repositoryRoot) {
  const root = path.resolve(
    requireNonBlankString(repositoryRoot, "repositoryRoot"),
  );
  const rootStats = await stat(root).catch((error) => {
    throw new Error(
      `Repository root ${root} is not readable: ${error.message}`,
    );
  });

  if (!rootStats.isDirectory()) {
    throw new Error(`Repository root ${root} must be a directory.`);
  }

  const rootRealPath = await realpath(root);
  const marketplacePath = path.join(root, CANONICAL_MARKETPLACE_PATH);
  const marketplace = validateCanonicalMarketplace(
    await readJson(marketplacePath, root),
    CANONICAL_MARKETPLACE_PATH,
  );
  const pluginsRoot = path.join(root, "plugins");
  const pluginsRootRealPath = await realpath(pluginsRoot).catch((error) => {
    throw new Error(`plugins must exist and be readable: ${error.message}`);
  });
  assertContained(rootRealPath, pluginsRootRealPath, "plugins");

  const directoryNames = await listPluginDirectories(pluginsRoot);
  const registeredNames = new Set(marketplace.plugins);
  const missingDirectories = marketplace.plugins.filter(
    (pluginName) => !directoryNames.includes(pluginName),
  );

  if (missingDirectories.length > 0) {
    throw new Error(
      `${CANONICAL_MARKETPLACE_PATH} registers missing plugin ${missingDirectories
        .map((name) => `plugins/${name}`)
        .join(", ")}.`,
    );
  }

  const unregisteredDirectories = directoryNames.filter(
    (pluginName) => !registeredNames.has(pluginName),
  );

  if (unregisteredDirectories.length > 0) {
    await throwUnregisteredDirectoryError(root, unregisteredDirectories);
  }

  const plugins = [];
  for (const pluginName of marketplace.plugins) {
    const pluginRoot = path.join(pluginsRoot, pluginName);
    const pluginRootRealPath = await realpath(pluginRoot);
    assertContained(
      pluginsRootRealPath,
      pluginRootRealPath,
      `plugins/${pluginName}`,
    );

    const canonicalPath = path.posix.join(
      "plugins",
      pluginName,
      ".axiom/plugin.json",
    );
    const metadata = validateCanonicalPlugin(
      await readJson(path.join(root, canonicalPath), root),
      pluginName,
      canonicalPath,
    );

    await validatePluginFilesystem({
      root,
      pluginName,
      pluginRoot,
      pluginRootRealPath,
      metadata,
    });

    plugins.push({
      name: pluginName,
      root: pluginRoot,
      canonicalPath,
      metadata,
    });
  }

  return {
    root,
    rootRealPath,
    marketplace,
    plugins,
  };
}

export function validateCanonicalMarketplace(
  value,
  sourcePath = CANONICAL_MARKETPLACE_PATH,
) {
  const record = requirePlainObject(value, sourcePath);
  requireExactKeys(
    record,
    ["schemaVersion", "name", "displayName", "owner", "platforms", "plugins"],
    sourcePath,
  );
  requireSchemaVersion(record.schemaVersion, sourcePath);

  if (record.name !== "axiom") {
    throw new Error(`${sourcePath}.name must be "axiom".`);
  }
  if (record.displayName !== "Axiom") {
    throw new Error(`${sourcePath}.displayName must be "Axiom".`);
  }

  validateIdentity(record.owner, `${sourcePath}.owner`);

  const platforms = requirePlainObject(
    record.platforms,
    `${sourcePath}.platforms`,
  );
  requireExactKeys(platforms, ["claude"], `${sourcePath}.platforms`);
  const claude = requirePlainObject(
    platforms.claude,
    `${sourcePath}.platforms.claude`,
  );
  requireExactKeys(claude, ["description"], `${sourcePath}.platforms.claude`);
  requireNonBlankString(
    claude.description,
    `${sourcePath}.platforms.claude.description`,
  );

  validateStringArray(record.plugins, `${sourcePath}.plugins`, {
    itemValidator: (pluginName, itemPath) => {
      if (!KEBAB_CASE.test(pluginName)) {
        throw new Error(`${itemPath} must be lowercase kebab-case.`);
      }
    },
  });

  return record;
}

export function validateCanonicalPlugin(
  value,
  expectedName,
  sourcePath = `plugins/${expectedName}/.axiom/plugin.json`,
) {
  const record = requirePlainObject(value, sourcePath);
  requireExactKeys(
    record,
    [
      "schemaVersion",
      "name",
      "version",
      "displayName",
      "description",
      "author",
      "license",
      "repository",
      "keywords",
      "components",
      "platforms",
    ],
    sourcePath,
  );
  requireSchemaVersion(record.schemaVersion, sourcePath);

  const name = requireNonBlankString(record.name, `${sourcePath}.name`);
  if (!KEBAB_CASE.test(name)) {
    throw new Error(`${sourcePath}.name must be lowercase kebab-case.`);
  }
  if (name !== expectedName) {
    throw new Error(
      `${sourcePath}.name must match plugin directory "${expectedName}".`,
    );
  }

  const version = requireNonBlankString(
    record.version,
    `${sourcePath}.version`,
  );
  if (!SEMVER.test(version)) {
    throw new Error(`${sourcePath}.version must be a valid Semantic Version.`);
  }

  requireNonBlankString(record.displayName, `${sourcePath}.displayName`);
  requireNonBlankString(record.description, `${sourcePath}.description`);
  validateIdentity(record.author, `${sourcePath}.author`);
  requireNonBlankString(record.license, `${sourcePath}.license`);
  validateHttpsUrl(record.repository, `${sourcePath}.repository`);
  validateStringArray(record.keywords, `${sourcePath}.keywords`);

  const components = requirePlainObject(
    record.components,
    `${sourcePath}.components`,
  );
  requireExactKeys(components, ["skills"], `${sourcePath}.components`);
  validateComponentPath(components.skills, `${sourcePath}.components.skills`);
  if (components.skills !== "./skills/") {
    throw new Error(
      `${sourcePath}.components.skills must be "./skills/" for current plugins.`,
    );
  }

  const platforms = requirePlainObject(
    record.platforms,
    `${sourcePath}.platforms`,
  );
  requireExactKeys(platforms, ["claude", "codex"], `${sourcePath}.platforms`);
  validateClaudePluginPlatform(platforms.claude, sourcePath);
  validateCodexPluginPlatform(platforms.codex, sourcePath);

  return record;
}

export function renderClaudeMarketplace(contract) {
  const output = {
    $schema: CLAUDE_MARKETPLACE_SCHEMA,
    name: contract.marketplace.name,
    description: contract.marketplace.platforms.claude.description,
    owner: contract.marketplace.owner,
    plugins: contract.plugins.map(({ metadata }) => ({
      name: metadata.name,
      source: `./plugins/${metadata.name}`,
      description: metadata.platforms.claude.catalogDescription,
      category: metadata.platforms.claude.category,
    })),
  };

  return serializeJson(output);
}

export function renderClaudePluginManifest(pluginMetadata) {
  const output = {
    $schema: CLAUDE_PLUGIN_SCHEMA,
    name: pluginMetadata.name,
    displayName: pluginMetadata.displayName,
    description: pluginMetadata.description,
    version: pluginMetadata.version,
    author: pluginMetadata.author,
    license: pluginMetadata.license,
    repository: pluginMetadata.repository,
    keywords: pluginMetadata.keywords,
  };

  return serializeJson(output);
}

export function renderCodexMarketplace(contract) {
  const output = {
    name: contract.marketplace.name,
    interface: {
      displayName: contract.marketplace.displayName,
    },
    plugins: contract.plugins.map(({ metadata }) => ({
      name: metadata.name,
      source: {
        source: "local",
        path: `./plugins/${metadata.name}`,
      },
      policy: metadata.platforms.codex.policy,
      category: metadata.platforms.codex.category,
    })),
  };

  return serializeJson(output);
}

export function renderCodexPluginManifest(pluginMetadata) {
  const output = {
    name: pluginMetadata.name,
    version: pluginMetadata.version,
    description: pluginMetadata.description,
    author: pluginMetadata.author,
    repository: pluginMetadata.repository,
    license: pluginMetadata.license,
    keywords: pluginMetadata.keywords,
    skills: pluginMetadata.components.skills,
    interface: {
      displayName: pluginMetadata.displayName,
      shortDescription: pluginMetadata.platforms.codex.shortDescription,
      longDescription: pluginMetadata.description,
      developerName: pluginMetadata.author.name,
      category: pluginMetadata.platforms.codex.category,
      websiteURL: pluginMetadata.repository,
      defaultPrompt: pluginMetadata.platforms.codex.defaultPrompt,
    },
  };

  return serializeJson(output);
}

export function renderMarketplaceOutputs(contract) {
  const outputs = new Map([
    [CLAUDE_MARKETPLACE_PATH, renderClaudeMarketplace(contract)],
    [CODEX_MARKETPLACE_PATH, renderCodexMarketplace(contract)],
  ]);

  for (const plugin of contract.plugins) {
    outputs.set(
      path.posix.join("plugins", plugin.name, ".claude-plugin/plugin.json"),
      renderClaudePluginManifest(plugin.metadata),
    );
    outputs.set(
      path.posix.join("plugins", plugin.name, ".codex-plugin/plugin.json"),
      renderCodexPluginManifest(plugin.metadata),
    );
  }

  validateRenderedClaudeOutputs(contract, outputs);
  validateRenderedCodexOutputs(contract, outputs);
  return outputs;
}

export function validateRenderedClaudeOutputs(contract, outputs) {
  const expected = new Map([
    [
      CLAUDE_MARKETPLACE_PATH,
      {
        $schema: CLAUDE_MARKETPLACE_SCHEMA,
        name: contract.marketplace.name,
        description: contract.marketplace.platforms.claude.description,
        owner: contract.marketplace.owner,
        plugins: contract.plugins.map(({ metadata }) => ({
          name: metadata.name,
          source: `./plugins/${metadata.name}`,
          description: metadata.platforms.claude.catalogDescription,
          category: metadata.platforms.claude.category,
        })),
      },
    ],
  ]);

  for (const plugin of contract.plugins) {
    expected.set(
      path.posix.join("plugins", plugin.name, ".claude-plugin/plugin.json"),
      {
        $schema: CLAUDE_PLUGIN_SCHEMA,
        name: plugin.metadata.name,
        displayName: plugin.metadata.displayName,
        description: plugin.metadata.description,
        version: plugin.metadata.version,
        author: plugin.metadata.author,
        license: plugin.metadata.license,
        repository: plugin.metadata.repository,
        keywords: plugin.metadata.keywords,
      },
    );
  }

  for (const expectedPath of expected.keys()) {
    if (!outputs.has(expectedPath)) {
      throw new Error(`Rendered Claude output is missing ${expectedPath}.`);
    }
  }

  for (const [relativePath, expectedObject] of expected) {
    const text = outputs.get(relativePath);
    if (typeof text !== "string" || !text.endsWith("\n")) {
      throw new Error(
        `${relativePath} must be rendered with one final newline.`,
      );
    }
    if (text.endsWith("\n\n")) {
      throw new Error(
        `${relativePath} must contain exactly one final newline.`,
      );
    }

    const parsed = parseJsonText(text, relativePath);
    if (!isDeepStrictEqual(parsed, expectedObject)) {
      throw new Error(
        `${relativePath} does not match its Claude adapter contract.`,
      );
    }
  }
}

export function validateRenderedCodexOutputs(contract, outputs) {
  const expected = new Map([
    [
      CODEX_MARKETPLACE_PATH,
      {
        name: contract.marketplace.name,
        interface: {
          displayName: contract.marketplace.displayName,
        },
        plugins: contract.plugins.map(({ metadata }) => ({
          name: metadata.name,
          source: {
            source: "local",
            path: `./plugins/${metadata.name}`,
          },
          policy: metadata.platforms.codex.policy,
          category: metadata.platforms.codex.category,
        })),
      },
    ],
  ]);

  for (const plugin of contract.plugins) {
    expected.set(
      path.posix.join("plugins", plugin.name, ".codex-plugin/plugin.json"),
      {
        name: plugin.metadata.name,
        version: plugin.metadata.version,
        description: plugin.metadata.description,
        author: plugin.metadata.author,
        repository: plugin.metadata.repository,
        license: plugin.metadata.license,
        keywords: plugin.metadata.keywords,
        skills: plugin.metadata.components.skills,
        interface: {
          displayName: plugin.metadata.displayName,
          shortDescription: plugin.metadata.platforms.codex.shortDescription,
          longDescription: plugin.metadata.description,
          developerName: plugin.metadata.author.name,
          category: plugin.metadata.platforms.codex.category,
          websiteURL: plugin.metadata.repository,
          defaultPrompt: plugin.metadata.platforms.codex.defaultPrompt,
        },
      },
    );
  }

  const expectedAllPaths = new Set([
    ...expected.keys(),
    CLAUDE_MARKETPLACE_PATH,
    ...contract.plugins.map(({ name }) =>
      path.posix.join("plugins", name, ".claude-plugin/plugin.json"),
    ),
  ]);
  if (!sameStringSet(outputs.keys(), expectedAllPaths)) {
    throw new Error(
      "Rendered marketplace output paths do not match the contract.",
    );
  }

  for (const [relativePath, expectedObject] of expected) {
    const text = outputs.get(relativePath);
    if (typeof text !== "string" || !text.endsWith("\n")) {
      throw new Error(
        `${relativePath} must be rendered with one final newline.`,
      );
    }
    if (text.endsWith("\n\n")) {
      throw new Error(
        `${relativePath} must contain exactly one final newline.`,
      );
    }

    const parsed = parseJsonText(text, relativePath);
    if (!isDeepStrictEqual(parsed, expectedObject)) {
      throw new Error(
        `${relativePath} does not match its Codex adapter contract.`,
      );
    }
  }
}

export async function compareGeneratedOutputs(repositoryRoot, outputs) {
  const root = path.resolve(repositoryRoot);
  const stalePaths = [];

  for (const [relativePath, expected] of sortedOutputEntries(outputs)) {
    const actual = await readFile(path.join(root, relativePath)).catch(
      (error) => {
        if (error.code === "ENOENT") {
          return null;
        }
        throw error;
      },
    );
    const expectedBuffer = toBuffer(expected, relativePath);

    if (actual === null || !actual.equals(expectedBuffer)) {
      stalePaths.push(relativePath);
    }
  }

  return stalePaths;
}

export async function writeOutputTransaction(
  repositoryRoot,
  outputs,
  { commitFailureAt = -1 } = {},
) {
  const root = path.resolve(repositoryRoot);
  const rootRealPath = await realpath(root);
  const entries = sortedOutputEntries(outputs);
  const transactionId = `${process.pid}-${randomUUID()}`;
  const staged = [];
  const createdDirectories = new Set();

  try {
    for (const [relativePath, value] of entries) {
      validateOutputRelativePath(relativePath);
      const targetPath = path.resolve(root, relativePath);
      assertContained(root, targetPath, relativePath);

      const existingStats = await lstat(targetPath).catch((error) => {
        if (error.code === "ENOENT") {
          return null;
        }
        throw error;
      });
      if (existingStats?.isSymbolicLink()) {
        throw new Error(
          `Generated target ${relativePath} must not be a symlink.`,
        );
      }
      if (existingStats && !existingStats.isFile()) {
        throw new Error(`Generated target ${relativePath} must be a file.`);
      }

      const original = existingStats ? await readFile(targetPath) : null;
      const next = toBuffer(value, relativePath);
      if (original?.equals(next)) {
        continue;
      }

      const parentPath = path.dirname(targetPath);
      await createParentDirectories(root, parentPath, createdDirectories);
      const parentRealPath = await realpath(parentPath);
      assertContained(rootRealPath, parentRealPath, `${relativePath} parent`);

      const temporaryPath = path.join(
        parentPath,
        `.${path.basename(relativePath)}.axiom-${transactionId}.tmp`,
      );
      const stagedEntry = {
        relativePath,
        targetPath,
        temporaryPath,
        original,
        originalMode: existingStats?.mode,
      };
      staged.push(stagedEntry);
      await writeFile(temporaryPath, next, {
        flag: "wx",
        mode: existingStats ? existingStats.mode & 0o777 : 0o666,
      });
    }

    const committed = [];
    try {
      for (const [index, stagedEntry] of staged.entries()) {
        if (index === commitFailureAt) {
          throw new Error(`Injected commit failure at output index ${index}.`);
        }
        await rename(stagedEntry.temporaryPath, stagedEntry.targetPath);
        committed.push(stagedEntry);
      }
    } catch (commitError) {
      const rollbackErrors = await rollbackCommittedOutputs(
        committed,
        transactionId,
      );
      await cleanupTemporaryFiles(staged);
      await cleanupCreatedDirectories(createdDirectories);

      const rollbackSummary =
        rollbackErrors.length === 0
          ? "Rollback restored every replaced output."
          : `Rollback failures: ${rollbackErrors.join("; ")}`;
      throw new Error(
        `Output transaction failed: ${commitError.message} ${rollbackSummary}`,
      );
    }

    return staged.map(({ relativePath }) => relativePath);
  } catch (error) {
    await cleanupTemporaryFiles(staged);
    await cleanupCreatedDirectories(createdDirectories);
    throw error;
  }
}

function validateClaudePluginPlatform(value, sourcePath) {
  const objectPath = `${sourcePath}.platforms.claude`;
  const record = requirePlainObject(value, objectPath);
  requireExactKeys(record, ["catalogDescription", "category"], objectPath);
  requireNonBlankString(
    record.catalogDescription,
    `${objectPath}.catalogDescription`,
  );
  requireNonBlankString(record.category, `${objectPath}.category`);
}

function validateCodexPluginPlatform(value, sourcePath) {
  const objectPath = `${sourcePath}.platforms.codex`;
  const record = requirePlainObject(value, objectPath);
  requireExactKeys(
    record,
    ["category", "policy", "shortDescription", "defaultPrompt"],
    objectPath,
  );
  requireNonBlankString(record.category, `${objectPath}.category`);
  requireNonBlankString(
    record.shortDescription,
    `${objectPath}.shortDescription`,
  );
  validateStringArray(record.defaultPrompt, `${objectPath}.defaultPrompt`);

  const policyPath = `${objectPath}.policy`;
  const policy = requirePlainObject(record.policy, policyPath);
  requireExactKeys(policy, ["installation", "authentication"], policyPath);
  if (!INSTALLATION_POLICIES.has(policy.installation)) {
    throw new Error(`${policyPath}.installation has an unsupported value.`);
  }
  if (!AUTHENTICATION_POLICIES.has(policy.authentication)) {
    throw new Error(`${policyPath}.authentication has an unsupported value.`);
  }
}

function validateIdentity(value, objectPath) {
  const record = requirePlainObject(value, objectPath);
  requireExactKeys(record, ["name", "email"], objectPath);
  requireNonBlankString(record.name, `${objectPath}.name`);
  const email = requireNonBlankString(record.email, `${objectPath}.email`);
  if (!EMAIL.test(email)) {
    throw new Error(`${objectPath}.email must be a valid email address.`);
  }
}

function validateHttpsUrl(value, valuePath) {
  const text = requireNonBlankString(value, valuePath);
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    throw new Error(`${valuePath} must be an absolute HTTPS URL.`);
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.hostname === "" ||
    parsed.username !== "" ||
    parsed.password !== ""
  ) {
    throw new Error(
      `${valuePath} must be an absolute HTTPS URL without credentials.`,
    );
  }
}

function validateStringArray(value, valuePath, { itemValidator } = {}) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${valuePath} must be a non-empty array.`);
  }

  const seen = new Set();
  for (const [index, item] of value.entries()) {
    const itemPath = `${valuePath}[${index}]`;
    const text = requireNonBlankString(item, itemPath);
    if (text !== text.trim()) {
      throw new Error(`${itemPath} must not have surrounding whitespace.`);
    }
    if (seen.has(text)) {
      throw new Error(
        `${valuePath} must not contain duplicate value "${text}".`,
      );
    }
    seen.add(text);
    itemValidator?.(text, itemPath);
  }
}

function validateComponentPath(value, valuePath) {
  const componentPath = requireNonBlankString(value, valuePath);
  if (!componentPath.startsWith("./")) {
    throw new Error(`${valuePath} must start with "./".`);
  }
  if (componentPath.includes("\\")) {
    throw new Error(`${valuePath} must use forward slashes.`);
  }

  const withoutPrefix = componentPath.slice(2);
  const normalized = path.posix.normalize(withoutPrefix);
  if (
    withoutPrefix === "" ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    path.posix.isAbsolute(normalized)
  ) {
    throw new Error(`${valuePath} must stay inside the plugin root.`);
  }
}

async function validatePluginFilesystem({
  pluginName,
  pluginRoot,
  pluginRootRealPath,
  metadata,
}) {
  const skillsPath = path.resolve(pluginRoot, metadata.components.skills);
  assertContained(pluginRoot, skillsPath, `plugins/${pluginName} skills path`);
  const skillsRealPath = await realpath(skillsPath).catch((error) => {
    throw new Error(
      `plugins/${pluginName}/skills must exist and be readable: ${error.message}`,
    );
  });
  assertContained(
    pluginRootRealPath,
    skillsRealPath,
    `plugins/${pluginName} canonical skills path`,
  );

  const entries = await readdir(skillsPath, { withFileTypes: true });
  const skillNames = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const entryPath = path.join(skillsPath, entry.name);
    const entryStats = entry.isSymbolicLink() ? await stat(entryPath) : null;
    if (!entry.isDirectory() && !entryStats?.isDirectory()) {
      throw new Error(
        `plugins/${pluginName}/skills/${entry.name} must be a directory-format skill.`,
      );
    }
    if (!KEBAB_CASE.test(entry.name)) {
      throw new Error(
        `plugins/${pluginName}/skills/${entry.name} must be lowercase kebab-case.`,
      );
    }

    const entryRealPath = await realpath(entryPath);
    assertContained(
      pluginRootRealPath,
      entryRealPath,
      `plugins/${pluginName}/skills/${entry.name}`,
    );
    const skillFile = path.join(entryPath, "SKILL.md");
    const skillStats = await stat(skillFile).catch((error) => {
      throw new Error(
        `plugins/${pluginName}/skills/${entry.name}/SKILL.md must exist: ${error.message}`,
      );
    });
    if (!skillStats.isFile()) {
      throw new Error(
        `plugins/${pluginName}/skills/${entry.name}/SKILL.md must be a file.`,
      );
    }
    skillNames.push(entry.name);
  }

  if (skillNames.length === 0) {
    throw new Error(
      `plugins/${pluginName}/skills must contain at least one skill.`,
    );
  }
}

async function listPluginDirectories(pluginsRoot) {
  const entries = await readdir(pluginsRoot, { withFileTypes: true });
  const names = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const entryPath = path.join(pluginsRoot, entry.name);
    const entryStats = entry.isSymbolicLink() ? await stat(entryPath) : null;
    if (entry.isDirectory() || entryStats?.isDirectory()) {
      names.push(entry.name);
    }
  }
  return names.sort();
}

async function throwUnregisteredDirectoryError(root, pluginNames) {
  const messages = [];
  for (const pluginName of pluginNames) {
    const generatedPaths = [
      path.posix.join("plugins", pluginName, ".claude-plugin/plugin.json"),
      path.posix.join("plugins", pluginName, ".codex-plugin/plugin.json"),
    ];
    const existingGeneratedPaths = [];
    for (const generatedPath of generatedPaths) {
      if (await pathExists(path.join(root, generatedPath))) {
        existingGeneratedPaths.push(generatedPath);
      }
    }

    if (existingGeneratedPaths.length > 0) {
      messages.push(
        `Unregistered plugin directory plugins/${pluginName} contains generated artifact ${existingGeneratedPaths.join(
          ", ",
        )}. Register it in ${CANONICAL_MARKETPLACE_PATH}, or remove the obsolete artifact and plugin directory manually after confirming removal.`,
      );
    } else {
      messages.push(
        `Plugin directory plugins/${pluginName} is not registered in ${CANONICAL_MARKETPLACE_PATH}.`,
      );
    }
  }
  throw new Error(messages.join(" "));
}

async function readJson(filePath, root) {
  const relativePath = path.relative(root, filePath) || path.basename(filePath);
  const text = await readFile(filePath, "utf8").catch((error) => {
    throw new Error(
      `${relativePath} must exist and be readable: ${error.message}`,
    );
  });
  return parseJsonText(text, relativePath);
}

function parseJsonText(text, sourcePath) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${sourcePath} is not valid JSON: ${error.message}`);
  }
}

function requirePlainObject(value, valuePath) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${valuePath} must be an object.`);
  }
  return value;
}

function requireExactKeys(value, expectedKeys, valuePath) {
  const missing = expectedKeys.filter((key) => !Object.hasOwn(value, key));
  const expected = new Set(expectedKeys);
  const unknown = Object.keys(value)
    .filter((key) => !expected.has(key))
    .sort();

  if (missing.length > 0) {
    throw new Error(
      `${valuePath} is missing required field ${missing.join(", ")}.`,
    );
  }
  if (unknown.length > 0) {
    throw new Error(
      `${valuePath} contains unknown field ${unknown.join(", ")}.`,
    );
  }
}

function requireSchemaVersion(value, valuePath) {
  if (!Number.isInteger(value) || value !== 1) {
    throw new Error(`${valuePath}.schemaVersion must be integer 1.`);
  }
}

function requireNonBlankString(value, valuePath) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${valuePath} must be a non-blank string.`);
  }
  return value;
}

function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sameStringSet(leftIterable, rightIterable) {
  const left = [...leftIterable].sort();
  const right = [...rightIterable].sort();
  return isDeepStrictEqual(left, right);
}

function sortedOutputEntries(outputs) {
  if (!(outputs instanceof Map)) {
    throw new Error("Generated outputs must be provided as a Map.");
  }
  return [...outputs.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
}

function toBuffer(value, relativePath) {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (typeof value === "string") {
    return Buffer.from(value);
  }
  throw new Error(`${relativePath} output must be a string or Buffer.`);
}

function validateOutputRelativePath(relativePath) {
  if (
    typeof relativePath !== "string" ||
    relativePath === "" ||
    path.isAbsolute(relativePath) ||
    relativePath.includes("\\")
  ) {
    throw new Error(`Invalid generated output path: ${relativePath}`);
  }

  const normalized = path.posix.normalize(relativePath);
  if (normalized !== relativePath || normalized.startsWith("../")) {
    throw new Error(
      `Generated output path escapes the repository: ${relativePath}`,
    );
  }
}

function assertContained(parentPath, candidatePath, description) {
  const relative = path.relative(parentPath, candidatePath);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`${description} must resolve inside ${parentPath}.`);
  }
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function createParentDirectories(root, parentPath, createdDirectories) {
  const missing = [];
  let cursor = parentPath;
  while (cursor !== root && !(await pathExists(cursor))) {
    missing.push(cursor);
    cursor = path.dirname(cursor);
  }
  assertContained(root, parentPath, `${parentPath} parent`);
  await mkdir(parentPath, { recursive: true });
  for (const directory of missing) {
    createdDirectories.add(directory);
  }
}

async function rollbackCommittedOutputs(committed, transactionId) {
  const errors = [];
  for (const entry of [...committed].reverse()) {
    try {
      if (entry.original === null) {
        await unlink(entry.targetPath);
        continue;
      }

      const rollbackPath = `${entry.targetPath}.axiom-${transactionId}.rollback`;
      await writeFile(rollbackPath, entry.original, {
        flag: "wx",
        mode: entry.originalMode & 0o777,
      });
      await rename(rollbackPath, entry.targetPath);
    } catch (error) {
      errors.push(`${entry.relativePath}: ${error.message}`);
    }
  }
  return errors;
}

async function cleanupTemporaryFiles(staged) {
  for (const { temporaryPath } of staged) {
    await unlink(temporaryPath).catch((error) => {
      if (error.code !== "ENOENT") {
        throw error;
      }
    });
  }
}

async function cleanupCreatedDirectories(createdDirectories) {
  const directories = [...createdDirectories].sort(
    (left, right) => right.length - left.length,
  );
  for (const directory of directories) {
    await rmdir(directory).catch((error) => {
      if (error.code !== "ENOENT" && error.code !== "ENOTEMPTY") {
        throw error;
      }
    });
  }
}
