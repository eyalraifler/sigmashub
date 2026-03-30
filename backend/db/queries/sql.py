def placeholders(items: list) -> str:
    """Returns a comma-separated string of %s for parameterized IN clauses."""
    return ",".join(["%s"] * len(items))


def _one(rows: list):
    """Returns the first row from a result list, or None."""
    return rows[0] if rows else None
