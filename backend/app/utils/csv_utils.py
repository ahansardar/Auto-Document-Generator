import csv
import io
import json


def parse_csv_to_rows(content: bytes) -> list[dict[str, str]]:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    return [dict(row) for row in reader]


def parse_json_to_rows(content: bytes) -> list[dict]:
    payload = json.loads(content.decode("utf-8"))
    if isinstance(payload, dict) and isinstance(payload.get("rows"), list):
        return payload["rows"]
    if isinstance(payload, list):
        return payload
    raise ValueError("JSON upload must be an array or an object with a rows array")
