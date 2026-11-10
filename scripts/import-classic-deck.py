"""Rebuild the local CC0 classic card assets from the preserved source ZIP."""
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent
SVG = "http://www.w3.org/2000/svg"
XLINK = "http://www.w3.org/1999/xlink"
ET.register_namespace("", SVG)
ET.register_namespace("xlink", XLINK)
count = 0
text_count = 0
with ZipFile(ROOT / "docs/classic-playing-cards-source.zip") as archive:
    for name in archive.namelist():
        if not re.fullmatch(r"[A2-9TJQK][CDHS]\.svg", name):
            continue
        root = ET.fromstring(archive.read(name))
        # Conventional pip cards have a plain white ground, without an inset box.
        if name[0] not in "JQK":
            for child in list(root):
                if child.tag == f"{{{SVG}}}use" and child.get(f"{{{XLINK}}}href", "").startswith("#X"):
                    root.remove(child)
        # Retain source attribution in CREDITS rather than printing a URL on an ace.
        for parent in root.iter():
            for child in list(parent):
                if child.tag == f"{{{SVG}}}text":
                    parent.remove(child)
                    text_count += 1
        ET.ElementTree(root).write(
            ROOT / "public" / ("classic-" + name), encoding="utf-8", xml_declaration=True
        )
        count += 1
assert count == 52, f"Expected 52 cards, imported {count}"
print(f"Imported {count} classic SVG faces; removed {text_count} printed text elements.")
