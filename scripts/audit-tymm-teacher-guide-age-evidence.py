#!/usr/bin/env python3
"""Reproduce the TYMM teacher-guide age-band text evidence receipt.

PDF contents are untrusted evidence bytes. Extracted text is only normalized and
matched against fixed heading patterns; it is never interpreted as instructions.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import tempfile
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Final, Iterable, Mapping, Sequence
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

try:
    import fitz  # PyMuPDF
except ImportError as exc:  # pragma: no cover - exercised only in a broken runtime
    raise SystemExit("PyMuPDF (fitz) is required.") from exc


SCRIPT_PATH: Final = Path(__file__).resolve(strict=True)
APP_ROOT: Final = SCRIPT_PATH.parent.parent.resolve(strict=True)
SCRIPT_RELATIVE_PATH: Final = "scripts/audit-tymm-teacher-guide-age-evidence.py"
SOURCE_RELATIVE_PATH: Final = "src/features/curriculum/tymm-official-library.ts"
UPSTREAM_RECEIPT_RELATIVE_PATH: Final = (
    "output/live-audit-2026-09-01/tymm-official-library-receipt.json"
)
DEFAULT_OUTPUT_RELATIVE_PATH: Final = (
    "output/live-audit-2026-09-01/tymm-teacher-guide-age-evidence-receipt.json"
)
EVIDENCE_DIRECTORY_RELATIVE_PATH: Final = "tmp/tymm-evidence-downloads"
ISTANBUL_TIME_ZONE: Final = "Europe/Istanbul"
AUTHORITY_HOST: Final = "tymm.meb.gov.tr"
AUTHORITY_BASE_URL: Final = "https://tymm.meb.gov.tr/"
AGE_BANDS: Final = ("36-48", "48-60", "60-72")
DASH_VARIANTS: Final = "-\u2010\u2011\u2012\u2013\u2014\u2015\u2212"
SOURCE_SET_ALGORITHM: Final = (
    "SHA-256 over the UTF-8 bytes of a JSON array of all input records; records "
    "are sorted by path using Python Unicode code-point order; every record has "
    "exactly path, bytes, and sha256; object keys are sorted; ensure_ascii=false; "
    "separators are comma and colon with no extra whitespace; no trailing newline."
)


class AuditError(RuntimeError):
    """A fail-closed evidence-contract error."""


@dataclass(frozen=True)
class ExpectedResource:
    id: str
    official_title: str
    official_page_url: str
    pdf_url: str
    local_evidence_path: str
    byte_size: int
    sha256_hex: str
    page_count: int
    first_pages: Mapping[str, int]
    previous_occurrence_counts: Mapping[str, int]


EXPECTED_RESOURCES: Final[tuple[ExpectedResource, ...]] = (
    ExpectedResource(
        id="teacher-guide-turkish",
        official_title="Türkçe Alanı Öğretmen Kılavuz Kitabı",
        official_page_url=(
            "https://tymm.meb.gov.tr/kitap/1/"
            "turkce-alani-ogretmen-kilavuz-kitabi"
        ),
        pdf_url="https://tymm.meb.gov.tr/assets/pdf/turkce-alani.pdf",
        local_evidence_path="tmp/tymm-evidence-downloads/turkce-alani.pdf",
        byte_size=8_969_468,
        sha256_hex="51cac8b45a453a2b3fa7ccc326e0170b99d721490512b77fb692459b04994c70",
        page_count=130,
        first_pages={"36-48": 60, "48-60": 20, "60-72": 15},
        previous_occurrence_counts={"36-48": 5, "48-60": 12, "60-72": 34},
    ),
    ExpectedResource(
        id="teacher-guide-music",
        official_title="Müzik Alanı Öğretmen Kılavuz Kitabı",
        official_page_url=(
            "https://tymm.meb.gov.tr/kitap/5/"
            "muzik-alani-ogretmen-kilavuz-kitabi"
        ),
        pdf_url="https://tymm.meb.gov.tr/assets/pdf/muzik-alani.pdf",
        local_evidence_path="tmp/tymm-evidence-downloads/muzik-alani.pdf",
        byte_size=9_078_079,
        sha256_hex="a6747da41eea0924912ee95c81f2b8d2d0ee2376442442cba082d8710557d798",
        page_count=143,
        first_pages={"36-48": 13, "48-60": 16, "60-72": 25},
        previous_occurrence_counts={"36-48": 5, "48-60": 15, "60-72": 30},
    ),
    ExpectedResource(
        id="teacher-guide-mathematics",
        official_title="Matematik Alanı Kılavuz Kitabı",
        official_page_url=(
            "https://tymm.meb.gov.tr/kitap/6/"
            "matematik-alani-kilavuz-kitabi"
        ),
        pdf_url="https://tymm.meb.gov.tr/assets/pdf/matematik-alani.pdf",
        local_evidence_path="tmp/tymm-evidence-downloads/matematik-alani.pdf",
        byte_size=9_382_295,
        sha256_hex="b8a5cea9d101682c82260b71152442ce29db0431481fd21d5286ee3f3aafc230",
        page_count=156,
        first_pages={"36-48": 33, "48-60": 17, "60-72": 20},
        previous_occurrence_counts={"36-48": 9, "48-60": 11, "60-72": 28},
    ),
    ExpectedResource(
        id="teacher-guide-movement-health",
        official_title="Hareket Ve Sağlık Alanı Öğretmen Kılavuz Kitabı",
        official_page_url=(
            "https://tymm.meb.gov.tr/kitap/7/"
            "hareket-ve-saglik-alani-ogretmen-kilavuz-kitabi"
        ),
        pdf_url=(
            "https://tymm.meb.gov.tr/assets/pdf/hareket-ve-saglik-alani.pdf"
        ),
        local_evidence_path=(
            "tmp/tymm-evidence-downloads/hareket-ve-saglik-alani.pdf"
        ),
        byte_size=7_598_319,
        sha256_hex="b2e3bacbf5691ddb11802998fadd87bee0f77b8ad5c9612a4e12cb167f25c5ec",
        page_count=141,
        first_pages={"36-48": 14, "48-60": 16, "60-72": 18},
        previous_occurrence_counts={"36-48": 4, "48-60": 15, "60-72": 31},
    ),
    ExpectedResource(
        id="teacher-guide-science",
        official_title="Fen Alanı Öğretmen Kılavuz Kitabı",
        official_page_url=(
            "https://tymm.meb.gov.tr/kitap/8/"
            "fen-alani-ogretmen-kilavuz-kitabi"
        ),
        pdf_url="https://tymm.meb.gov.tr/assets/pdf/fen-alani.pdf",
        local_evidence_path="tmp/tymm-evidence-downloads/fen-alani.pdf",
        byte_size=9_658_337,
        sha256_hex="2947eadcca08ebccd93dcc27e414c0991be9415963a49ca89b9b98e939f94621",
        page_count=129,
        first_pages={"36-48": 31, "48-60": 55, "60-72": 15},
        previous_occurrence_counts={"36-48": 9, "48-60": 11, "60-72": 28},
    ),
)


HEADING_PATTERNS: Final = {
    age_band: re.compile(
        rf"^YAŞ\s+GRUBU\s*:\s*{age_band.split('-')[0]}\s*"
        rf"[{re.escape(DASH_VARIANTS)}]\s*{age_band.split('-')[1]}\s*AY$",
        flags=re.IGNORECASE,
    )
    for age_band in AGE_BANDS
}


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def prefixed_sha256(value: bytes) -> str:
    return f"sha256:{sha256_bytes(value)}"


def utc_text(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace(
        "+00:00", "Z"
    )


def civil_date_in_istanbul(value: datetime) -> str:
    return value.astimezone(ZoneInfo(ISTANBUL_TIME_ZONE)).date().isoformat()


def ensure_inside_root(path: Path, label: str, *, allow_root: bool = False) -> Path:
    try:
        relative = path.relative_to(APP_ROOT)
    except ValueError as exc:
        raise AuditError(f"{label} must stay inside APP_ROOT.") from exc
    if not allow_root and relative == Path("."):
        raise AuditError(f"{label} must be a file below APP_ROOT.")
    return path


def resolve_existing_file(relative_path: str, label: str) -> Path:
    lexical = Path(os.path.abspath(APP_ROOT / Path(relative_path)))
    ensure_inside_root(lexical, label)
    try:
        resolved = lexical.resolve(strict=True)
    except FileNotFoundError as exc:
        raise AuditError(f"{label} is missing: {relative_path}") from exc
    ensure_inside_root(resolved, label)
    if not resolved.is_file():
        raise AuditError(f"{label} is not a regular file: {relative_path}")
    return resolved


def resolve_existing_directory(relative_path: str, label: str) -> Path:
    lexical = Path(os.path.abspath(APP_ROOT / Path(relative_path)))
    ensure_inside_root(lexical, label)
    try:
        resolved = lexical.resolve(strict=True)
    except FileNotFoundError as exc:
        raise AuditError(f"{label} is missing: {relative_path}") from exc
    ensure_inside_root(resolved, label)
    if not resolved.is_dir():
        raise AuditError(f"{label} is not a directory: {relative_path}")
    return resolved


def find_existing_ancestor(path: Path) -> Path:
    current = path
    while not current.exists():
        parent = current.parent
        if parent == current:
            raise AuditError("No existing output ancestor was found.")
        current = parent
    return current


def resolve_output_path(raw_path: str) -> Path:
    requested = Path(raw_path)
    lexical = Path(
        os.path.abspath(requested if requested.is_absolute() else APP_ROOT / requested)
    )
    ensure_inside_root(lexical, "--output")

    ancestor = find_existing_ancestor(lexical.parent).resolve(strict=True)
    ensure_inside_root(ancestor, "--output ancestor", allow_root=True)
    lexical.parent.mkdir(parents=True, exist_ok=True)
    real_parent = lexical.parent.resolve(strict=True)
    ensure_inside_root(real_parent, "--output parent", allow_root=True)
    output = real_parent / lexical.name
    ensure_inside_root(output, "--output")
    if output.is_symlink():
        raise AuditError("--output must not be a symbolic link.")
    if output.exists() and not output.is_file():
        raise AuditError("--output must be a regular file path.")
    return output


def relative_posix(path: Path) -> str:
    ensure_inside_root(path.resolve(strict=True), "input")
    return path.resolve(strict=True).relative_to(APP_ROOT).as_posix()


def input_record(path: Path, data: bytes) -> dict[str, Any]:
    return {
        "path": relative_posix(path),
        "bytes": len(data),
        "sha256": prefixed_sha256(data),
    }


def canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def validate_runtime() -> None:
    if sys.version_info[:2] != (3, 11):
        raise AuditError(
            "This audit requires Python 3.11; "
            f"found {sys.version_info.major}.{sys.version_info.minor}."
        )
    if not getattr(fitz, "__version__", ""):
        raise AuditError("PyMuPDF version metadata is unavailable.")


def validate_expected_contract() -> None:
    if len(EXPECTED_RESOURCES) != 5:
        raise AuditError("The embedded evidence contract must contain exactly five resources.")
    ids = [resource.id for resource in EXPECTED_RESOURCES]
    urls = [resource.pdf_url for resource in EXPECTED_RESOURCES]
    paths = [resource.local_evidence_path for resource in EXPECTED_RESOURCES]
    if len(set(ids)) != 5 or len(set(urls)) != 5 or len(set(paths)) != 5:
        raise AuditError("Expected resource IDs, PDF URLs, and local paths must be unique.")
    for resource in EXPECTED_RESOURCES:
        if set(resource.first_pages) != set(AGE_BANDS):
            raise AuditError(f"First-page contract is incomplete: {resource.id}")
        if set(resource.previous_occurrence_counts) != set(AGE_BANDS):
            raise AuditError(f"Occurrence contract is incomplete: {resource.id}")
        for url in (resource.official_page_url, resource.pdf_url):
            parsed = urlparse(url)
            if (
                parsed.scheme != "https"
                or parsed.hostname != AUTHORITY_HOST
                or parsed.port is not None
                or parsed.username is not None
                or parsed.password is not None
            ):
                raise AuditError(f"Official URL contract is invalid: {resource.id}")
        if Path(urlparse(resource.pdf_url).path).name != Path(
            resource.local_evidence_path
        ).name:
            raise AuditError(f"PDF URL and local basename differ: {resource.id}")


def resource_source_block(source_text: str, resource_id: str) -> str:
    marker = f'id: "{resource_id}"'
    if source_text.count(marker) != 1:
        raise AuditError(f"Source must contain exactly one resource ID: {resource_id}")
    start = source_text.index(marker)
    end = source_text.find("}),", start)
    if end < 0:
        raise AuditError(f"Source resource block is not terminated: {resource_id}")
    return source_text[start : end + 3]


def validate_source_contract(source_bytes: bytes) -> None:
    try:
        source_text = source_bytes.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise AuditError("TYMM official library source is not valid UTF-8.") from exc
    if "\ufffd" in source_text:
        raise AuditError("TYMM official library source contains U+FFFD.")

    for resource in EXPECTED_RESOURCES:
        block = resource_source_block(source_text, resource.id)
        required_tokens = (
            f'title: "{resource.official_title}"',
            'materialKind: "teacher-guide"',
            "ageBands: ALL_AGES",
            'publisherAgeLabel: "36–48 ay"',
            "contentVerifiedAgeBands: ALL_AGES",
            f'officialPageUrl: officialUrl("{urlparse(resource.official_page_url).path}")',
            f'pdfUrl: officialUrl("{urlparse(resource.pdf_url).path}")',
            'accessStatus: "verified-available"',
            f"verifiedByteSize: {resource.byte_size:_}",
        )
        missing = [token for token in required_tokens if token not in block]
        if missing:
            raise AuditError(
                f"Source contract mismatch for {resource.id}: {missing[0]}"
            )


def load_json_bytes(data: bytes, label: str) -> Mapping[str, Any]:
    try:
        text = data.decode("utf-8", errors="strict")
        value = json.loads(text)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise AuditError(f"{label} is not strict UTF-8 JSON.") from exc
    if not isinstance(value, dict):
        raise AuditError(f"{label} top level must be an object.")
    return value


def require_mapping(value: Any, label: str) -> Mapping[str, Any]:
    if not isinstance(value, dict):
        raise AuditError(f"{label} must be an object.")
    return value


def require_sequence(value: Any, label: str) -> Sequence[Any]:
    if not isinstance(value, list):
        raise AuditError(f"{label} must be an array.")
    return value


def validate_upstream_receipt(
    receipt: Mapping[str, Any], source_input: Mapping[str, Any]
) -> None:
    if receipt.get("receiptKind") != "TYMM-official-library-source-verification":
        raise AuditError("Upstream receipt kind does not match the fixed contract.")
    schema_version = receipt.get("schemaVersion")
    if not isinstance(schema_version, int) or schema_version < 2:
        raise AuditError("Upstream receipt schema version must be at least 2.")
    if receipt.get("result") != "PASS":
        raise AuditError("Upstream TYMM official-library receipt is not PASS.")
    errors = require_sequence(receipt.get("errors"), "upstream errors")
    if errors:
        raise AuditError("Upstream TYMM official-library receipt contains errors.")
    authority = require_mapping(receipt.get("authority"), "upstream authority")
    if authority.get("canonicalHost") != AUTHORITY_HOST:
        raise AuditError("Upstream authority host does not match the fixed contract.")

    upstream_inputs = require_sequence(receipt.get("inputs"), "upstream inputs")
    source_matches = [
        value
        for value in upstream_inputs
        if isinstance(value, dict) and value.get("path") == SOURCE_RELATIVE_PATH
    ]
    if len(source_matches) != 1:
        raise AuditError("Upstream receipt must identify the source input exactly once.")
    for key in ("path", "bytes", "sha256"):
        if source_matches[0].get(key) != source_input[key]:
            raise AuditError("Upstream receipt is stale relative to the current source bytes.")

    endpoints = require_sequence(receipt.get("endpoints"), "upstream endpoints")
    matched_ids: set[str] = set()
    for resource in EXPECTED_RESOURCES:
        endpoint_matches: list[tuple[Mapping[str, Any], Mapping[str, Any]]] = []
        for raw_endpoint in endpoints:
            if not isinstance(raw_endpoint, dict):
                continue
            references = raw_endpoint.get("references")
            if not isinstance(references, list):
                continue
            for raw_reference in references:
                if (
                    isinstance(raw_reference, dict)
                    and raw_reference.get("sourceId") == resource.id
                    and raw_reference.get("role") == "canonical-content"
                ):
                    endpoint_matches.append((raw_endpoint, raw_reference))
        if len(endpoint_matches) != 1:
            raise AuditError(
                f"Upstream receipt must contain one canonical PDF reference: {resource.id}"
            )
        endpoint, reference = endpoint_matches[0]
        expected_endpoint_values = {
            "canonicalUrl": resource.pdf_url,
            "expectedKind": "pdf",
            "expectedAvailability": "available",
            "expectedByteSize": resource.byte_size,
            "verificationStatus": "verified",
        }
        for key, expected_value in expected_endpoint_values.items():
            if endpoint.get(key) != expected_value:
                raise AuditError(
                    f"Upstream endpoint {key} mismatch for {resource.id}."
                )
        endpoint_errors = require_sequence(
            endpoint.get("errors"), f"upstream endpoint errors for {resource.id}"
        )
        if endpoint_errors:
            raise AuditError(f"Upstream endpoint has errors: {resource.id}")
        expected_reference_values = {
            "sourceId": resource.id,
            "title": resource.official_title,
            "url": resource.pdf_url,
            "expectedKind": "pdf",
            "expectedAvailability": "available",
            "expectedByteSize": resource.byte_size,
            "materialKind": "teacher-guide",
            "scope": "preschool-direct",
        }
        for key, expected_value in expected_reference_values.items():
            if reference.get(key) != expected_value:
                raise AuditError(
                    f"Upstream reference {key} mismatch for {resource.id}."
                )
        head = require_mapping(endpoint.get("head"), f"upstream HEAD for {resource.id}")
        if (
            head.get("method") != "HEAD"
            or head.get("status") != 200
            or head.get("contentLength") != resource.byte_size
            or head.get("finalUrl") != resource.pdf_url
            or head.get("redirected") is not False
            or not str(head.get("contentType", "")).lower().startswith("application/pdf")
        ):
            raise AuditError(f"Upstream HEAD evidence mismatch for {resource.id}.")
        matched_ids.add(resource.id)

    if matched_ids != {resource.id for resource in EXPECTED_RESOURCES}:
        raise AuditError("Upstream evidence did not match the exact five-resource ID set.")


def normalize_page_text(raw_text: str) -> tuple[list[str], str]:
    lines = []
    for raw_line in raw_text.splitlines():
        normalized = unicodedata.normalize("NFKC", raw_line)
        collapsed = re.sub(r"\s+", " ", normalized, flags=re.UNICODE).strip()
        if collapsed:
            lines.append(collapsed)
    return lines, "\n".join(lines)


def validate_exact_evidence_directory() -> None:
    directory = resolve_existing_directory(
        EVIDENCE_DIRECTORY_RELATIVE_PATH, "evidence directory"
    )
    actual_names = sorted(entry.name for entry in directory.iterdir())
    expected_names = sorted(
        Path(resource.local_evidence_path).name for resource in EXPECTED_RESOURCES
    )
    if actual_names != expected_names:
        raise AuditError(
            "Evidence directory must contain exactly the five contracted PDF files."
        )


def audit_pdf(resource: ExpectedResource, pdf_bytes: bytes) -> dict[str, Any]:
    actual_sha256 = sha256_bytes(pdf_bytes)
    if len(pdf_bytes) != resource.byte_size:
        raise AuditError(f"PDF byte-size mismatch: {resource.id}")
    if actual_sha256 != resource.sha256_hex:
        raise AuditError(f"PDF SHA-256 mismatch: {resource.id}")
    header_present = pdf_bytes.startswith(b"%PDF-")
    eof_present = b"%%EOF" in pdf_bytes[-2_048:]
    if not header_present or not eof_present:
        raise AuditError(f"PDF header/EOF contract failed: {resource.id}")

    occurrences: dict[str, list[dict[str, Any]]] = {
        age_band: [] for age_band in AGE_BANDS
    }
    replacement_count = 0
    try:
        document = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:
        raise AuditError(f"PyMuPDF could not open {resource.id}.") from exc
    try:
        if document.needs_pass:
            raise AuditError(f"Encrypted PDF is not accepted: {resource.id}")
        if document.page_count != resource.page_count:
            raise AuditError(f"PDF page-count mismatch: {resource.id}")
        for page_index in range(document.page_count):
            page_number = page_index + 1
            raw_text = document.load_page(page_index).get_text("text")
            replacement_count += raw_text.count("\ufffd")
            lines, normalized_page_text = normalize_page_text(raw_text)
            page_text_sha256 = prefixed_sha256(normalized_page_text.encode("utf-8"))
            for line in lines:
                for age_band, pattern in HEADING_PATTERNS.items():
                    if pattern.fullmatch(line):
                        occurrences[age_band].append(
                            {
                                "pageNumber": page_number,
                                "exactText": line,
                                "lineSha256": prefixed_sha256(line.encode("utf-8")),
                                "pageTextSha256": page_text_sha256,
                            }
                        )
    finally:
        document.close()

    if replacement_count != 0:
        raise AuditError(f"Extracted PDF text contains U+FFFD: {resource.id}")

    content_evidence = []
    for age_band in AGE_BANDS:
        matches = occurrences[age_band]
        if not matches:
            raise AuditError(f"Age-band heading is missing: {resource.id}/{age_band}")
        first = matches[0]
        expected_first_page = resource.first_pages[age_band]
        if first["pageNumber"] != expected_first_page:
            raise AuditError(
                f"First-page expectation failed: {resource.id}/{age_band}"
            )
        previous_count = resource.previous_occurrence_counts[age_band]
        if len(matches) != previous_count:
            raise AuditError(
                f"Occurrence-count expectation failed: {resource.id}/{age_band}"
            )
        content_evidence.append(
            {
                "ageBandMonths": age_band,
                "occurrenceCount": len(matches),
                "pageNumbers": sorted({match["pageNumber"] for match in matches}),
                "expectedFirstOccurrencePage": expected_first_page,
                "firstOccurrence": first,
            }
        )

    return {
        "id": resource.id,
        "officialTitle": resource.official_title,
        "officialPageUrl": resource.official_page_url,
        "pdfUrl": resource.pdf_url,
        "localEvidencePath": resource.local_evidence_path,
        "expectedFile": {
            "bytes": resource.byte_size,
            "sha256": f"sha256:{resource.sha256_hex}",
            "pageCount": resource.page_count,
        },
        "file": {
            "bytes": len(pdf_bytes),
            "sha256": f"sha256:{actual_sha256}",
            "pdfHeaderPresent": header_present,
            "pdfEofMarkerPresent": eof_present,
            "pageCount": resource.page_count,
            "unicodeReplacementCharacterCount": replacement_count,
        },
        "publisherListingAgeLabel": "36–48 ay",
        "contentTextEvidence": content_evidence,
        "allThreeAgeBandsPresent": True,
    }


def source_set(inputs: Iterable[Mapping[str, Any]]) -> tuple[str, int]:
    canonical_inputs = sorted(
        (
            {
                "path": value["path"],
                "bytes": value["bytes"],
                "sha256": value["sha256"],
            }
            for value in inputs
        ),
        key=lambda value: value["path"],
    )
    canonical_bytes = canonical_json_bytes(canonical_inputs)
    return prefixed_sha256(canonical_bytes), len(canonical_bytes)


def build_receipt() -> dict[str, Any]:
    validate_runtime()
    validate_expected_contract()
    started_at = datetime.now(timezone.utc)

    source_path = resolve_existing_file(SOURCE_RELATIVE_PATH, "library source")
    upstream_path = resolve_existing_file(
        UPSTREAM_RECEIPT_RELATIVE_PATH, "upstream receipt"
    )
    script_path = resolve_existing_file(SCRIPT_RELATIVE_PATH, "audit script")
    exact_fixed_inputs = (
        (source_path, SOURCE_RELATIVE_PATH, "library source"),
        (upstream_path, UPSTREAM_RECEIPT_RELATIVE_PATH, "upstream receipt"),
        (script_path, SCRIPT_RELATIVE_PATH, "audit script"),
    )
    for resolved_path, expected_path, label in exact_fixed_inputs:
        if relative_posix(resolved_path) != expected_path:
            raise AuditError(f"Exact {label} path mismatch.")
    if script_path != SCRIPT_PATH:
        raise AuditError("Audit script path does not resolve to the running script.")
    source_bytes = source_path.read_bytes()
    upstream_bytes = upstream_path.read_bytes()
    script_bytes = script_path.read_bytes()
    source_input = input_record(source_path, source_bytes)
    upstream_input = input_record(upstream_path, upstream_bytes)
    script_input = input_record(script_path, script_bytes)

    validate_source_contract(source_bytes)
    upstream_receipt = load_json_bytes(upstream_bytes, "upstream receipt")
    validate_upstream_receipt(upstream_receipt, source_input)
    validate_exact_evidence_directory()

    inputs: list[dict[str, Any]] = [source_input, upstream_input, script_input]
    resources: list[dict[str, Any]] = []
    for expected in EXPECTED_RESOURCES:
        pdf_path = resolve_existing_file(expected.local_evidence_path, expected.id)
        if relative_posix(pdf_path) != expected.local_evidence_path:
            raise AuditError(f"Local evidence path mismatch: {expected.id}")
        pdf_bytes = pdf_path.read_bytes()
        inputs.append(input_record(pdf_path, pdf_bytes))
        resources.append(audit_pdf(expected, pdf_bytes))

    inputs.sort(key=lambda value: value["path"])
    source_set_sha256, source_set_canonical_bytes = source_set(inputs)
    total_occurrences = sum(
        evidence["occurrenceCount"]
        for resource in resources
        for evidence in resource["contentTextEvidence"]
    )
    finished_at = datetime.now(timezone.utc)
    counts = {
        "resources": len(resources),
        "expectedResources": len(EXPECTED_RESOURCES),
        "ageBandsPerResource": len(AGE_BANDS),
        "resourcesWithAllThreeAgeBands": sum(
            1 for resource in resources if resource["allThreeAgeBandsPresent"]
        ),
        "totalEvidenceOccurrences": total_occurrences,
        "pdfHeadersPassed": sum(
            1 for resource in resources if resource["file"]["pdfHeaderPresent"]
        ),
        "pdfEofMarkersPassed": sum(
            1 for resource in resources if resource["file"]["pdfEofMarkerPresent"]
        ),
        "pdfsWithoutUnicodeReplacement": sum(
            1
            for resource in resources
            if resource["file"]["unicodeReplacementCharacterCount"] == 0
        ),
        "firstOccurrenceExpectationsPassed": len(EXPECTED_RESOURCES)
        * len(AGE_BANDS),
        "occurrenceCountExpectationsPassed": len(EXPECTED_RESOURCES)
        * len(AGE_BANDS),
        "upstreamCanonicalResourcesMatched": len(EXPECTED_RESOURCES),
    }

    return {
        "schemaVersion": 2,
        "receiptKind": "TYMM-teacher-guide-age-band-text-evidence",
        "result": "PASS",
        "asOfUtc": utc_text(finished_at),
        "civilDate": civil_date_in_istanbul(finished_at),
        "timeZone": ISTANBUL_TIME_ZONE,
        "startedAtUtc": utc_text(started_at),
        "finishedAtUtc": utc_text(finished_at),
        "authority": {
            "name": "T.C. Millî Eğitim Bakanlığı",
            "canonicalHost": AUTHORITY_HOST,
            "baseUrl": AUTHORITY_BASE_URL,
        },
        "claim": {
            "statement": (
                "Beş erişilebilir okul öncesi öğretmen kılavuzunun indirilen "
                "PDF metninde 36–48, 48–60 ve 60–72 ay yaş grubu başlıkları "
                "bulunmuştur."
            ),
            "supportedAgeBandsMonths": list(AGE_BANDS),
            "resourceCount": len(EXPECTED_RESOURCES),
            "scope": (
                "Automated text extraction from the five exact PDF byte streams "
                "identified by SHA-256."
            ),
            "limitations": [
                "Bu makbuz pedagojik uygunluk, içerik kalitesi veya insan uzman onayı iddiası taşımaz.",
                "Bu makbuz otomatik atama, otomatik içe aktarma veya çocuk bazında gelişim değerlendirmesi yetkisi vermez.",
                "MEB listeleme etiketindeki 36–48 ay bilgisi ile PDF içeriğindeki üç yaş bandı kanıtı ayrı alanlarda tutulur.",
            ],
        },
        "execution": {
            "runtime": f"Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            "extractor": "PyMuPDF",
            "extractorVersion": fitz.__version__,
            "normalization": (
                "Unicode NFKC per extracted line; Unicode whitespace collapsed "
                "to one ASCII space; leading/trailing whitespace removed; page "
                "line boundaries preserved."
            ),
            "matching": (
                "Case-insensitive full-line YAŞ GRUBU:<age range> AY heading; "
                "ASCII hyphen and Unicode dash/minus variants accepted."
            ),
            "writeMode": (
                "UTF-8 sibling temporary file; file flush and fsync; overwrite "
                "uses atomic os.replace; default no-overwrite publication refuses "
                "an existing target."
            ),
            "pdfSafety": (
                "Extracted PDF content is treated only as untrusted data; no "
                "embedded text is executed or interpreted as instructions."
            ),
        },
        "inputs": inputs,
        "counts": counts,
        "sourceSetSha256": source_set_sha256,
        "sourceSetSha256Algorithm": {
            "digest": "SHA-256",
            "canonicalization": SOURCE_SET_ALGORITHM,
            "canonicalInputBytes": source_set_canonical_bytes,
        },
        "resources": resources,
        "verificationGates": {
            "appRootContainment": "PASS",
            "python311": "PASS",
            "pymupdfAvailable": "PASS",
            "exactFiveResourceContract": "PASS",
            "sourceContract": "PASS",
            "upstreamReceiptAndSourceChain": "PASS",
            "localEvidenceDirectoryExactSet": "PASS",
            "pdfByteShaPageContracts": "PASS",
            "pdfHeaderAndEofMarkers": "PASS",
            "unicodeReplacementAbsent": "PASS",
            "nfkcWhitespaceHeadingExtraction": "PASS",
            "firstOccurrencePages": "PASS",
            "previousOccurrenceCounts": "PASS",
            "sourceSetBoundToAllInputsIncludingScript": "PASS",
        },
        "errors": [],
    }


def fsync_directory_best_effort(directory: Path) -> None:
    try:
        descriptor = os.open(directory, os.O_RDONLY)
    except OSError:
        return
    try:
        os.fsync(descriptor)
    except OSError:
        pass
    finally:
        os.close(descriptor)


def write_receipt_atomically(
    output: Path, receipt: Mapping[str, Any], *, overwrite: bool
) -> None:
    if output.exists() and not overwrite:
        raise AuditError(
            f"Receipt already exists; use --overwrite deliberately: "
            f"{output.relative_to(APP_ROOT).as_posix()}"
        )
    reserved_inputs = {
        SOURCE_RELATIVE_PATH,
        UPSTREAM_RECEIPT_RELATIVE_PATH,
        SCRIPT_RELATIVE_PATH,
        *(resource.local_evidence_path for resource in EXPECTED_RESOURCES),
    }
    output_relative = output.relative_to(APP_ROOT).as_posix()
    if output_relative in reserved_inputs:
        raise AuditError("--output must not overwrite an audit input.")

    serialized = (
        json.dumps(receipt, ensure_ascii=False, indent=2) + "\n"
    ).encode("utf-8")
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{output.name}.", suffix=".tmp", dir=output.parent
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(serialized)
            stream.flush()
            os.fsync(stream.fileno())
        if overwrite:
            os.replace(temporary, output)
        else:
            try:
                os.link(temporary, output)
            except FileExistsError as exc:
                raise AuditError(
                    "Receipt appeared during publication; refusing to overwrite it."
                ) from exc
            temporary.unlink()
        fsync_directory_best_effort(output.parent)
    finally:
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass


def parse_arguments(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Reproduce TYMM teacher-guide age-band PDF text evidence."
    )
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT_RELATIVE_PATH,
        help="Receipt path below APP_ROOT.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Deliberately replace an existing receipt atomically.",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_arguments(sys.argv[1:] if argv is None else argv)
    try:
        output = resolve_output_path(args.output)
        if output.exists() and not args.overwrite:
            raise AuditError(
                "Receipt already exists; use --overwrite deliberately: "
                f"{output.relative_to(APP_ROOT).as_posix()}"
            )
        receipt = build_receipt()
        write_receipt_atomically(output, receipt, overwrite=args.overwrite)
    except AuditError as exc:
        print(
            json.dumps(
                {"result": "FAIL", "error": str(exc)},
                ensure_ascii=False,
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        return 1

    print(
        json.dumps(
            {
                "result": receipt["result"],
                "output": output.relative_to(APP_ROOT).as_posix(),
                "counts": receipt["counts"],
                "sourceSetSha256": receipt["sourceSetSha256"],
            },
            ensure_ascii=False,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
