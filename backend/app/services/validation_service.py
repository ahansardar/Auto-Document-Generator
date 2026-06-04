from fastapi import HTTPException

from app.models.variable import TemplateVariable
from app.services.random_service import generate_from_pattern


def validate_generation_data(variables: list[TemplateVariable], data: dict, preserve_extra_fields: bool = False) -> dict[str, str]:
    errors: list[str] = []
    merged: dict[str, str] = {str(key): "" if value is None else str(value) for key, value in data.items()} if preserve_extra_fields else {}
    for variable in variables:
        value = data.get(variable.name, variable.default_value)
        if (value is None or str(value).strip() == "") and variable.generator_enabled:
            value = generate_from_pattern(variable.generator_pattern)
        if variable.required and (value is None or str(value).strip() == ""):
            errors.append(f"{variable.name} is required")
        merged[variable.name] = "" if value is None else str(value)
    if errors:
        raise HTTPException(status_code=422, detail=errors)
    return merged


def validate_batch_rows(variables: list[TemplateVariable], rows: list[dict]) -> tuple[list[dict], list[dict]]:
    valid_rows: list[dict] = []
    errors: list[dict] = []
    required = [variable.name for variable in variables if variable.required and not variable.generator_enabled]
    for index, row in enumerate(rows, start=1):
        row_errors = [name for name in required if not str(row.get(name, "")).strip()]
        if row_errors:
            errors.append({"row": index, "errors": [f"{name} is required" for name in row_errors]})
        else:
            valid_rows.append(row)
    return valid_rows, errors


def validate_batch_upload_schema(
    variables: list[TemplateVariable],
    rows: list[dict],
    allowed_extra_columns: set[str] | None = None,
    allow_unknown_columns: bool = False,
) -> None:
    if not rows:
        raise HTTPException(status_code=422, detail="Batch file must contain at least one data row")

    supplied_columns = {
        str(column).strip()
        for row in rows
        for column in row
        if column is not None and str(column).strip()
    }
    expected_columns = {variable.name for variable in variables if not variable.generator_enabled}
    generated_columns = {variable.name for variable in variables if variable.generator_enabled}
    allowed_columns = {column.strip() for column in (allowed_extra_columns or set()) if column.strip()}

    missing_columns = sorted(expected_columns - supplied_columns)
    generated_supplied = sorted(generated_columns & supplied_columns)
    unknown_columns = sorted(supplied_columns - expected_columns - generated_columns - allowed_columns)

    errors: list[str] = []
    if any(None in row for row in rows):
        errors.append("Rows contain more values than the CSV header defines")
    if missing_columns:
        errors.append(f"Missing columns: {', '.join(missing_columns)}")
    if generated_supplied:
        errors.append(f"Remove auto-generated columns: {', '.join(generated_supplied)}")
    if unknown_columns and not allow_unknown_columns:
        errors.append(f"Unknown columns: {', '.join(unknown_columns)}")

    if errors:
        expected_columns_with_extras = sorted(expected_columns | allowed_columns)
        expected = ", ".join(expected_columns_with_extras) or "no manual columns"
        if allow_unknown_columns:
            expected = f"{expected} plus optional mail/context columns"
        raise HTTPException(status_code=422, detail=[*errors, f"Expected CSV columns: {expected}"])
