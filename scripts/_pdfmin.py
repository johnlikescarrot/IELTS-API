#!/usr/bin/env python3
"""Minimal stdlib-only PDF text extraction for the ielts-api derivation scripts.

The upstream study-material repositories publish styled PDF exports produced by
desktop office software. They use the classic PDF machinery only:

* FlateDecode content streams,
* Identity-H subset TrueType fonts with ToUnicode CMaps and /W width arrays,
* standard-security encryption (RC4, revision 4, empty user password) added by
  the exporting word processor,
* one absolutely positioned glyph run per ``BT ... ET`` block.

Every one of those is implementable with the standard library (zlib, hashlib,
re), so the derivation pipeline keeps the repository's zero-dependency
property: no poppler, no pypdf, no pip install. This module deliberately
supports only that feature subset - it is a derivation helper, not a general
PDF library, and it raises :class:`PdfError` rather than guessing when a
document uses machinery outside the subset.

Lines are reconstructed from glyph coordinates (a y change starts a new line;
a positive x gap wider than a fraction of the font size starts a word), which
is how the source documents delimit entries.

Public API:
    extract_pages(path) -> list[str]  one decoded text layer per page, in
                                      document (page-tree) order.
"""

from __future__ import annotations

import hashlib
import re
import struct
import zlib
from pathlib import Path

#: Padding string appended to passwords shorter than 32 bytes (PDF 1.7, 7.6.3.3).
_PAD = bytes(
    [
        0x28, 0xBF, 0x4E, 0x5E, 0x4E, 0x75, 0x8A, 0x41,
        0x64, 0x00, 0x4E, 0x56, 0xFF, 0xFA, 0x01, 0x08,
        0x2E, 0x2E, 0x00, 0xB6, 0xD0, 0x68, 0x3E, 0x80,
        0x2F, 0x0C, 0xA9, 0xFE, 0x64, 0x53, 0x69, 0x7A,
    ]
)

_NUM = rb"-?[\d.]+"

_OBJECT = re.compile(rb"(?:^|[\r\n>])(\d+)\s+(\d+)\s+obj\b(.*?)endobj", re.S)
_STREAM = re.compile(rb"stream\r?\n(.*?)\r?\nendstream", re.S)

#: One text-showing or positioning operator inside a content stream.
_SHOW_TOKEN = re.compile(
    rb"<([0-9A-Fa-f]+)>"  # 1: hex string (2-byte glyph CIDs)
    rb"|/(\w+)\s+(" + _NUM + rb")\s+Tf"  # 2, 3: font select
    rb"|((?:" + _NUM + rb"\s+){5})(" + _NUM + rb")\s+Tm"  # 4, 5: text matrix
    rb"|(" + _NUM + rb")\s+(" + _NUM + rb")\s+(Td|TD)"  # 6, 7, 8: relative move
    rb"|T\*",  # 9: next-line operator
    re.S,
)


class PdfError(RuntimeError):
    """Raised when a PDF uses machinery this module refuses to guess about."""


def _rc4(key: bytes, data: bytes) -> bytes:
    """RC4 keystream XOR; the only cipher the supported encryption uses."""
    s = list(range(256))
    j = 0
    for i in range(256):
        j = (j + s[i] + key[i % len(key)]) & 0xFF
        s[i], s[j] = s[j], s[i]
    out = bytearray()
    i = j = 0
    for b in data:
        i = (i + 1) & 0xFF
        j = (j + s[i]) & 0xFF
        s[i], s[j] = s[j], s[i]
        out.append(b ^ s[(s[i] + s[j]) & 0xFF])
    return bytes(out)


def _hex_field(dict_bytes: bytes, name: bytes) -> bytes:
    m = re.search(rb"/" + name + rb"<([0-9A-Fa-f]+)>", dict_bytes)
    return bytes.fromhex(m.group(1).decode()) if m else b""


