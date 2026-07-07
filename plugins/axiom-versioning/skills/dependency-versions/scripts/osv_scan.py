#!/usr/bin/env python3
# pyright: strict
"""Batch dependency vulnerability lookup against the OSV.dev database.

Why this exists: the security step of the dependency-versions skill used to be one
WebSearch per package for "<name> CVE". That is slow, non-deterministic, and easy
to get wrong (the model has to judge search snippets). OSV.dev is the authoritative,
free, key-less aggregator of GHSA / PYSEC / CVE / Go / RustSec advisories. One HTTP
call checks every dependency at once, and the answer is a hard yes/no per package
instead of a vibe read of search results.

This script is the deterministic first pass. It is NOT a replacement for judgement:
- Packages it flags -> confirm real-world impact by reading the linked advisory.
- Packages/ecosystems it can't cover, or a network failure -> fall back to the
  skill's existing WebSearch method. The script says so explicitly on stderr.

Coverage note: OSV includes a "GitHub Actions" ecosystem, so this covers the
skill's most common case (action pinning / supply-chain) in addition to npm, PyPI,
Go, crates.io, Maven, RubyGems, NuGet, Packagist, and more.

Usage:
    osv_scan.py npm:lodash@4.17.15 pypi:requests@2.19.1 "gha:tj-actions/changed-files@v44"
    osv_scan.py --json deps.json            # [{"ecosystem","name","version"}, ...]
    cat deps.json | osv_scan.py --json -
    osv_scan.py --format json npm:minimist@1.2.5

Spec: ecosystem:name[@version]
- Omit @version to get ALL known advisories for the package (any version).
- Scoped npm ("npm:@babel/core@7.0.0") and slashed actions
  ("gha:tj-actions/changed-files@v44") are parsed correctly: the version is split
  at the LAST '@' only when it is not the leading scope '@'.

Exit codes: 0 = ran successfully (read stdout for findings), 2 = usage error,
3 = OSV unreachable -> fall back to WebSearch. Vulnerability presence is reported
on stdout ("RESULT: ..."), never via a nonzero exit, so a clean scan and a
crash are never confused.

Dependencies: Python 3 standard library only. No API key. No pip installs.
"""

import argparse
import json
import sys
import time
import urllib.request
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from types import TracebackType
from typing import Final, Literal, Optional, Protocol, TypedDict, cast

OSV_QUERYBATCH: Final[str] = "https://api.osv.dev/v1/querybatch"
OSV_VULN: Final[str] = "https://api.osv.dev/v1/vulns/"
TIMEOUT: Final[int] = 25
GITHUB_ACTIONS: Final[str] = "GitHub Actions"
# Cap advisories hydrated/printed per package. The batch call still counts them
# all; this just keeps a no-version query on a huge package (e.g. django has 300+
# advisories) from firing hundreds of sequential detail fetches.
MAX_DETAIL: Final[int] = 30

# Accept casual ecosystem spellings and normalize to OSV's canonical strings
# (https://ossf.github.io/osv-schema/#defined-ecosystems) so the model never has
# to remember exact casing like "crates.io" or "GitHub Actions".
ECOSYSTEM_ALIASES: Final[dict[str, str]] = {
    "npm": "npm",
    "node": "npm",
    "pypi": "PyPI",
    "pip": "PyPI",
    "python": "PyPI",
    "gha": "GitHub Actions",
    "actions": "GitHub Actions",
    "github-actions": "GitHub Actions",
    "githubactions": "GitHub Actions",
    "go": "Go",
    "golang": "Go",
    "cargo": "crates.io",
    "crates": "crates.io",
    "crates.io": "crates.io",
    "rust": "crates.io",
    "maven": "Maven",
    "gradle": "Maven",
    "gem": "RubyGems",
    "rubygems": "RubyGems",
    "ruby": "RubyGems",
    "nuget": "NuGet",
    "composer": "Packagist",
    "packagist": "Packagist",
    "php": "Packagist",
    "hex": "Hex",
    "pub": "Pub",
    "dart": "Pub",
    "swift": "SwiftURL",
    "conan": "ConanCenter",
    "bioconductor": "Bioconductor",
    "cran": "CRAN",
    "hackage": "Hackage",
}


