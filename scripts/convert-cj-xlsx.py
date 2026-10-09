"""Convert a huge CJdropshipping .xlsx export into a small CSV the dashboard can import.

CJ's Excel workbooks embed every product photo, which balloons them to hundreds
of MB even though the product rows are only a few MB. This script streams just
the worksheet data (ignoring all embedded media), skips CJ's banner row above
the real headers, and writes a plain CSV into data/1-cj-downloads/.

Usage:
    python scripts/convert-cj-xlsx.py "C:\\path\\to\\CJ-Product-....xlsx" [output.csv]

Needs only the Python standard library.
"""
import csv
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
HEADER_HINTS = ("products name", "product name", "spu", "sku")


def column_index(cell_ref):
    match = re.match(r"([A-Z]+)", cell_ref or "")
    number = 0
    for letter in (match.group(1) if match else "A"):
        number = number * 26 + ord(letter) - 64
    return number - 1


def load_shared_strings(archive):
    try:
        root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    return [
        "".join(t.text or "" for t in si.iter(f"{NS}t"))
        for si in root.findall(f"{NS}si")
    ]


def iter_rows(archive, sheet_path, shared):
    for _event, element in ET.iterparse(archive.open(sheet_path)):
        if element.tag != f"{NS}row":
            continue
        values = {}
        for cell in element.findall(f"{NS}c"):
            value_el = cell.find(f"{NS}v")
            inline_el = cell.find(f"{NS}is")
            if inline_el is not None:
                text = "".join(t.text or "" for t in inline_el.iter(f"{NS}t"))
            elif value_el is None:
                text = ""
            elif cell.get("t") == "s":
                text = shared[int(value_el.text)]
            else:
                text = value_el.text or ""
            values[column_index(cell.get("r"))] = text
        element.clear()
        width = max(values) + 1 if values else 0
        yield [values.get(i, "") for i in range(width)]


def looks_like_header(row):
    lowered = " | ".join(cell.lower() for cell in row)
    return sum(hint in lowered for hint in HEADER_HINTS) >= 2


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    source = Path(sys.argv[1])
    if len(sys.argv) >= 3:
        target = Path(sys.argv[2])
    else:
        downloads = Path(__file__).resolve().parent.parent / "data" / "1-cj-downloads"
        downloads.mkdir(parents=True, exist_ok=True)
        target = downloads / (source.stem + ".csv")

    archive = zipfile.ZipFile(source)
    shared = load_shared_strings(archive)

    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    sheet_count = len(list(workbook.iter(f"{NS}sheet")))
    sheet_path = "xl/worksheets/sheet1.xml"
    if sheet_count > 1:
        print(f"Note: workbook has {sheet_count} sheets; converting the first one only.")

    header = None
    data_rows = 0
    skipped_before_header = 0
    with open(target, "w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.writer(handle)
        for row in iter_rows(archive, sheet_path, shared):
            if header is None:
                if looks_like_header(row):
                    header = row
                    writer.writerow(header)
                else:
                    skipped_before_header += 1
                    if skipped_before_header > 10:
                        sys.exit("Could not find the CJ header row in the first 10 rows.")
                continue
            if not any(cell.strip() for cell in row):
                continue
            writer.writerow(row[: len(header)] + [""] * max(0, len(header) - len(row)))
            data_rows += 1

    size_mb = target.stat().st_size / 1e6
    print(f"Done. {data_rows} product rows -> {target} ({size_mb:.1f}MB)")
    print(f"Skipped {skipped_before_header} banner row(s) above the headers.")
    print("Embedded photos are not carried over; use the dashboard's per-product Photos button for your picks.")


if __name__ == "__main__":
    main()
