#!/usr/bin/env python3
"""Extrai códigos e habilidades da BNCC oficial para o catálogo embarcado."""

import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader

CODE = re.compile(r"\(?((?:EI\d{2}[A-Z]{2}\d{2}|EF\d{2}[A-Z]{2}\d{2}|EM\d{2}(?:LP\d{2}|[A-Z]{3}\d{3})))\)?")
NOISE = re.compile(r"\b(?:BASE NACIONAL COMUM CURRICULAR|ENSINO FUNDAMENTAL|ENSINO MÉDIO|UNIDADES TEMÁTICAS|OBJETOS DE CONHECIMENTO|HABILIDADES)\b", re.I)


def clean(value):
    value = re.sub(r"\s+", " ", value).strip(" \t\n.;–-")
    value = re.sub(r"^\d{1,3}\s+", "", value)
    # Em tabelas, o extrator pode colocar o objeto de conhecimento da linha seguinte
    # depois da habilidade. A habilidade oficial termina antes desse novo período.
    boundary = re.search(r"\.\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç])", value)
    if boundary:
        value = value[: boundary.start() + 1]
    value = re.sub(r"\s+\d{1,3}$", "", value).strip()
    return value


def score(value):
    if len(value) < 20:
        return -1000
    result = min(len(value), 700)
    if len(value) > 1100:
        result -= len(value)
    result -= 180 * len(NOISE.findall(value))
    if re.match(r"^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]", value):
        result += 100
    return result


def main(source, destination):
    reader = PdfReader(source)
    found = {}
    for page_number, page in enumerate(reader.pages, 1):
        text = page.extract_text() or ""
        matches = list(CODE.finditer(text))
        for index, match in enumerate(matches):
            end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
            description = clean(text[match.end():end])
            if score(description) < 0:
                continue
            code = match.group(1)
            candidate = {"code": code, "description": description, "page": page_number}
            if code not in found or score(description) > score(found[code]["description"]):
                found[code] = candidate
    catalog = sorted(found.values(), key=lambda item: item["code"])
    body = "// Gerado de BNCC_EI_EF_110518_versaofinal_site.pdf (MEC, 2018).\n"
    body += "// Não editar manualmente; execute scripts/extract-bncc-catalog.py.\n"
    body += "export const BNCC_CATALOG = Object.freeze(" + json.dumps(catalog, ensure_ascii=False, separators=(",", ":")) + ");\n"
    Path(destination).write_text(body, encoding="utf-8")
    print(f"{len(catalog)} habilidades gravadas em {destination}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("uso: extract-bncc-catalog.py origem.pdf destino.js")
    main(sys.argv[1], sys.argv[2])