AffectedRange = tuple[Optional[str], Optional[str]]
OutputFormat = Literal["human", "json"]
ScanStatus = Literal["clean", "review", "vulnerable"]


class _DependencyEntryBase(TypedDict):
    """Required fields for a dependency query."""

    ecosystem: str
    name: str


class DependencyEntry(_DependencyEntryBase, total=False):
    """Dependency query input accepted by OSV.dev."""

    version: str


class Finding(TypedDict):
    """Hydrated advisory fields emitted in the scan report."""

    id: str
    cves: list[str]
    severity: str
    summary: str
    ranges: list[AffectedRange]


class ReportRow(TypedDict):
    """Per-package scan result emitted by ``scan``."""

    package: DependencyEntry
    requested_version: Optional[str]
    auto_version_match: bool
    status: ScanStatus
    total_advisories: int
    shown: int
    findings: list[Finding]


class _DependencyArgs(Protocol):
    """Argument shape needed by ``load_entries``."""

    @property
    def specs(self) -> Sequence[str]: ...

    @property
    def json(self) -> Optional[str]: ...


class _UrlResponse(Protocol):
    """Subset of ``urllib`` response behavior used by ``http_json``."""

    def read(self, amt: int = -1) -> bytes: ...

    def __enter__(self) -> "_UrlResponse": ...

    def __exit__(
        self,
        exc_type: Optional[type[BaseException]],
        exc_value: Optional[BaseException],
        traceback: Optional[TracebackType],
    ) -> Optional[bool]: ...


@dataclass(frozen=True)
class _CliArgs:
    """Validated CLI arguments."""

    specs: list[str]
    json: Optional[str]
    format: OutputFormat


def canonical_ecosystem(raw: str) -> str:
    """Normalize a user-supplied ecosystem name to OSV's canonical spelling.

    Args:
        raw: Ecosystem label from CLI or JSON input.

    Returns:
        The canonical OSV ecosystem name for known aliases; otherwise the
        stripped input value.
    """
    stripped = raw.strip()
    return ECOSYSTEM_ALIASES.get(stripped.lower(), stripped)


def parse_spec(spec: str) -> DependencyEntry:
    """Parse one CLI dependency spec.

    Args:
        spec: Dependency spec in ``ecosystem:name[@version]`` form.

    Returns:
        A normalized dependency entry suitable for the OSV query API.

    Raises:
        ValueError: If the spec is missing an ecosystem, package name, or
            version after an explicit ``@`` delimiter.
    """
    if ":" not in spec:
        raise ValueError("missing ecosystem (want ecosystem:name[@version]): %r" % spec)

    ecosystem_raw, remainder = spec.split(":", 1)
    remainder = remainder.strip()
    if not ecosystem_raw.strip() or not remainder:
        raise ValueError("empty ecosystem or name: %r" % spec)

    version_index = remainder.rfind("@")
    # at > 0 means a real version delimiter; at == 0 is a leading npm scope.
    if version_index > 0:
        name = remainder[:version_index]
        version = remainder[version_index + 1 :]
        if not version:
            raise ValueError("empty version after @ in dependency spec: %r" % spec)
    else:
        name = remainder
        version = None

    entry: DependencyEntry = {
        "ecosystem": canonical_ecosystem(ecosystem_raw),
        "name": name,
    }
    if version:
        entry["version"] = version
    return entry


def load_entries(args: _DependencyArgs) -> list[DependencyEntry]:
    """Load dependency entries from JSON input and positional CLI specs.

    Args:
        args: Object with ``json`` and ``specs`` attributes, normally
            ``_CliArgs``.

    Returns:
        Dependency entries in input order.

    Raises:
        json.JSONDecodeError: If ``--json`` input is not valid JSON.
        OSError: If a JSON file path cannot be read.
        TypeError: If decoded JSON has the wrong shape or value types.
        ValueError: If a positional spec is malformed.
    """
    entries: list[DependencyEntry] = []
    json_path = args.json

    if json_path:
        raw = sys.stdin.read() if json_path == "-" else _read_text(json_path)
        decoded: object = json.loads(raw)
        entries.extend(_entries_from_json(decoded))

    for spec in args.specs:
        entries.append(parse_spec(spec))

    return entries


