from datetime import datetime, timezone


def utcnow():
    """Waktu UTC tanpa tzinfo (disimpan apa adanya di MySQL)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ") if dt else None