def _file_key(encrypt: bytes, doc_id: bytes) -> bytes:
    """Derive the file encryption key for an empty user password (Algorithm 2)."""
    r = int(re.search(rb"/R\s+(\d+)", encrypt).group(1))
    if r > 4:
        raise PdfError(f"unsupported security handler revision R={r} (AES or newer)")
    length_field = re.search(rb"/Length\s+(\d+)", encrypt)
    key_len = (int(length_field.group(1)) // 8) if length_field else 16
    p = int(re.search(rb"/P\s+(-?\d+)", encrypt).group(1))
    o_value = _hex_field(encrypt, b"O")
    digest = hashlib.md5(_PAD + o_value + p.to_bytes(4, "little", signed=True) + doc_id)
    em = re.search(rb"/EncryptMetadata\s+(true|false)", encrypt)
    if r >= 4 and em is not None and em.group(1) == b"false":
        digest.update(b"\xff\xff\xff\xff")
    key = digest.digest()
    for _ in range(50):
        key = hashlib.md5(key[:key_len]).digest()
    return key[:key_len]


def _parse_objects(raw: bytes) -> dict[int, bytes]:
    return {int(m.group(1)): m.group(3) for m in _OBJECT.finditer(raw)}


def _inflate(obj_body: bytes, key: bytes | None, num: int) -> bytes | None:
    """Return the decrypted, inflated stream of one indirect object."""
    sm = _STREAM.search(obj_body)
    if sm is None:
        return None
    data = sm.group(1)
    head = obj_body.split(b"stream", 1)[0]
    if key is not None:
        length = re.search(rb"/Length\s+(\d+)", head)
        if length is not None:
            data = data[: int(length.group(1))]
        obj_key = hashlib.md5(key + num.to_bytes(3, "little") + (0).to_bytes(2, "little")).digest()
        data = _rc4(obj_key[: min(len(key) + 5, 16)], data)
    if b"/FlateDecode" in head:
        try:
            data = zlib.decompress(data)
        except zlib.error as exc:
            raise PdfError(f"object {num}: FlateDecode failed: {exc}") from exc
    return data


def _cmap(stream: bytes) -> dict[int, str]:
    """Parse the bfchar/bfrange sections of a ToUnicode CMap."""
    mapping: dict[int, str] = {}
    for section in re.finditer(rb"beginbfchar(.*?)endbfchar", stream, re.S):
        for pair in re.finditer(rb"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", section.group(1)):
            dst = pair.group(2).decode()
            mapping[int(pair.group(1), 16)] = "".join(
                chr(int(dst[i : i + 4], 16)) for i in range(0, len(dst), 4)
            )
    for section in re.finditer(rb"beginbfrange(.*?)endbfrange", stream, re.S):
        for triple in re.finditer(
            rb"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", section.group(1)
        ):
            lo, hi, base = (int(triple.group(i), 16) for i in (1, 2, 3))
            for cid in range(lo, hi + 1):
                mapping[cid] = chr(base + cid - lo)
    return mapping


def _page_order(objs: dict[int, bytes]) -> list[int]:
    """Walk the /Type/Pages /Kids tree from the catalogue, depth first."""
    pages_root = None
    for _num, body in objs.items():
        head = body.split(b"stream", 1)[0]
        if b"/Type/Catalog" in head:
            m = re.search(rb"/Pages\s+(\d+)\s+\d+\s+R", head)
            if m:
                pages_root = int(m.group(1))
                break
    order: list[int] = []

    def walk(num: int, seen: set[int]) -> None:
        if num in seen:
            return
        seen.add(num)
        body = objs.get(num)
        if body is None:
            return
        head = body.split(b"stream", 1)[0]
        if re.search(rb"/Type\s*/Pages\b", head):
            kids = re.search(rb"/Kids\s*\[(.*?)\]", head, re.S)
            if kids:
                for ref in re.finditer(rb"(\d+)\s+\d+\s+R", kids.group(1)):
                    walk(int(ref.group(1)), seen)
        elif re.search(rb"/Type\s*/Page\b", head):
            order.append(num)

    if pages_root is not None:
        walk(pages_root, set())
    return order


def _parse_widths(cid_font: bytes) -> tuple[float, dict[int, float]]:
    """Extract /DW and /W from a CIDFont dictionary -> (default width, per-CID widths)."""
    dw = 1000.0
    m = re.search(rb"/DW\s+(" + _NUM + rb")", cid_font)
    if m:
        dw = float(m.group(1))
    widths: dict[int, float] = {}
    wm = re.search(rb"/W\s*\[(.*?)\]", cid_font, re.S)
    if wm:
        tokens = re.findall(_NUM + rb"|[\[\]]", wm.group(1))
        i = 0
        while i < len(tokens):
            if tokens[i + 1 : i + 2] == [b"["]:
                cid = int(tokens[i])
                i += 2
                while i < len(tokens) and tokens[i] != b"]":
                    widths[cid] = float(tokens[i])
                    cid += 1
                    i += 1
                i += 1
            elif tokens[i] == b"[":
                i += 1  # stray bracket; skip defensively
            else:
                lo, hi, width = int(tokens[i]), int(tokens[i + 1]), float(tokens[i + 2])
                for cid in range(lo, hi + 1):
                    widths[cid] = width
                i += 3
    return dw / 1000.0, widths


class FontMetrics:
    """Advance widths read from the embedded TrueType font program (FontFile2).

    The exporting word processors write unreliable /DW defaults for their
    subset fonts, so word-gap detection reads the real ``hmtx`` table from the
    embedded font instead. Only the three tables that carry advance widths are
    parsed (head, hhea, hmtx); CID-to-GID mapping is assumed to be
    ``/CIDToGIDMap /Identity``, refusing anything else.
    """

    def __init__(self, units_per_em: int, advances: dict[int, int], default_advance: int) -> None:
        self.units_per_em = units_per_em
        self.advances = advances
        self.default_advance = default_advance

    def advance(self, cid: int) -> float:
        """Advance width in em units for a CID that maps to the same GID."""
        return self.advances.get(cid, self.default_advance) / self.units_per_em


def _read_font_metrics(font_program: bytes) -> FontMetrics:
    """Parse head/hhea/hmtx from an sfnt TrueType font file."""
    (num_tables,) = struct.unpack(">H", font_program[4:6])
    tables: dict[bytes, tuple[int, int]] = {}
    for i in range(num_tables):
        off = 12 + 16 * i
        tag = font_program[off : off + 4]
        offset, length = struct.unpack(">II", font_program[off + 8 : off + 16])
        tables[tag] = (offset, length)
    for required in (b"head", b"hhea", b"hmtx"):
        if required not in tables:
            raise PdfError(f"embedded font lacks the {required.decode()} table")
    head_off, _ = tables[b"head"]
    (units_per_em,) = struct.unpack(">H", font_program[head_off + 18 : head_off + 20])
    hhea_off, _ = tables[b"hhea"]
    (num_h_metrics,) = struct.unpack(">H", font_program[hhea_off + 34 : hhea_off + 36])
    hmtx_off, _ = tables[b"hmtx"]
    advances: dict[int, int] = {}
    for gid in range(num_h_metrics):
        (advance,) = struct.unpack(">H", font_program[hmtx_off + 4 * gid : hmtx_off + 4 * gid + 2])
        advances[gid] = advance
    return FontMetrics(units_per_em, advances, advances.get(num_h_metrics - 1, units_per_em // 2))


def _resolve_fonts(
    objs: dict[int, bytes], page_head: bytes, key: bytes | None
) -> dict[bytes, tuple[dict[int, str], float, float]]:
    """Page font alias -> (ToUnicode mapping, default advance, per-CID advances).

    Advances are expressed in em units (fraction of the font size). They come
    from the embedded font program; the PDF /W array is only used as a
    fallback when there is no embedded program.
    """
    fonts: dict[bytes, tuple[dict[int, str], float, float]] = {}
    fm = re.search(rb"/Font\s*<<(.*?)>>", page_head, re.S)
    if fm is None:
        return fonts
    for ref in re.finditer(rb"/(\w+)\s+(\d+)\s+\d+\s+R", fm.group(1)):
        alias, font_num = ref.group(1), int(ref.group(2))
        font_obj = objs.get(font_num, b"")
        tu = re.search(rb"/ToUnicode\s+(\d+)\s+\d+\s+R", font_obj)
        mapping: dict[int, str] = {}
        if tu is not None:
            stream = _inflate(objs.get(int(tu.group(1)), b""), key, int(tu.group(1)))
            if stream is not None:
                mapping = _cmap(stream)
        df = re.search(rb"/DescendantFonts\s*\[\s*(\d+)\s+\d+\s+R\s*\]", font_obj)
        cid_font = objs.get(int(df.group(1)), b"") if df is not None else b""
        pdf_default, pdf_widths = _parse_widths(cid_font)
        default_advance = pdf_default
        advances: dict[int, float] = dict(pdf_widths)
        descriptor = re.search(rb"/FontDescriptor\s+(\d+)\s+\d+\s+R", cid_font)
        descriptor_obj = objs.get(int(descriptor.group(1)), b"") if descriptor else b""
        font_file = re.search(rb"/FontFile2\s+(\d+)\s+\d+\s+R", descriptor_obj)
        cid_map = re.search(rb"/CIDToGIDMap\s*/(\w+)", cid_font)
        if font_file is not None and (cid_map is None or cid_map.group(1) == b"Identity"):
            program = _inflate(objs.get(int(font_file.group(1)), b""), key, int(font_file.group(1)))
            if program is not None and program[:4] in (b"\x00\x01\x00\x00", b"true", b"ttcf"):
                try:
                    metrics = _read_font_metrics(program)
                    default_advance = metrics.default_advance / metrics.units_per_em
                    advances = {cid: metrics.advance(cid) for cid in set(metrics.advances)}
                except (struct.error, PdfError):
                    pass  # keep the PDF-level width estimates
        fonts[alias] = (mapping, default_advance, advances)
    return fonts


class _Pen:
    """Cursor that turns absolute glyph positions into spaces and newlines."""

    def __init__(self) -> None:
        self.x = 0.0
        self.y = 0.0
        self.end_x: float | None = None
        self.line_y: float | None = None

    def start_glyph(self, x: float, y: float, size: float) -> str:
        prefix = ""
        if self.line_y is not None and abs(y - self.line_y) > max(0.3, size * 0.25):
            prefix = "\n"
        elif self.end_x is not None and x - self.end_x > max(0.18 * size, 1.0):
            prefix = " "
        self.line_y = y
        self.y = y
        self.x = x
        return prefix

    @staticmethod
    def dedupe(pieces: list[str], addition: str) -> None:
        """Append *addition* unless the emitted text already ends in whitespace."""
        if addition == " " and pieces and pieces[-1][-1:].isspace():
            return
        pieces.append(addition)


def _decode_page(objs: dict[int, bytes], num: int, key: bytes | None) -> str:
    body = objs.get(num, b"")
    head = body.split(b"stream", 1)[0]
    fonts = _resolve_fonts(objs, head, key)
    pieces: list[str] = []
    pen = _Pen()
    mapping: dict[int, str] = {}
    default_advance, advances = 1.0, {}
    size = 0.0
    scale = 1.0
    for cm in re.finditer(rb"/Contents\s*(\[[^\]]*\]|\d+\s+\d+\s+R)", head):
        for ref in re.finditer(rb"(\d+)\s+\d+\s+R", cm.group(1)):
            stream = _inflate(objs.get(int(ref.group(1)), b""), key, int(ref.group(1)))
            if stream is None:
                continue
            for tok in _SHOW_TOKEN.finditer(stream):
                glyph_str, font_sel, sel_size, _tm_a, tm_f, td_x, td_y, td_op = tok.groups()
                if font_sel is not None:
                    metrics = fonts.get(font_sel)
                    if metrics is not None:
                        mapping, default_advance, advances = metrics
                    size = float(sel_size)
                    continue
                if glyph_str is None and td_op is None and tm_f is None:
                    continue
                if tm_f is not None:
                    # Text matrix: e/f are the absolute pen position; |a| scales advances.
                    numbers = re.findall(_NUM, tok.group(0))
                    scale = abs(float(numbers[0])) or 1.0
                    pen.x, pen.y = float(numbers[4]), float(numbers[5])
                elif td_op is not None:
                    pen.x += float(td_x)
                    pen.y += float(td_y)
                if glyph_str is None:
                    pen.dedupe(pieces, pen.start_glyph(pen.x, pen.y, size * scale))
                    continue
                effective = size * scale
                pen.dedupe(pieces, pen.start_glyph(pen.x, pen.y, effective))
                if len(glyph_str) % 4 != 0:
                    glyph_str += "0"
                for i in range(0, len(glyph_str), 4):
                    cid = int(glyph_str[i : i + 4], 16)
                    pieces.append(mapping.get(cid, ""))
                    pen.end_x = pen.x + advances.get(cid, default_advance) * effective
                    pen.x = pen.end_x
    return "".join(pieces)


def extract_pages(path: str | Path) -> list[str]:
    """Return the decoded text layer of each page, in page-tree order."""
    raw = Path(path).read_bytes()
    objs = _parse_objects(raw)
    trailer = raw[raw.rfind(b"trailer") :]
    key = None
    enc_ref = re.search(rb"/Encrypt\s+(\d+)\s+\d+\s+R", trailer)
    if enc_ref is not None:
        encrypt = objs.get(int(enc_ref.group(1)), b"")
        id_match = re.search(rb"/ID\s*\[\s*<([0-9A-Fa-f]+)>", trailer)
        if not id_match:
            raise PdfError("encrypted document without a trailer /ID")
        key = _file_key(encrypt, bytes.fromhex(id_match.group(1).decode()))
    pages = _page_order(objs)
    if not pages:
        raise PdfError("no /Type/Page objects found; document tree unsupported")
    return [_decode_page(objs, num, key) for num in pages]