def http_json(url: str, payload: object = None) -> object:
    """Fetch JSON over HTTP with one retry for transient I/O failures.

    Args:
        url: Endpoint URL to fetch.
        payload: JSON-serializable request body. When present, the request is a
            POST; when omitted, the request is a GET.

    Returns:
        Decoded JSON as ``object`` so callers must validate the shape they need.

    Raises:
        ConnectionError: If both HTTP attempts fail before a response is decoded.
        TypeError: If ``payload`` is not JSON-serializable.
        ValueError: If the response body is not valid JSON.
    """
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    last_error: Optional[OSError] = None

    for attempt in range(2):
        try:
            request = urllib.request.Request(
                url,
                data=data,
                headers=headers,
                method="POST" if data is not None else "GET",
            )
            response_context = cast(
                _UrlResponse,
                urllib.request.urlopen(request, timeout=TIMEOUT),
            )
            with response_context as response:
                response_text = response.read().decode("utf-8")
            decoded: object = json.loads(response_text)
            return decoded
        except OSError as exc:
            last_error = exc
            if attempt == 0:
                time.sleep(1.5)

    raise ConnectionError(str(last_error))


def cve_aliases(vuln: Mapping[str, object]) -> list[str]:
    """Extract CVE aliases from a hydrated OSV vulnerability object.

    Args:
        vuln: Hydrated OSV vulnerability object.

    Returns:
        CVE aliases in the order OSV provided them. Non-string aliases and
        non-CVE aliases are ignored.
    """
    aliases_value = vuln.get("aliases", [])
    if not isinstance(aliases_value, list):
        return []
    aliases_items = cast(list[object], aliases_value)

    aliases: list[str] = []
    for alias in aliases_items:
        if isinstance(alias, str) and alias.upper().startswith("CVE-"):
            aliases.append(alias)
    return aliases


def severity_label(vuln: Mapping[str, object]) -> str:
    """Return the best available severity label for an OSV vulnerability.

    Args:
        vuln: Hydrated OSV vulnerability object.

    Returns:
        OSV database-specific severity, a CVSS score/vector fallback, or
        ``"unknown"`` when no severity is present.
    """
    database_specific = _optional_mapping(vuln.get("database_specific"))
    if database_specific is not None:
        severity = database_specific.get("severity")
        if severity:
            return str(severity)

    for severity_item in _mapping_items(vuln.get("severity", [])):
        score = severity_item.get("score")
        if score:
            return str(score)  # CVSS vector as a fallback

    return "unknown"


def affected_ranges(
    vuln: Mapping[str, object],
    entry: DependencyEntry,
) -> list[AffectedRange]:
    """Return affected version ranges for one advisory and package.

    Callers use this to decide whether a specific pin sits inside an affected
    window - essential for GitHub Actions, where OSV won't range-match tags for us.

    Args:
        vuln: Hydrated OSV vulnerability object.
        entry: Dependency entry whose package/ecosystem should be matched.

    Returns:
        ``(introduced, fixed_or_last_affected)`` tuples for matching affected
        package ranges. ``None`` means OSV did not provide that range endpoint.
    """
    ranges: list[AffectedRange] = []

    for affected in _mapping_items(vuln.get("affected", [])):
        package = _optional_mapping(affected.get("package"))
        if package is None or not _matches_entry(package, entry):
            continue

        for range_object in _mapping_items(affected.get("ranges", [])):
            ranges.extend(_ranges_from_events(range_object.get("events", [])))

    return ranges


