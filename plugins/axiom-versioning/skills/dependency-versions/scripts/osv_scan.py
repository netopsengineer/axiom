#!/usr/bin/env python3
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
import urllib.error
import urllib.request

OSV_QUERYBATCH = "https://api.osv.dev/v1/querybatch"
OSV_VULN = "https://api.osv.dev/v1/vulns/"
TIMEOUT = 25
GITHUB_ACTIONS = "GitHub Actions"
# Cap advisories hydrated/printed per package. The batch call still counts them
# all; this just keeps a no-version query on a huge package (e.g. django has 300+
# advisories) from firing hundreds of sequential detail fetches.
MAX_DETAIL = 30

# Accept casual ecosystem spellings and normalize to OSV's canonical strings
# (https://ossf.github.io/osv-schema/#defined-ecosystems) so the model never has
# to remember exact casing like "crates.io" or "GitHub Actions".
ECOSYSTEM_ALIASES = {
    "npm": "npm", "node": "npm",
    "pypi": "PyPI", "pip": "PyPI", "python": "PyPI",
    "gha": "GitHub Actions", "actions": "GitHub Actions",
    "github-actions": "GitHub Actions", "githubactions": "GitHub Actions",
    "go": "Go", "golang": "Go",
    "cargo": "crates.io", "crates": "crates.io", "crates.io": "crates.io", "rust": "crates.io",
    "maven": "Maven", "gradle": "Maven",
    "gem": "RubyGems", "rubygems": "RubyGems", "ruby": "RubyGems",
    "nuget": "NuGet",
    "composer": "Packagist", "packagist": "Packagist", "php": "Packagist",
    "hex": "Hex", "pub": "Pub", "dart": "Pub",
    "swift": "SwiftURL", "conan": "ConanCenter", "bioconductor": "Bioconductor",
    "cran": "CRAN", "hackage": "Hackage",
}


def canonical_ecosystem(raw):
    key = raw.strip().lower()
    return ECOSYSTEM_ALIASES.get(key, raw.strip())


def parse_spec(spec):
    """Turn 'ecosystem:name[@version]' into a dict, or raise ValueError."""
    if ":" not in spec:
        raise ValueError(
            "missing ecosystem (want ecosystem:name[@version]): %r" % spec)
    eco_raw, rest = spec.split(":", 1)
    rest = rest.strip()
    if not eco_raw.strip() or not rest:
        raise ValueError("empty ecosystem or name: %r" % spec)
    at = rest.rfind("@")
    # at > 0 means a real version delimiter; at == 0 is a leading npm scope.
    if at > 0:
        name, version = rest[:at], rest[at + 1:]
    else:
        name, version = rest, None
    entry = {"ecosystem": canonical_ecosystem(eco_raw), "name": name}
    if version:
        entry["version"] = version
    return entry


def load_entries(args):
    entries = []
    if args.json:
        raw = sys.stdin.read() if args.json == "-" else open(args.json).read()
        data = json.loads(raw)
        for item in data:
            entry = {"ecosystem": canonical_ecosystem(item["ecosystem"]),
                     "name": item["name"]}
            if item.get("version"):
                entry["version"] = str(item["version"])
            entries.append(entry)
    for spec in args.specs:
        entries.append(parse_spec(spec))
    return entries


def http_json(url, payload=None):
    """POST (payload) or GET (payload=None) JSON with one retry on transient error."""
    data = json.dumps(payload).encode() if payload is not None else None
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    last = None
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, data=data, headers=headers,
                                         method="POST" if data else "GET")
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                return json.loads(resp.read().decode())
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last = exc
            if attempt == 0:
                time.sleep(1.5)
    raise ConnectionError(str(last))


def cve_aliases(vuln):
    return [a for a in vuln.get("aliases", []) if a.upper().startswith("CVE-")]


def severity_label(vuln):
    db = vuln.get("database_specific", {}).get("severity")
    if db:
        return db
    for sev in vuln.get("severity", []):
        if sev.get("score"):
            return sev["score"]  # CVSS vector as a fallback
    return "unknown"


def affected_ranges(vuln, entry):
    """Return [(introduced, fixed_or_None)] for the matching package/ecosystem.

    Callers use this to decide whether a specific pin sits inside an affected
    window — essential for GitHub Actions, where OSV won't range-match tags for us.
    """
    out = []
    for aff in vuln.get("affected", []):
        pkg = aff.get("package", {})
        if pkg.get("name") != entry["name"] or pkg.get("ecosystem") != entry["ecosystem"]:
            continue
        for rng in aff.get("ranges", []):
            intro = None
            for ev in rng.get("events", []):
                if "introduced" in ev:
                    intro = ev["introduced"]
                elif "fixed" in ev:
                    out.append((intro, ev["fixed"]))
                    intro = None
                elif "last_affected" in ev:
                    out.append((intro, "<= %s" % ev["last_affected"]))
                    intro = None
            if intro is not None:
                out.append((intro, None))
    return out


