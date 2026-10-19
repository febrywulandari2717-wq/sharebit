import json
import threading
import urllib.request

from flask import current_app, g


def _post(url, key, payload):
    try:
        req = urllib.request.Request(
            url, data=json.dumps(payload).encode(), method="POST",
            headers={"Content-Type": "application/json", "Accept": "application/json", "X-Service-Key": key},
        )
        urllib.request.urlopen(req, timeout=3).read()
    except Exception:  # noqa: BLE001 - best effort, tidak boleh menggagalkan aksi admin
        pass


def audit(action, target_type, target_id, **meta):
    """Catat aksi admin ke Donation Service di thread terpisah (tidak memperlambat respons)."""
    if getattr(g, "role", None) != "admin":
        return
    cfg = current_app.config
    if not cfg.get("DONATION_SERVICE_KEY"):
        return
    payload = {"actor_id": g.user_id, "actor_role": "admin", "action": action, "target_type": target_type,
               "target_id": str(target_id), "meta": meta}
    threading.Thread(target=_post, args=(f"{cfg['DONATION_SERVICE_URL']}/api/v1/internal/audit", cfg["DONATION_SERVICE_KEY"], payload),
                     daemon=True).start()