def hydrate(vuln_ids: Iterable[str]) -> dict[str, Mapping[str, object]]:
    """Fetch full details for advisory IDs, deduplicating within this run.

    Args:
        vuln_ids: Advisory IDs from OSV querybatch results.

    Returns:
        Mapping from advisory ID to hydrated OSV vulnerability data. Detail fetch
        failures are represented with a small fallback object so the summary
        report can still show the advisory ID.
    """
    details: dict[str, Mapping[str, object]] = {}

    for vuln_id in vuln_ids:
        if vuln_id in details:
            continue

        try:
            details[vuln_id] = _required_mapping(
                http_json("%s%s" % (OSV_VULN, vuln_id)),
                "OSV detail for %s" % vuln_id,
            )
        except (ConnectionError, ValueError):
            details[vuln_id] = {"id": vuln_id, "summary": "(detail fetch failed)"}

    return details


def scan(entries: Sequence[DependencyEntry]) -> list[ReportRow]:
    """Scan dependency entries against OSV.dev.

    Args:
        entries: Normalized dependencies to query.

    Returns:
        Report rows in the same order as ``entries``.

    Raises:
        ConnectionError: If the batch OSV request fails.
        TypeError: If OSV data contains an unexpected value type.
        ValueError: If OSV data has an unexpected response shape.
    """
    queries = [_query_for_entry(entry) for entry in entries]
    response = _required_mapping(
        http_json(OSV_QUERYBATCH, {"queries": queries}),
        "OSV querybatch",
    )
    results = _required_mapping_items(response.get("results"), "OSV querybatch results")
    if len(results) != len(entries):
        raise ValueError(
            "OSV querybatch returned %d result(s) for %d query(ies)"
            % (len(results), len(entries))
        )
    details = _hydrate_details_for_results(results)

    return [
        _report_row(entry, result, details) for entry, result in zip(entries, results)
    ]


def print_human(report: Sequence[ReportRow]) -> None:
    """Print a human-readable scan report.

    Args:
        report: Rows returned by ``scan``.
    """
    flagged = 0

    for row in report:
        label = _package_label(row)
        if row["status"] == "clean":
            print("[CLEAN]      %s" % label)
            continue

        flagged += 1
        _print_flagged_row(row, label)

    print("")
    print(
        "RESULT: %d of %d package(s) have advisories in OSV.dev."
        % (flagged, len(report))
    )
    if flagged:
        print(
            "NEXT: open each advisory (https://osv.dev/vulnerability/<ID>) and confirm it "
            "affects your pinned version/usage before reporting it. For [REVIEW] (GitHub "
            "Actions) compare your pinned tag against the affected range shown."
        )


def main(argv: Optional[Sequence[str]] = None) -> int:
    """Run the CLI.

    Args:
        argv: Optional argument vector excluding the program name. ``None`` uses
            ``sys.argv`` through ``argparse``.

    Returns:
        Process exit code: 0 for a completed scan, 2 for usage errors, and 3
        when OSV cannot be trusted for this run.
    """
    args = _parse_args(argv)

    try:
        entries = load_entries(args)
    except (ValueError, KeyError, TypeError, OSError) as exc:
        print("usage error: %s" % exc, file=sys.stderr)
        return 2
    if not entries:
        print(
            "usage error: no dependencies given. Pass ecosystem:name[@version] "
            "specs or --json FILE.",
            file=sys.stderr,
        )
        return 2

    try:
        report = scan(entries)
    except (ConnectionError, ValueError, TypeError, KeyError) as exc:
        print(
            "OSV.dev unreachable or returned invalid data (%s). FALL BACK to the "
            "skill's WebSearch security method for these dependencies; do not "
            "report them as clean." % exc,
            file=sys.stderr,
        )
        return 3

    if args.format == "json":
        print(json.dumps(report, indent=2))
    else:
        print_human(report)
    return 0


