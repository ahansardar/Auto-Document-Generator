from fastapi import HTTPException

from app.models.variable import TemplateVariable


def validate_generation_data(variables: list[TemplateVariable], data: dict) -> dict[str, str]:
    errors: list[str] = []
    merged: dict[str, str] = {}
    for variable in variables:
        value = data.get(variable.name, variable.default_value)
        if variable.required and (value is None or str(value).strip() == ""):
            errors.append(f"{variable.name} is required")
        merged[variable.name] = "" if value is None else str(value)
    if errors:
        raise HTTPException(status_code=422, detail=errors)
    return merged


def validate_batch_rows(variables: list[TemplateVariable], rows: list[dict]) -> tuple[list[dict], list[dict]]:
    valid_rows: list[dict] = []
    errors: list[dict] = []
    required = [variable.name for variable in variables if variable.required]
    for index, row in enumerate(rows, start=1):
        row_errors = [name for name in required if not str(row.get(name, "")).strip()]
        if row_errors:
            errors.append({"row": index, "errors": [f"{name} is required" for name in row_errors]})
        else:
            valid_rows.append(row)
    return valid_rows, errors
