from fastapi import APIRouter, HTTPException, Depends

from database import db
from utils.auth import get_current_user
from db.queries.notifications import get_user_notifications, mark_notifications_read

router = APIRouter(prefix="/api")


@router.get("/notifications")
def get_notifications(user_id: int):
    """Fetch all notifications for a user.

    Args:
        user_id: The ID of the user whose notifications to fetch.

    Returns:
        JSON with ok=True, a 'notifications' list, and 'unread_count'.

    Raises:
        HTTPException(500): On unexpected server error.
    """
    try:
        with db() as client:
            notifications = get_user_notifications(client, user_id)
        unread_count = sum(1 for n in notifications if not n["is_read"])
        return {"ok": True, "notifications": notifications, "unread_count": unread_count}
    except Exception as e:
        print(f"Get notifications error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.post("/notifications/read")
def mark_all_read(_: dict, current_user_id: int = Depends(get_current_user)):
    """Mark all notifications as read for the authenticated user.

    Args:
        _: Unused request body (required by FastAPI for POST endpoints).
        current_user_id: Injected from JWT.

    Returns:
        JSON with ok=True.

    Raises:
        HTTPException(500): On unexpected server or database error.
    """
    try:
        with db() as client:
            with client.transaction() as tx:
                mark_notifications_read(tx, current_user_id)
        return {"ok": True}
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Mark notifications read error: {e}")
        raise HTTPException(status_code=500, detail="Server error")