def _parse_args(argv: Optional[Sequence[str]]) -> _CliArgs:
    """Parse and validate command-line arguments.

    Args:
        argv: Optional argument vector excluding the program name.

    Returns:
        Validated CLI arguments.

    Raises:
        TypeError: If ``argparse`` produces an unexpected value shape.
    """
    parser = argparse.ArgumentParser(
        description="Batch-check dependencies against OSV.dev."
    )
    parser.add_argument(
        "specs", nargs="*", help="ecosystem:name[@version] (e.g. npm:lodash@4.17.15)"
    )
    parser.add_argument(
        "--json",
        metavar="FILE",
        help="read [{ecosystem,name,version}] from FILE or - for stdin",
    )
    parser.add_argument("--format", choices=["human", "json"], default="human")

    namespace = parser.parse_args(None if argv is None else list(argv))
    return _CliArgs(
        specs=_namespace_specs(namespace),
        json=_namespace_json_path(namespace),
        format=_namespace_output_format(namespace),
    )


def _namespace_specs(namespace: argparse.Namespace) -> list[str]:
    """Extract positional specs from an argparse namespace.

    Args:
        namespace: Parsed argparse namespace.

    Returns:
        Positional dependency specs.

    Raises:
        TypeError: If the parsed value is not a list of strings.
    """
    specs_value: object = getattr(namespace, "specs")
    if not isinstance(specs_value, list):
        raise TypeError("argparse returned non-list specs")
    specs_items = cast(list[object], specs_value)

    specs: list[str] = []
    for spec in specs_items:
        if not isinstance(spec, str):
            raise TypeError("argparse returned a non-string spec")
        specs.append(spec)
    return specs


def _namespace_json_path(namespace: argparse.Namespace) -> Optional[str]:
    """Extract the optional JSON input path from an argparse namespace.

    Args:
        namespace: Parsed argparse namespace.

    Returns:
        File path, ``"-"`` for stdin, or ``None``.

    Raises:
        TypeError: If the parsed value is not ``None`` or a string.
    """
    json_value: object = getattr(namespace, "json")
    if json_value is None:
        return None
    if not isinstance(json_value, str):
        raise TypeError("argparse returned a non-string JSON path")
    return json_value


def _namespace_output_format(namespace: argparse.Namespace) -> OutputFormat:
    """Extract the output format from an argparse namespace.

    Args:
        namespace: Parsed argparse namespace.

    Returns:
        Requested output format.

    Raises:
        TypeError: If the parsed value is not one of the supported formats.
    """
    format_value: object = getattr(namespace, "format")
    if format_value == "human":
        return "human"
    if format_value == "json":
        return "json"
    raise TypeError("argparse returned an invalid output format")


def _read_text(path: str) -> str:
    """Read a UTF-8 text file.

    Args:
        path: File path to read.

    Returns:
        File contents decoded as UTF-8.

    Raises:
        OSError: If the path cannot be read.
        UnicodeDecodeError: If the file is not valid UTF-8.
    """
    return Path(path).read_text(encoding="utf-8")


def _entries_from_json(decoded: object) -> list[DependencyEntry]:
    """Convert decoded JSON into dependency entries.

    Args:
        decoded: JSON value decoded from ``--json`` input.

    Returns:
        Normalized dependency entries.

    Raises:
        TypeError: If the JSON root or any item has an unexpected type.
        ValueError: If a required dependency field is missing.
    """
    if not isinstance(decoded, list):
        raise TypeError("JSON input must be a list of dependency objects")
    decoded_items = cast(list[object], decoded)

    entries: list[DependencyEntry] = []
    for index, item in enumerate(decoded_items):
        if not isinstance(item, Mapping):
            raise TypeError("JSON dependency at index %d must be an object" % index)
        mapping = cast(Mapping[object, object], item)
        entries.append(_entry_from_json_mapping(mapping, index))
    return entries


def _entry_from_json_mapping(
    item: Mapping[object, object],
    index: int,
) -> DependencyEntry:
    """Convert one JSON dependency object into a normalized entry.

    Args:
        item: JSON dependency object.
        index: Position in the input array, used for diagnostics.

    Returns:
        Normalized dependency entry.

    Raises:
        TypeError: If required fields are not strings.
        ValueError: If a required field is missing.
    """
    entry: DependencyEntry = {
        "ecosystem": canonical_ecosystem(_required_string(item, "ecosystem", index)),
        "name": _required_string(item, "name", index),
    }

    version = item.get("version")
    if version is not None:
        if not isinstance(version, str):
            raise TypeError(
                "JSON dependency at index %d has non-string 'version'" % index
            )
        if version:
            entry["version"] = version
    return entry


