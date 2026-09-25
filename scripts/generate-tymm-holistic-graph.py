#!/usr/bin/env python3
"""Generate MaarifOS's versioned TYMM preschool holistic evidence graph.

The generator is intentionally fail-closed.  It accepts only the exact 353-page
MEB PDF whose SHA-256 is pinned below, extracts the official tables, validates
their structural coverage, and writes byte-stable UTF-8 JSON.  It does not make
or imply a pedagogical human-review decision.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

import pdfplumber


SOURCE_SHA256 = "77c1ea4771d83cca5bceeb43912770d52bf62a49d45cbbd109e584828bb5ea09"
SOURCE_URL = "https://tymm.meb.gov.tr/upload/program/2024programokuloncesiOnayli.pdf"
SOURCE_VERSION = "2024.09.02"
SOURCE_PAGE_COUNT = 353
AGE_BANDS = ("36-48", "48-60", "60-72")
DOMAINS = (
    "Türkçe",
    "Matematik",
    "Fen",
    "Sosyal",
    "Hareket ve Sağlık",
    "Sanat",
    "Müzik",
)
EXPECTED_OUTCOME_COUNTS = {
    "36-48": 47,
    "48-60": 67,
    "60-72": 96,
}

DOMAIN_HEADERS = {
    "TÜRKÇE": "Türkçe",
    "MATEMATİK": "Matematik",
    "FEN": "Fen",
    "SOSYAL": "Sosyal",
    "HAREKET VE SAĞLIK": "Hareket ve Sağlık",
    "SANAT": "Sanat",
    "MÜZİK": "Müzik",
}

# Field-skill labels are a layout transcription aid.  In the source, their
# letters are printed vertically and pdfplumber returns them in reverse order.
# Every code is still discovered on the source page; this map only restores the
# human-readable word order and is checked for complete source coverage.
FIELD_SKILL_TITLES = {
    "TADB": "Dinleme/İzleme",
    "TAOB": "Okuma",
    "TAKB": "Konuşma",
    "TAEOB": "Erken Okuryazarlık",
    "MAB1": "Matematiksel Muhakeme",
    "MAB2": "Matematiksel Problem Çözme",
    "MAB3": "Matematiksel Temsil",
    "MAB4": "Veri ile Çalışma ve Veriye Dayalı Karar Verme",
    "MAB6": "Sayma",
    "FBAB1": "Bilimsel Gözlem Yapma",
    "FBAB2": "Sınıflandırma",
    "FBAB3": "Bilimsel Gözleme Dayalı Tahmin Etme",
    "FBAB4": "Bilimsel Veriye Dayalı Tahmin Etme",
    "FBAB5": "Operasyonel Tanımlama Yapma",
    "FBAB6": "Deney Yapma",
    "FBAB7": "Bilimsel Çıkarım Yapma",
    "FBAB8": "Bilimsel Model Oluşturma",
    "FBAB9": "Kanıt Kullanma",
    "FBAB10": "Bilimsel Sorgulama Yapma",
    "SBAB1": "Kronolojik Düşünme ve Zamanı Algılama",
    "SBAB2": "Kanıta Dayalı Araştırma ve Sorgulama",
    "SBAB4": "Değişim ve Sürekliliği Algılama",
    "SBAB5": "Sosyal Katılım",
    "SBAB7": "Mekânsal Düşünme",
    "SBAB8": "Coğrafi Sorgulama",
    "SBAB9": "Coğrafi Gözlem ve Saha Çalışması",
    "SBAB10": "Harita",
    "SBAB11": "Grafik, Tablo, Diyagram ve Şekil İçerikli Coğrafi Gösterim",
    "SBAB16": "Eleştirel ve Sosyolojik Düşünme",
    "SBAB17": "Finans",
    "HSAB1": "Aktif Yaşam İçin Psikomotor Beceriler",
    "HSAB2": "Aktif ve Zinde Yaşam İçin Sağlık Becerileri",
    "HSAB3": "Harekete İlişkin Sosyal/Bilişsel Beceriler",
    "SNAB1": "Sanat Türlerini ve Tekniklerini Anlama",
    "SNAB2": "Sanat Eseri İnceleme",
    "SNAB3": "Sanata Değer Verme",
    "SNAB4": "Sanatsal Uygulama Yapma",
    "MDB1": "Müziksel Dinleme",
    "MSB2": "Müziksel Söyleme",
    "MÇB3": "Müziksel Çalma",
    "MHB4": "Müziksel Hareket",
    "MYB5": "Müziksel Yaratıcılık",
}

FIELD_CODE_PATTERN = re.compile(
    r"(?<![A-ZÇĞİÖŞÜ0-9])(?:TA(?:DB|OB|KB|EOB)|MAB\.?[1-6]|FBAB\.?\d+|"
    r"SBAB\.?\d+|HSAB\.?\d+|SNAB\.?\d+|MDB\.?\d+|MSB\.?\d+|"
    r"MÇB\.?\d+|MHB\.?\d+|MYB\.?\d+)(?![A-ZÇĞİÖŞÜ0-9])"
)

SDO_PARENTS = {
    "SDB1": (318, "Benlik Becerileri"),
    "SDB1.1": (318, "Kendini Tanıma (Öz Farkındalık Becerisi)"),
    "SDB1.2": (318, "Kendini Düzenleme (Öz Düzenleme Becerisi)"),
    "SDB1.3": (318, "Kendine Uyarlama (Öz Yansıtma Becerisi)"),
    "SDB2": (319, "Sosyal Yaşam Becerileri"),
    "SDB2.1": (319, "İletişim Becerisi"),
    "SDB2.2": (320, "İş Birliği Becerisi"),
}

CONCEPTUAL_PARENTS = {
    "KB1": (338, "Temel Beceriler"),
    "KB2": (338, "Bütünleşik Beceriler"),
    "KB2.1": (338, "Çelişki Giderme Becerisi"),
    "KB2.2": (338, "Gözlemleme Becerisi"),
    "KB2.3": (338, "Özetleme Becerisi"),
    "KB2.4": (338, "Çözümleme Becerisi"),
    "KB2.5": (339, "Sınıflandırma Becerisi"),
    "KB2.6": (339, "Bilgi Toplama Becerisi"),
    "KB2.7": (339, "Karşılaştırma Becerisi"),
    "KB2.8": (339, "Sorgulama Becerisi"),
    "KB2.9": (339, "Genelleme Becerisi"),
    "KB2.10": (340, "Çıkarım Yapma Becerisi"),
    "KB2.11": (340, "Gözleme Dayalı Tahmin Etme Becerisi"),
    "KB2.14": (340, "Yorumlama Becerisi"),
    "KB2.15": (340, "Yansıtma Becerisi"),
    "KB2.16": (341, "Muhakeme (Akıl Yürütme) Becerisi"),
    "KB2.16.1": (341, "Tümevarıma Dayalı Akıl Yürütme Becerisi"),
    "KB2.16.2": (341, "Tümdengelime Dayalı Akıl Yürütme Becerisi"),
    "KB2.17": (341, "Değerlendirme Becerisi"),
    "KB2.20": (341, "Sentezleme Becerisi"),
    "KB3": (342, "Üst Düzey Düşünme Becerileri"),
    "KB3.2": (342, "Problem Çözme Becerisi"),
    "KB3.3": (342, "Eleştirel Düşünme Becerisi"),
}


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    value = value.replace("\u00ad", "")
    value = re.sub(r"-\s*\n\s*(?=\w)", "", value)
    return re.sub(r"\s+", " ", value).strip()


def normalized_code(value: str) -> str:
    value = value.strip().rstrip(".")
    value = re.sub(r"\.\s*SB\s*\.\s*(\d+)", r".SB\1", value)
    value = re.sub(r"\.\s*SB\s*(\d+)", r".SB\1", value)
    value = re.sub(r"\.\s*G\s*(\d+)", r".G\1", value)
    value = re.sub(r"\s*\.\s*", ".", value)
    value = value.replace("..", ".")
    return value.rstrip(".")


def normalize_code_layout(value: str) -> str:
    value = re.sub(r"\b([A-ZÇĞİÖŞÜ]{2,})\s+(?=\d)", r"\1", value)
    value = re.sub(r"\.\s*SB\s*\.\s*(\d+)", r".SB\1", value)
    value = re.sub(r"\.\s*SB\s*(\d+)", r".SB\1", value)
    value = re.sub(r"\.\s*(\d+)\s*\.", r".\1.", value)
    return value


CODE_AND_TITLE = re.compile(
    r"^([A-ZÇĞİÖŞÜ]+\d*(?:\s*\.\s*(?:\d+|SB\s*\.?\s*\d+|G\s*\d+))*)[.]?\s*(.*)$",
    re.DOTALL,
)


def parse_code_and_title(value: str | None, label: str) -> tuple[str, str]:
    text = normalize_code_layout(clean_text(value).lstrip("“”\"'•· "))
    match = CODE_AND_TITLE.match(text)
    if not match:
        raise ValueError(f"{label}: kod/metin ayrıştırılamadı: {text!r}")
    code = normalized_code(match.group(1))
    title = clean_text(match.group(2)).lstrip(". ")
    if not code or not title:
        raise ValueError(f"{label}: kod veya metin boş: {text!r}")
    return code, title


def canonical_outcome_code(code: str) -> str:
    # Three HSAB rows omit the separator dot in the PDF's extracted text while
    # the visible code family and the established learning-outcome catalog use
    # HSAB.n.  Preserve one canonical code form without changing source prose.
    match = re.fullmatch(r"(HSAB)(\d+)", code)
    return f"{match.group(1)}.{match.group(2)}" if match else code


def hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def slug(value: str) -> str:
    translation = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")
    result = re.sub(r"[^a-z0-9]+", "-", value.translate(translation).lower()).strip("-")
    if not result:
        raise ValueError(f"Boş düğüm slug'ı: {value!r}")
    return result


@dataclass
class NodeDraft:
    node_id: str
    code: str
    title: str
    kind: str
    domain: str
    age_bands: set[str] = field(default_factory=set)
    parent_codes: list[str] = field(default_factory=list)
    source_pages: set[int] = field(default_factory=set)

    def add_parents(self, values: Iterable[str]) -> None:
        for value in values:
            if value and value != self.code and value not in self.parent_codes:
                self.parent_codes.append(value)

    def to_json(self) -> dict[str, Any]:
        pages = sorted(self.source_pages)
        if not pages:
            raise ValueError(f"{self.node_id} kaynak sayfası taşımıyor")
        return {
            "nodeId": self.node_id,
            "code": self.code,
            "title": self.title,
            "kind": self.kind,
            "domain": self.domain,
            "ageBands": [age for age in AGE_BANDS if age in self.age_bands],
            "parentCodes": sorted(self.parent_codes),
            "sourceUrl": SOURCE_URL,
            "sourcePage": pages[0],
            "sourcePages": pages,
            "sourceSha256": f"sha256:{SOURCE_SHA256}",
        }


class GraphBuilder:
    def __init__(self) -> None:
        self.nodes: dict[str, NodeDraft] = {}
        self.field_matrix_relations: set[tuple[str, str, str, str]] = set()

    def put(
        self,
        *,
        node_id: str,
        code: str,
        title: str,
        kind: str,
        domain: str,
        age_bands: Iterable[str],
        parent_codes: Iterable[str],
        source_page: int,
    ) -> NodeDraft:
        title = clean_text(title)
        if not title:
            raise ValueError(f"{node_id} başlığı boş")
        existing = self.nodes.get(node_id)
        if existing is None:
            existing = NodeDraft(node_id, code, title, kind, domain)
            self.nodes[node_id] = existing
        elif (existing.code, existing.title, existing.kind, existing.domain) != (
            code,
            title,
            kind,
            domain,
        ):
            raise ValueError(
                f"{node_id} çelişkili düğüm: "
                f"{(existing.code, existing.title, existing.kind, existing.domain)!r} != "
                f"{(code, title, kind, domain)!r}"
            )
        existing.age_bands.update(age_bands)
        existing.add_parents(parent_codes)
        existing.source_pages.add(source_page)
        return existing

    def put_scoped(
        self,
        *,
        scope: str,
        code: str,
        title: str,
        kind: str,
        domain: str,
        age_band: str,
        parent_codes: Iterable[str],
        source_page: int,
    ) -> NodeDraft:
        return self.put(
            node_id=f"{scope}:{age_band}:{slug(domain)}:{code.lower()}",
            code=code,
            title=title,
            kind=kind,
            domain=domain,
            age_bands=[age_band],
            parent_codes=parent_codes,
            source_page=source_page,
        )


def page_scope(page_text: str, page_number: int) -> tuple[str, str]:
    header = re.search(
        r"(TÜRKÇE|MATEMATİK|FEN|SOSYAL|HAREKET VE SAĞLIK|SANAT|MÜZİK)\s+ALANI\s*\(\s*(36|48|60)\s*-\s*(48|60|72)\s*AY\s*\)",
        page_text,
    )
    if not header:
        raise ValueError(f"{page_number}. sayfada alan/yaş başlığı bulunamadı")
    domain = DOMAIN_HEADERS[header.group(1)]
    age_band = f"{header.group(2)}-{header.group(3)}"
    return domain, age_band


def field_code(value: str | None, page_number: int) -> str:
    reversed_text = clean_text((value or "")[::-1])
    match = FIELD_CODE_PATTERN.search(reversed_text)
    if not match:
        raise ValueError(f"{page_number}. sayfada alan becerisi kodu ayrıştırılamadı: {reversed_text!r}")
    code = normalized_code(match.group(0)).replace(".", "")
    if code not in FIELD_SKILL_TITLES:
        raise ValueError(f"{page_number}. sayfada bilinmeyen alan becerisi: {code}")
    return code


def five_column_rows(page: Any) -> list[list[str | None]]:
    rows: list[list[str | None]] = []
    for table in page.extract_tables():
        if not table or max((len(row) for row in table), default=0) != 5:
            continue
        for row in table:
            if len(row) != 5:
                continue
            joined = " ".join(clean_text(cell) for cell in row if cell)
            if not joined or "Öğrenme Çıktıları" in joined or " ALANI " in f" {joined} ":
                continue
            rows.append(row)
    return rows


def extract_field_matrices(pdf: Any, builder: GraphBuilder) -> None:
    state: dict[tuple[str, str], dict[str, Any]] = defaultdict(
        lambda: {"field": None, "integrated": None, "processes": [], "outcome": None}
    )
    observed_field_codes: set[str] = set()

    for page_number in range(245, 300):
        page = pdf.pages[page_number - 1]
        page_text = page.extract_text() or ""
        domain, age_band = page_scope(page_text, page_number)
        scope_state = state[(domain, age_band)]
        rows = five_column_rows(page)
        if not rows:
            raise ValueError(f"{page_number}. sayfada 5 sütunlu alan matrisi bulunamadı")

        for row_index, row in enumerate(rows, start=1):
            field_cell, integrated_cell, process_cell, outcome_cell, _sub_outcome_cell = row
            integrated_parsed: tuple[str, str] | None = None
            if integrated_cell:
                integrated_parsed = parse_code_and_title(
                    integrated_cell,
                    f"{page_number}. sayfa satır {row_index} bütünleşik beceri",
                )
                implied_field_code = integrated_parsed[0].split(".", 1)[0]
                if implied_field_code in FIELD_SKILL_TITLES:
                    scope_state["field"] = implied_field_code
                    observed_field_codes.add(implied_field_code)
                    builder.put_scoped(
                        scope="field",
                        code=implied_field_code,
                        title=FIELD_SKILL_TITLES[implied_field_code],
                        kind="field-skill",
                        domain=domain,
                        age_band=age_band,
                        parent_codes=[],
                        source_page=page_number,
                    )

            if field_cell:
                try:
                    code = field_code(field_cell, page_number)
                except ValueError:
                    # A few vertically printed cells are split over a separate
                    # physical row (for example FBAB2 on page 268).  The same
                    # official code is intact in the integrated-skill column.
                    code = integrated_parsed[0].split(".", 1)[0] if integrated_parsed else ""
                    if code not in FIELD_SKILL_TITLES:
                        continue
                observed_field_codes.add(code)
                scope_state["field"] = code
                builder.put_scoped(
                    scope="field",
                    code=code,
                    title=FIELD_SKILL_TITLES[code],
                    kind="field-skill",
                    domain=domain,
                    age_band=age_band,
                    parent_codes=[],
                    source_page=page_number,
                )

            if integrated_parsed:
                code, title = integrated_parsed
                scope_state["integrated"] = code
                if not code.startswith("KB"):
                    if not scope_state["field"]:
                        raise ValueError(f"{page_number}. sayfada üst alan becerisi olmadan bütünleşik beceri")
                    builder.put_scoped(
                        scope="integrated",
                        code=code,
                        title=title,
                        kind="integrated-skill",
                        domain=domain,
                        age_band=age_band,
                        parent_codes=[scope_state["field"]],
                        source_page=page_number,
                    )

            process_codes: list[str] = []
            if process_cell:
                segments = code_segments(process_cell)
                if not segments:
                    segments = [process_cell]
                for segment in segments:
                    code, title = parse_code_and_title(
                        segment,
                        f"{page_number}. sayfa satır {row_index} süreç bileşeni",
                    )
                    process_codes.append(code)
                    if not code.startswith("KB"):
                        if not scope_state["integrated"]:
                            raise ValueError(f"{page_number}. sayfada üst bütünleşik beceri olmadan süreç bileşeni")
                        builder.put_scoped(
                            scope="process",
                            code=code,
                            title=title,
                            kind="process-component",
                            domain=domain,
                            age_band=age_band,
                            parent_codes=[scope_state["integrated"]],
                            source_page=page_number,
                        )
                scope_state["processes"] = process_codes

            if outcome_cell:
                code, title = parse_code_and_title(
                    outcome_cell,
                    f"{page_number}. sayfa satır {row_index} öğrenme çıktısı",
                )
                code = canonical_outcome_code(code)
                scope_state["outcome"] = code
                parents = [
                    value
                    for value in (
                        scope_state["field"],
                        scope_state["integrated"],
                        *scope_state["processes"],
                    )
                    if value
                ]
                builder.put_scoped(
                    scope="outcome",
                    code=code,
                    title=title,
                    # The established TYMM catalog contains 210 learning
                    # outcomes.  Ek field matrices additionally print two MYB
                    # music-creativity rows for every age band.  Keep all six
                    # source rows in the graph, but do not silently expand the
                    # human-review baseline: they remain explicitly
                    # supplementary until preschool experts decide scope.
                    kind=(
                        "supplementary-learning-outcome"
                        if code.startswith("MYB.")
                        else "learning-outcome"
                    ),
                    domain=domain,
                    age_band=age_band,
                    parent_codes=parents,
                    source_page=page_number,
                )

            # Rows following a learning-outcome cell frequently add further
            # process components.  Preserve those edges on the same outcome.
            if process_codes and not outcome_cell and scope_state["outcome"]:
                outcome_id = f"outcome:{age_band}:{slug(domain)}:{str(scope_state['outcome']).lower()}"
                outcome = builder.nodes.get(outcome_id)
                if outcome is None:
                    raise ValueError(f"{page_number}. sayfada süreç için etkin öğrenme çıktısı bulunamadı")
                outcome.add_parents(process_codes)

            if scope_state["outcome"]:
                for relation_kind, related_code in (
                    ("field-skill", scope_state["field"]),
                    ("integrated-skill", scope_state["integrated"]),
                ):
                    if related_code:
                        builder.field_matrix_relations.add(
                            (age_band, str(scope_state["outcome"]), relation_kind, str(related_code))
                        )
                for related_code in scope_state["processes"]:
                    builder.field_matrix_relations.add(
                        (age_band, str(scope_state["outcome"]), "process-component", str(related_code))
                    )

    if observed_field_codes != set(FIELD_SKILL_TITLES):
        missing = sorted(set(FIELD_SKILL_TITLES) - observed_field_codes)
        unexpected = sorted(observed_field_codes - set(FIELD_SKILL_TITLES))
        raise ValueError(f"Alan becerisi kapsamı uyuşmuyor; eksik={missing}, beklenmeyen={unexpected}")


def code_segments(value: str) -> list[str]:
    compact = normalize_code_layout(clean_text(value))
    starts = list(
        re.finditer(
            r"(?<![A-ZÇĞİÖŞÜ0-9.])([A-ZÇĞİÖŞÜ]+\d*(?:\.\d+)+(?:\.SB\d+)?(?:\.G\d+)?)(?=\.?\s)",
            compact,
        )
    )
    result: list[str] = []
    for index, match in enumerate(starts):
        end = starts[index + 1].start() if index + 1 < len(starts) else len(compact)
        result.append(compact[match.start() : end].strip())
    return result


def add_sdo_nodes(pdf: Any, builder: GraphBuilder) -> None:
    for code, (page_number, title) in SDO_PARENTS.items():
        page_text = clean_text(pdf.pages[page_number - 1].extract_text() or "")
        folded_page_text = slug(page_text)
        if code not in page_text or not all(
            slug(token) in folded_page_text
            for token in title.replace("(", "").replace(")", "").split()[:2]
        ):
            raise ValueError(f"{page_number}. sayfada {code} üst sosyal-duygusal becerisi doğrulanamadı")
        parent = code.rsplit(".", 1)[0] if "." in code else None
        builder.put(
            node_id=f"sdo:{code.lower()}",
            code=code,
            title=title,
            kind="social-emotional-skill",
            domain="Sosyal-Duygusal Öğrenme",
            age_bands=AGE_BANDS,
            parent_codes=[parent] if parent else [],
            source_page=page_number,
        )

    for page_number in range(318, 321):
        for table in pdf.pages[page_number - 1].extract_tables():
            if not table or max((len(row) for row in table), default=0) != 2:
                continue
            for row in table:
                if len(row) != 2 or not row[0] or "SÜREÇ BİLEŞENLERİ" in row[0]:
                    continue
                process_code, process_title = parse_code_and_title(
                    row[0], f"{page_number}. sayfa sosyal-duygusal süreç bileşeni"
                )
                if not re.fullmatch(r"SDB[12]\.\d+\.SB\d+", process_code):
                    continue
                process_parent = process_code.rsplit(".SB", 1)[0]
                builder.put(
                    node_id=f"sdo-process:{process_code.lower()}",
                    code=process_code,
                    title=process_title,
                    kind="process-component",
                    domain="Sosyal-Duygusal Öğrenme",
                    age_bands=AGE_BANDS,
                    parent_codes=[process_parent],
                    source_page=page_number,
                )
                for segment in code_segments(row[1] or ""):
                    indicator_code, indicator_title = parse_code_and_title(
                        segment, f"{page_number}. sayfa sosyal-duygusal gösterge"
                    )
                    if not indicator_code.startswith(f"{process_code}.G"):
                        raise ValueError(f"{indicator_code} göstergesi {process_code} ile aynı soyda değil")
                    builder.put(
                        node_id=f"sdo-indicator:{indicator_code.lower()}",
                        code=indicator_code,
                        title=indicator_title,
                        kind="social-emotional-indicator",
                        domain="Sosyal-Duygusal Öğrenme",
                        age_bands=AGE_BANDS,
                        parent_codes=[process_code],
                        source_page=page_number,
                    )


def add_disposition_nodes(pdf: Any, builder: GraphBuilder) -> None:
    page_number = 333
    tables = pdf.pages[page_number - 1].extract_tables()
    table = next((table for table in tables if len(table) >= 17 and max(map(len, table)) == 2), None)
    if table is None:
        raise ValueError("333. sayfada eğilimler tablosu bulunamadı")
    current_parent: str | None = None
    for row in table:
        if len(row) != 2 or row[0] == "EĞİLİMLER":
            continue
        if row[0]:
            current_parent, parent_title = parse_code_and_title(row[0], "Eğilim kategorisi")
            if not re.fullmatch(r"E[123]", current_parent):
                raise ValueError(f"Geçersiz eğilim kategorisi: {current_parent}")
            builder.put(
                node_id=f"disposition-category:{current_parent.lower()}",
                code=current_parent,
                title=parent_title,
                kind="disposition-category",
                domain="Eğilimler",
                age_bands=AGE_BANDS,
                parent_codes=[],
                source_page=page_number,
            )
        if row[1]:
            code, title = parse_code_and_title(row[1], "Eğilim")
            if current_parent is None or not code.startswith(f"{current_parent}."):
                raise ValueError(f"{code} eğiliminin üst kategorisi bulunamadı")
            builder.put(
                node_id=f"disposition:{code.lower()}",
                code=code,
                title=title,
                kind="disposition",
                domain="Eğilimler",
                age_bands=AGE_BANDS,
                parent_codes=[current_parent],
                source_page=page_number,
            )


def add_literacy_nodes(pdf: Any, builder: GraphBuilder) -> None:
    observed_roots: set[str] = set()
    for page_number in range(334, 338):
        for table in pdf.pages[page_number - 1].extract_tables():
            if not table or max((len(row) for row in table), default=0) != 2 or not table[0][0]:
                continue
            try:
                root_code, root_title = parse_code_and_title(table[0][0], "Okuryazarlık kökü")
            except ValueError:
                continue
            if not re.fullmatch(r"OB[1-8]", root_code):
                continue
            observed_roots.add(root_code)
            builder.put(
                node_id=f"literacy:{root_code.lower()}",
                code=root_code,
                title=root_title,
                kind="literacy",
                domain="Okuryazarlık Becerileri",
                age_bands=AGE_BANDS,
                parent_codes=[],
                source_page=page_number,
            )
            current_integrated: str | None = None
            for row in table[1:]:
                if len(row) != 2 or "BÜTÜNLEŞİK BECERİLER" in clean_text(row[0]):
                    continue
                if row[0]:
                    code, title = parse_code_and_title(row[0], "Okuryazarlık bütünleşik becerisi")
                    if not code.startswith(f"{root_code}."):
                        raise ValueError(f"{code} okuryazarlık köküyle uyuşmuyor")
                    current_integrated = code
                    builder.put(
                        node_id=f"literacy-skill:{code.lower()}",
                        code=code,
                        title=title,
                        kind="literacy-skill",
                        domain="Okuryazarlık Becerileri",
                        age_bands=AGE_BANDS,
                        parent_codes=[root_code],
                        source_page=page_number,
                    )
                if row[1]:
                    for segment in code_segments(row[1]):
                        code, title = parse_code_and_title(segment, "Okuryazarlık süreç bileşeni")
                        parent = code.rsplit(".SB", 1)[0]
                        if current_integrated is None or parent != current_integrated:
                            raise ValueError(f"{code} okuryazarlık süreç bileşeninin üstü bulunamadı")
                        builder.put(
                            node_id=f"literacy-process:{code.lower()}",
                            code=code,
                            title=title,
                            kind="process-component",
                            domain="Okuryazarlık Becerileri",
                            age_bands=AGE_BANDS,
                            parent_codes=[current_integrated],
                            source_page=page_number,
                        )
    # Ek-16 publishes OB1, OB2 and OB4-OB8 tables.  OB3 appears in the social
    # field matrix (for example OB3.1 on pages 273 and 277) but not as an Ek-16
    # root table in this exact PDF, so the generator preserves that source fact
    # instead of inventing an appendix row.
    expected = {"OB1", "OB2", "OB4", "OB5", "OB6", "OB7", "OB8"}
    if observed_roots != expected:
        raise ValueError(f"Okuryazarlık kök kapsamı uyuşmuyor: {sorted(observed_roots)}")


def add_conceptual_nodes(pdf: Any, builder: GraphBuilder) -> None:
    for code, (page_number, title) in CONCEPTUAL_PARENTS.items():
        page_text = clean_text(pdf.pages[page_number - 1].extract_text() or "")
        if code not in page_text:
            raise ValueError(f"{page_number}. sayfada {code} kavramsal becerisi bulunamadı")
        parent: str | None = None
        if code.startswith("KB2.16."):
            parent = "KB2.16"
        elif "." in code:
            parent = code.split(".", 1)[0]
        builder.put(
            node_id=f"conceptual:{code.lower()}",
            code=code,
            title=title,
            kind="conceptual-skill",
            domain="Kavramsal Beceriler",
            age_bands=AGE_BANDS,
            parent_codes=[parent] if parent else [],
            source_page=page_number,
        )

    base_table = pdf.pages[337].extract_tables()[0]
    for row in base_table[1:]:
        for cell in row:
            if not cell:
                continue
            code, title = parse_code_and_title(cell, "Temel kavramsal beceri")
            if not re.fullmatch(r"KB1\.\d+", code):
                continue
            builder.put(
                node_id=f"conceptual:{code.lower()}",
                code=code,
                title=title,
                kind="conceptual-skill",
                domain="Kavramsal Beceriler",
                age_bands=AGE_BANDS,
                parent_codes=["KB1"],
                source_page=338,
            )

    observed_processes: set[str] = set()
    for page_number in range(338, 343):
        for table in pdf.pages[page_number - 1].extract_tables():
            if not table or max((len(row) for row in table), default=0) != 1:
                continue
            for row in table:
                if not row or not row[0] or "Süreç Bileşenleri" in row[0]:
                    continue
                code, title = parse_code_and_title(row[0], "Kavramsal süreç bileşeni")
                if not re.fullmatch(r"KB[23](?:\.\d+){1,2}\.SB\d+", code):
                    continue
                parent = code.rsplit(".SB", 1)[0]
                observed_processes.add(code)
                builder.put(
                    node_id=f"conceptual-process:{code.lower()}",
                    code=code,
                    title=title,
                    kind="process-component",
                    domain="Kavramsal Beceriler",
                    age_bands=AGE_BANDS,
                    parent_codes=[parent],
                    source_page=page_number,
                )
    if len(observed_processes) != 64:
        raise ValueError(f"Kavramsal süreç bileşeni sayısı 64 olmalı, {len(observed_processes)} bulundu")


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def build_graph(pdf_path: Path) -> dict[str, Any]:
    actual_hash = hash_file(pdf_path)
    if actual_hash != SOURCE_SHA256:
        raise ValueError(
            "TYMM PDF SHA-256 özeti kanonik kaynakla uyuşmuyor: "
            f"beklenen={SOURCE_SHA256}, bulunan={actual_hash}"
        )

    builder = GraphBuilder()
    with pdfplumber.open(pdf_path) as pdf:
        if len(pdf.pages) != SOURCE_PAGE_COUNT:
            raise ValueError(f"TYMM PDF {SOURCE_PAGE_COUNT} sayfa olmalı, {len(pdf.pages)} bulundu")
        extract_field_matrices(pdf, builder)
        add_sdo_nodes(pdf, builder)
        add_disposition_nodes(pdf, builder)
        add_literacy_nodes(pdf, builder)
        add_conceptual_nodes(pdf, builder)

    nodes = sorted((node.to_json() for node in builder.nodes.values()), key=lambda node: node["nodeId"])
    node_ids = [node["nodeId"] for node in nodes]
    if len(node_ids) != len(set(node_ids)):
        raise ValueError("Üretilen düğüm kimlikleri mükerrer")

    outcome_nodes = [node for node in nodes if node["kind"] == "learning-outcome"]
    if len(outcome_nodes) != 210:
        raise ValueError(f"Öğrenme çıktısı sayısı 210 olmalı, {len(outcome_nodes)} bulundu")
    age_counts = Counter(node["ageBands"][0] for node in outcome_nodes)
    if dict(age_counts) != EXPECTED_OUTCOME_COUNTS:
        raise ValueError(f"Yaş bandı öğrenme çıktısı sayıları uyuşmuyor: {dict(age_counts)}")
    coverage = {(node["ageBands"][0], node["domain"]) for node in outcome_nodes}
    expected_coverage = {(age, domain) for age in AGE_BANDS for domain in DOMAINS}
    if coverage != expected_coverage:
        raise ValueError("Üç yaş bandı x yedi alan öğrenme çıktısı kapsamı eksik")

    external_catalog = {
        "catalogId": "meb-tymm-okul-oncesi-2024-ede-ek14",
        "module": "../values/official-preschool-value-actions.ts",
        "sourcePageRange": [324, 332],
        "sourceSha256": f"sha256:{SOURCE_SHA256}",
        "sourceUrl": SOURCE_URL,
        "sourceVersion": SOURCE_VERSION,
    }
    digest_payload = {
        "externalCatalogs": [external_catalog],
        "nodes": nodes,
        "relations": sorted(builder.field_matrix_relations),
    }
    content_hash = hashlib.sha256(canonical_json(digest_payload)).hexdigest()
    kind_counts = Counter(node["kind"] for node in nodes)
    graph = {
        "schemaVersion": 1,
        "graphId": "meb-tymm-okul-oncesi-2024-holistic-graph",
        "graphVersion": "1.0.0",
        "sourceVersion": SOURCE_VERSION,
        "sourceDocumentTitle": "Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı",
        "sourceUrl": SOURCE_URL,
        "sourceSha256": f"sha256:{SOURCE_SHA256}",
        "sourcePageCount": SOURCE_PAGE_COUNT,
        "pageNumbering": "pdf-page-label-and-viewer-1-based",
        "sourceSections": {
            "fieldMatrices": [245, 299],
            "socialEmotionalLearning": [318, 320],
            "erdemDegerEylem": [324, 332],
            "dispositions": [333, 333],
            "literacy": [334, 337],
            "conceptualSkills": [338, 342],
        },
        "reviewStatus": "pending-human-review",
        "humanReview": {
            "requiredIndependentPreschoolExpertApprovals": 2,
            "approvals": [],
        },
        "catalogContentSha256": f"sha256:{content_hash}",
        "externalCatalogs": [external_catalog],
        "statistics": {
            "baseNodeCount": len(nodes),
            "learningOutcomeCount": len(outcome_nodes),
            "fieldMatrixRelationCount": len(builder.field_matrix_relations),
            "ageDomainCoverageCount": len(coverage),
            "kindCounts": dict(sorted(kind_counts.items())),
        },
        "nodes": nodes,
        "fieldMatrixRelations": [
            {
                "ageBand": age_band,
                "learningOutcomeCode": outcome_code,
                "relationKind": relation_kind,
                "relatedCode": related_code,
            }
            for age_band, outcome_code, relation_kind, related_code in sorted(
                builder.field_matrix_relations
            )
        ],
    }
    return graph


def render_graph(graph: dict[str, Any]) -> str:
    return json.dumps(graph, ensure_ascii=False, indent=2) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", type=Path, required=True, help="Exact official 353-page TYMM PDF")
    parser.add_argument("--out", type=Path, required=True, help="Generated JSON path")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Fail if --out does not already contain the deterministic generated bytes",
    )
    args = parser.parse_args()

    graph = build_graph(args.pdf.resolve())
    rendered = render_graph(graph)
    if args.check:
        if not args.out.exists() or args.out.read_text(encoding="utf-8") != rendered:
            raise ValueError(f"{args.out} kanonik üretici çıktısıyla eşleşmiyor")
        print(f"OK {args.out} sha256={hashlib.sha256(rendered.encode('utf-8')).hexdigest()}")
        return 0

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(rendered, encoding="utf-8", newline="\n")
    print(
        f"WROTE {args.out} nodes={graph['statistics']['baseNodeCount']} "
        f"outcomes={graph['statistics']['learningOutcomeCount']} "
        f"sha256={hashlib.sha256(rendered.encode('utf-8')).hexdigest()}"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # fail-closed CLI boundary
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