def hydrate(vuln_ids):
    """Fetch full detail for each unique advisory id (dedup within this run)."""
    details = {}
    for vid in vuln_ids:
        if vid in details:
            continue
        try:
            details[vid] = http_json(OSV_VULN + vid)
        except ConnectionError:
            details[vid] = {"id": vid, "summary": "(detail fetch failed)"}
    return details


def scan(entries):
    queries = []
    for e in entries:
        q = {"package": {"ecosystem": e["ecosystem"], "name": e["name"]}}
        # GitHub Actions: OSV keys advisories on release semver and won't range-match
        # a pinned tag (e.g. "v44"), so a versioned query returns a false CLEAN.
        # Query the action package-level and let the caller compare the pin against
        # each advisory's range instead.
        if "version" in e and e["ecosystem"] != GITHUB_ACTIONS:
            q["version"] = e["version"]
        queries.append(q)
    resp = http_json(OSV_QUERYBATCH, {"queries": queries})
    results = resp.get("results", [])

    to_hydrate = []
    for res in results:
        to_hydrate.extend(v["id"] for v in res.get("vulns", [])[:MAX_DETAIL])
    details = hydrate(to_hydrate)

    report = []
    for entry, res in zip(entries, results):
        vulns = res.get("vulns", [])
        shown = vulns[:MAX_DETAIL]
        findings = []
        for v in shown:
            det = details.get(v["id"], {})
            findings.append({
                "id": v["id"],
                "cves": cve_aliases(det),
                "severity": severity_label(det),
                "summary": det.get("summary") or (det.get("details", "") or "")[:140],
                "ranges": affected_ranges(det, entry),
            })
        is_gha = entry["ecosystem"] == GITHUB_ACTIONS
        if not vulns:
            status = "clean"
        elif is_gha:
            status = "review"  # advisories exist; OSV can't confirm the pin is affected
        else:
            status = "vulnerable"
        report.append({
            "package": entry,
            "requested_version": entry.get("version"),
            "auto_version_match": not is_gha,
            "status": status,
            "total_advisories": len(vulns),
            "shown": len(shown),
            "findings": findings,
        })
    return report


def print_human(report):
    flagged = 0
    for row in report:
        pkg = row["package"]
        label = "%s:%s" % (pkg["ecosystem"], pkg["name"])
        if row["requested_version"]:
            label += "@%s" % row["requested_version"]
        elif not row["auto_version_match"]:
            label += " (all versions)"
        if row["status"] == "clean":
            print("[CLEAN]      %s" % label)
            continue
        flagged += 1
        tag = "[VULNERABLE]" if row["status"] == "vulnerable" else "[REVIEW]    "
        note = ""
        if row["status"] == "review":
            note = "  (OSV can't auto-match GitHub Actions tags — compare your pin to each range)"
        print("%s %s  -> %d advisory(ies)%s"
              % (tag, label, row["total_advisories"], note))
        for f in row["findings"]:
            cve = (" / " + ", ".join(f["cves"])) if f["cves"] else ""
            print("    - %s%s  [%s]" % (f["id"], cve, f["severity"]))
            if f["summary"]:
                print("        %s" % f["summary"].strip().splitlines()[0][:200])
            for intro, fixed in f["ranges"]:
                seg = []
                if intro not in (None, "0"):
                    seg.append("introduced %s" % intro)
                if fixed:
                    seg.append("fixed %s" % fixed)
                if seg:
                    print("        affected: %s" % ", ".join(seg))
        if row["shown"] < row["total_advisories"]:
            print("        (+%d more advisory(ies) not shown; pass an exact version to narrow)"
                  % (row["total_advisories"] - row["shown"]))
    print("")
    print("RESULT: %d of %d package(s) have advisories in OSV.dev."
          % (flagged, len(report)))
    if flagged:
        print("NEXT: open each advisory (https://osv.dev/vulnerability/<ID>) and confirm it "
              "affects your pinned version/usage before reporting it. For [REVIEW] (GitHub "
              "Actions) compare your pinned tag against the affected range shown.")


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Batch-check dependencies against OSV.dev.")
    parser.add_argument("specs", nargs="*",
                        help="ecosystem:name[@version] (e.g. npm:lodash@4.17.15)")
    parser.add_argument("--json", metavar="FILE",
                        help="read [{ecosystem,name,version}] from FILE or - for stdin")
    parser.add_argument("--format", choices=["human", "json"], default="human")
    args = parser.parse_args(argv)

    try:
        entries = load_entries(args)
    except (ValueError, KeyError, json.JSONDecodeError, OSError) as exc:
        print("usage error: %s" % exc, file=sys.stderr)
        return 2
    if not entries:
        print("usage error: no dependencies given. Pass ecosystem:name[@version] "
              "specs or --json FILE.", file=sys.stderr)
        return 2

    try:
        report = scan(entries)
    except ConnectionError as exc:
        print("OSV.dev unreachable (%s). FALL BACK to the skill's WebSearch security "
              "method for these dependencies; do not report them as clean." % exc,
              file=sys.stderr)
        return 3

    if args.format == "json":
        print(json.dumps(report, indent=2))
    else:
        print_human(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