def _required_string(
    item: Mapping[object, object],
    key: str,
    index: int,
) -> str:
    """Read a required string field from a JSON dependency object.

    Args:
        item: JSON dependency object.
        key: Field name to read.
        index: Position in the input array, used for diagnostics.

    Returns:
        The requested string field value.

    Raises:
        TypeError: If the field exists but is not a string.
        ValueError: If the field is missing.
    """
    if key not in item:
        raise ValueError("JSON dependency at index %d is missing %r" % (index, key))
    value = item[key]
    if not isinstance(value, str):
        raise TypeError("JSON dependency at index %d has non-string %r" % (index, key))
    return value


def _required_mapping(value: object, context: str) -> Mapping[str, object]:
    """Validate that a JSON value is an object with string keys.

    Args:
        value: Candidate JSON value.
        context: Human-readable response context for diagnostics.

    Returns:
        Mapping with string keys.

    Raises:
        ValueError: If ``value`` is not an object or contains non-string keys.
    """
    mapping = _optional_mapping(value)
    if mapping is None:
        raise ValueError("%s response was not a JSON object" % context)
    return mapping


def _optional_mapping(value: object) -> Optional[Mapping[str, object]]:
    """Return a string-keyed mapping when ``value`` is a JSON object.

    Args:
        value: Candidate JSON value.

    Returns:
        String-keyed mapping, or ``None`` when ``value`` is not a mapping.

    Raises:
        ValueError: If a mapping contains non-string keys.
    """
    if not isinstance(value, Mapping):
        return None

    mapping = cast(Mapping[object, object], value)
    output: dict[str, object] = {}
    for key, item in mapping.items():
        if not isinstance(key, str):
            raise ValueError("JSON object contained a non-string key")
        output[key] = item
    return output


def _required_mapping_items(value: object, context: str) -> list[Mapping[str, object]]:
    """Validate a JSON array of objects.

    Args:
        value: Candidate JSON array.
        context: Human-readable response context for diagnostics.

    Returns:
        List of string-keyed mappings.

    Raises:
        ValueError: If ``value`` is not an array of objects.
    """
    if not isinstance(value, list):
        raise ValueError("%s was not a JSON array" % context)
    value_items = cast(list[object], value)

    items: list[Mapping[str, object]] = []
    for index, item in enumerate(value_items):
        mapping = _optional_mapping(item)
        if mapping is None:
            raise ValueError("%s item %d was not a JSON object" % (context, index))
        items.append(mapping)
    return items


def _mapping_items(value: object) -> list[Mapping[str, object]]:
    """Return object items from a JSON array, ignoring malformed item shapes.

    Args:
        value: Candidate JSON array.

    Returns:
        String-keyed mappings for each object item, or an empty list if the value
        is not a list.

    Raises:
        ValueError: If an object item contains non-string keys.
    """
    if not isinstance(value, list):
        return []
    value_items = cast(list[object], value)

    items: list[Mapping[str, object]] = []
    for item in value_items:
        mapping = _optional_mapping(item)
        if mapping is not None:
            items.append(mapping)
    return items


def _query_for_entry(entry: DependencyEntry) -> dict[str, object]:
    """Build one OSV query object from a dependency entry.

    Args:
        entry: Dependency entry to query.

    Returns:
        OSV query object. GitHub Actions queries intentionally omit version so
        OSV cannot falsely mark a tag pin as clean.
    """
    query: dict[str, object] = {
        "package": {"ecosystem": entry["ecosystem"], "name": entry["name"]},
    }
    version = entry.get("version")
    # GitHub Actions: OSV keys advisories on release semver and won't range-match
    # a pinned tag (e.g. "v44"), so a versioned query returns a false CLEAN.
    # Query the action package-level and let the caller compare the pin against
    # each advisory's range instead.
    if version is not None and entry["ecosystem"] != GITHUB_ACTIONS:
        query["version"] = version
    return query


