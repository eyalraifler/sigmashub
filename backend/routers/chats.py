from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel

from database import db
from utils.auth import get_current_user, SECRET_KEY, ALGORITHM
from jose import JWTError, jwt
from db.queries.chats import (
    get_user_chats, get_chat_by_id, get_chat_members, is_chat_member,
    get_chat_messages, get_new_messages, create_chat, add_chat_member,
    send_message, find_direct_chat,
    get_unread_chat_count, mark_chat_read,
)
from db.queries.users import get_user_by_id
from db.queries.notifications import notify_message_sent

router = APIRouter(prefix="/api")


class CreateChatRequest(BaseModel):
    member_ids: list[int]


class SendMessageRequest(BaseModel):
    text: str


@router.get("/chats")
def list_chats(current_user_id: int = Depends(get_current_user)):
    """List all chats for the authenticated user, enriched with last message and member info.

    Args:
        current_user_id: Injected from JWT.

    Returns:
        JSON with ok=True and a 'chats' list ordered by most recent activity.

    Raises:
        HTTPException(500): On unexpected server error.
    """
    try:
        with db() as client:
            chats = get_user_chats(client, current_user_id)
        return {"ok": True, "chats": chats}
    except Exception as e:
        print(f"List chats error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.post("/chats")
def create_new_chat(req: CreateChatRequest, current_user_id: int = Depends(get_current_user)):
    """Create a DM or return the existing one between the two users."""
    member_ids = list(set(req.member_ids))
    if current_user_id not in member_ids:
        member_ids.append(current_user_id)

    if len(member_ids) != 2:
        raise HTTPException(status_code=400, detail="Direct messages require exactly 2 members")

    other_id = next(m for m in member_ids if m != current_user_id)

    try:
        with db() as client:
            existing = find_direct_chat(client, current_user_id, other_id)
            if existing:
                return {"ok": True, "chat_id": existing['id'], "existed": True}

            other_user = get_user_by_id(client, other_id)
            if not other_user:
                raise HTTPException(status_code=404, detail="User not found")

            with client.transaction() as tx:
                chat_id = create_chat(tx)
                add_chat_member(tx, chat_id, current_user_id)
                add_chat_member(tx, chat_id, other_id)

        return {"ok": True, "chat_id": chat_id, "existed": False}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create chat error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.get("/chats/unread-count")
def unread_count(request: Request):
    """Return unread chat count without requiring auth (returns 0 if unauthenticated)."""
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        return {"ok": True, "count": 0}
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        current_user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        return {"ok": True, "count": 0}
    try:
        with db() as client:
            count = get_unread_chat_count(client, current_user_id)
        return {"ok": True, "count": count}
    except Exception as e:
        print(f"Unread count error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.post("/chats/{chat_id}/read")
def mark_read(chat_id: int, current_user_id: int = Depends(get_current_user)):
    """Mark all messages in a chat as read up to the latest message.

    Args:
        chat_id: The ID of the chat to mark as read.
        current_user_id: Injected from JWT — must be a member of the chat.

    Returns:
        JSON with ok=True.

    Raises:
        HTTPException(403): If the user is not a member of the chat.
        HTTPException(500): On unexpected server error.
    """
    try:
        with db() as client:
            if not is_chat_member(client, chat_id, current_user_id):
                raise HTTPException(status_code=403, detail="Not a member of this chat")
            last = client.execute(
                "SELECT id FROM messages WHERE chat_id=%s ORDER BY id DESC LIMIT 1",
                (chat_id,),
            )['data']
            if last:
                with client.transaction() as tx:
                    mark_chat_read(tx, chat_id, current_user_id, last[0]['id'])
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Mark read error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.get("/chats/{chat_id}")
def get_chat(
    chat_id: int,
    limit: int = 50,
    offset: int = 0,
    current_user_id: int = Depends(get_current_user),
):
    """Fetch a chat's details, member list, and paginated messages.

    Args:
        chat_id: The ID of the chat to fetch.
        limit: Maximum number of messages to return (default 50).
        offset: Number of messages to skip for pagination (default 0).
        current_user_id: Injected from JWT — must be a member of the chat.

    Returns:
        JSON with ok=True, 'chat' metadata, 'members' list, and 'messages' list.

    Raises:
        HTTPException(403): If the user is not a member of the chat.
        HTTPException(404): If the chat does not exist.
        HTTPException(500): On unexpected server error.
    """
    try:
        with db() as client:
            if not is_chat_member(client, chat_id, current_user_id):
                raise HTTPException(status_code=403, detail="Not a member of this chat")
            chat = get_chat_by_id(client, chat_id)
            if not chat:
                raise HTTPException(status_code=404, detail="Chat not found")
            members = get_chat_members(client, chat_id)
            messages = get_chat_messages(client, chat_id, limit, offset)

            other = next((m for m in members if m['user_id'] != current_user_id), None)
            chat['display_name'] = other['username'] if other else "Unknown"
            chat['display_image'] = other['profile_image_url'] if other else None

        return {"ok": True, "chat": chat, "members": members, "messages": messages}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get chat error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.get("/chats/{chat_id}/messages")
def get_messages(
    chat_id: int,
    after_id: int = 0,
    current_user_id: int = Depends(get_current_user),
):
    """Fetch messages for a chat. Supports polling via after_id.

    Args:
        chat_id: The ID of the chat to fetch messages from.
        after_id: If > 0, return only messages with id > after_id (for polling).
                  If 0, return the latest 50 messages.
        current_user_id: Injected from JWT — must be a member of the chat.

    Returns:
        JSON with ok=True and a 'messages' list.

    Raises:
        HTTPException(403): If the user is not a member of the chat.
        HTTPException(500): On unexpected server error.
    """
    try:
        with db() as client:
            if not is_chat_member(client, chat_id, current_user_id):
                raise HTTPException(status_code=403, detail="Not a member of this chat")
            if after_id > 0:
                msgs = get_new_messages(client, chat_id, after_id)
            else:
                msgs = get_chat_messages(client, chat_id, 50, 0)
        return {"ok": True, "messages": msgs}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get messages error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.post("/chats/{chat_id}/messages")
def post_message(
    chat_id: int,
    req: SendMessageRequest,
    current_user_id: int = Depends(get_current_user),
):
    """Send a message in a chat and notify the recipient.

    Args:
        chat_id: The ID of the chat to post to.
        req: Contains the message 'text'.
        current_user_id: Injected from JWT — must be a member of the chat.

    Returns:
        JSON with ok=True and the new 'message_id'.

    Raises:
        HTTPException(400): If the message text is empty.
        HTTPException(403): If the user is not a member of the chat.
        HTTPException(500): On unexpected server error.
    """
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    try:
        with db() as client:
            if not is_chat_member(client, chat_id, current_user_id):
                raise HTTPException(status_code=403, detail="Not a member of this chat")
            sender = get_user_by_id(client, current_user_id)
            members = get_chat_members(client, chat_id)
            with client.transaction() as tx:
                msg_id = send_message(tx, chat_id, current_user_id, text)
            recipient = next((m for m in members if m['user_id'] != current_user_id), None)
            if recipient and sender:
                notify_message_sent(client, recipient['user_id'], sender, chat_id)
        return {"ok": True, "message_id": msg_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Send message error: {e}")
        raise HTTPException(status_code=500, detail="Server error")