def _vuln_summaries(result: Mapping[str, object]) -> list[Mapping[str, object]]:
    """Extract vulnerability summary objects from a querybatch result.

    Args:
        result: One OSV querybatch result object.

    Returns:
        Vulnerability summary mappings. Missing or malformed ``vulns`` values
        are treated as no advisories.
    """
    return _mapping_items(result.get("vulns", []))


def _hydrate_details_for_results(
    results: Sequence[Mapping[str, object]],
) -> dict[str, Mapping[str, object]]:
    """Hydrate vulnerability summaries from querybatch results.

    Args:
        results: OSV querybatch result objects.

    Returns:
        Detail mapping keyed by advisory ID.

    Raises:
        TypeError: If an advisory summary has a non-string ID.
        KeyError: If an advisory summary lacks an ID.
    """
    to_hydrate: list[str] = []
    for result in results:
        to_hydrate.extend(
            _vulnerability_id(vuln) for vuln in _vuln_summaries(result)[:MAX_DETAIL]
        )
    return hydrate(to_hydrate)


def _report_row(
    entry: DependencyEntry,
    result: Mapping[str, object],
    details: Mapping[str, Mapping[str, object]],
) -> ReportRow:
    """Build one report row from a querybatch result.

    Args:
        entry: Dependency entry that produced the result.
        result: OSV querybatch result object.
        details: Hydrated vulnerability details keyed by advisory ID.

    Returns:
        Report row for human or JSON output.

    Raises:
        TypeError: If an advisory summary has a non-string ID.
        KeyError: If an advisory summary lacks an ID.
    """
    vulns = _vuln_summaries(result)
    findings = [
        _finding_for_summary(vuln_summary, details, entry)
        for vuln_summary in vulns[:MAX_DETAIL]
    ]
    is_gha = entry["ecosystem"] == GITHUB_ACTIONS

    return {
        "package": entry,
        "requested_version": entry.get("version"),
        "auto_version_match": not is_gha,
        "status": _status_for_entry(is_gha, vulns),
        "total_advisories": len(vulns),
        "shown": len(findings),
        "findings": findings,
    }


def _vulnerability_id(vuln: Mapping[str, object]) -> str:
    """Read the string ID from an OSV vulnerability summary.

    Args:
        vuln: OSV vulnerability summary object.

    Returns:
        Advisory ID.

    Raises:
        KeyError: If the summary has no ``id`` field.
        TypeError: If the ``id`` field is not a string.
    """
    vuln_id = vuln["id"]
    if not isinstance(vuln_id, str):
        raise TypeError("OSV vulnerability id was not a string")
    return vuln_id


def _finding_for_summary(
    vuln_summary: Mapping[str, object],
    details: Mapping[str, Mapping[str, object]],
    entry: DependencyEntry,
) -> Finding:
    """Build a hydrated finding from one OSV vulnerability summary.

    Args:
        vuln_summary: Vulnerability summary from querybatch.
        details: Hydrated vulnerability details keyed by advisory ID.
        entry: Dependency entry used to extract matching affected ranges.

    Returns:
        Finding object for report output.

    Raises:
        KeyError: If the summary has no ``id`` field.
        TypeError: If the ``id`` field is not a string.
    """
    vuln_id = _vulnerability_id(vuln_summary)
    detail = details.get(vuln_id, {})
    return {
        "id": vuln_id,
        "cves": cve_aliases(detail),
        "severity": severity_label(detail),
        "summary": _summary_for_detail(detail),
        "ranges": affected_ranges(detail, entry),
    }


def _summary_for_detail(detail: Mapping[str, object]) -> str:
    """Choose a short display summary from hydrated advisory details.

    Args:
        detail: Hydrated OSV vulnerability detail object.

    Returns:
        Summary text, a truncated details fallback, or an empty string.
    """
    summary = detail.get("summary")
    if summary:
        return str(summary)

    details = detail.get("details")
    if details:
        return str(details)[:140]
    return ""


def _matches_entry(
    package: Mapping[str, object],
    entry: DependencyEntry,
) -> bool:
    """Check whether an OSV package object matches a dependency entry.

    Args:
        package: OSV ``affected[].package`` object.
        entry: Dependency entry being reported.

    Returns:
        ``True`` when package name and ecosystem both match exactly.
    """
    return (
        package.get("name") == entry["name"]
        and package.get("ecosystem") == entry["ecosystem"]
    )


def _ranges_from_events(events_value: object) -> list[AffectedRange]:
    """Convert OSV range events into printable affected range tuples.

    Args:
        events_value: OSV ``ranges[].events`` value.

    Returns:
        Affected range tuples in event order.
    """
    ranges: list[AffectedRange] = []
    introduced: Optional[str] = None

    for event in _mapping_items(events_value):
        if "introduced" in event:
            introduced = _string_or_none(event["introduced"])
        elif "fixed" in event:
            ranges.append((introduced, _string_or_none(event["fixed"])))
            introduced = None
        elif "last_affected" in event:
            ranges.append((introduced, "<= %s" % event["last_affected"]))
            introduced = None

    if introduced is not None:
        ranges.append((introduced, None))
    return ranges


def _string_or_none(value: object) -> Optional[str]:
    """Convert a JSON scalar to string while preserving ``None``.

    Args:
        value: JSON value to convert.

    Returns:
        ``None`` for ``None``; otherwise ``str(value)``.
    """
    if value is None:
        return None
    return str(value)


def _status_for_entry(
    is_gha: bool,
    vulns: Sequence[Mapping[str, object]],
) -> ScanStatus:
    """Choose the scan status for one dependency.

    Args:
        is_gha: Whether the entry is in OSV's GitHub Actions ecosystem.
        vulns: Vulnerability summaries returned by OSV.

    Returns:
        ``"clean"`` when no advisories exist, ``"review"`` for GitHub Actions
        advisories that need manual tag/range comparison, otherwise
        ``"vulnerable"``.
    """
    if not vulns:
        return "clean"
    if is_gha:
        return "review"
    return "vulnerable"


def _package_label(row: ReportRow) -> str:
    """Format a dependency label for human output.

    Args:
        row: Report row to label.

    Returns:
        Human-readable ``ecosystem:name[@version]`` label.
    """
    package = row["package"]
    label = "%s:%s" % (package["ecosystem"], package["name"])

    requested_version = row["requested_version"]
    if requested_version:
        label += "@%s" % requested_version
    elif not row["auto_version_match"]:
        label += " (all versions)"
    return label


def _print_flagged_row(row: ReportRow, label: str) -> None:
    """Print one non-clean human report row.

    Args:
        row: Report row whose status is not ``"clean"``.
        label: Preformatted package label for the row.
    """
    tag = "[VULNERABLE]" if row["status"] == "vulnerable" else "[REVIEW]    "
    note = ""
    if row["status"] == "review":
        note = "  (OSV can't auto-match GitHub Actions tags - compare your pin to each range)"

    print("%s %s  -> %d advisory(ies)%s" % (tag, label, row["total_advisories"], note))
    for finding in row["findings"]:
        _print_finding(finding)

    hidden = row["total_advisories"] - row["shown"]
    if hidden > 0:
        print(
            "        (+%d more advisory(ies) not shown; pass an exact version to narrow)"
            % hidden
        )


def _print_finding(finding: Finding) -> None:
    """Print one advisory finding in human format.

    Args:
        finding: Hydrated finding to print.
    """
    cve = (" / " + ", ".join(finding["cves"])) if finding["cves"] else ""
    print("    - %s%s  [%s]" % (finding["id"], cve, finding["severity"]))

    summary = finding["summary"]
    if summary:
        print("        %s" % summary.strip().splitlines()[0][:200])

    for introduced, fixed in finding["ranges"]:
        segments: list[str] = []
        if introduced not in (None, "0"):
            segments.append("introduced %s" % introduced)
        if fixed:
            segments.append("fixed %s" % fixed)
        if segments:
            print("        affected: %s" % ", ".join(segments))


if __name__ == "__main__":
    sys.exit(main())
