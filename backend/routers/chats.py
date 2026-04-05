from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from database import db
from utils.auth import get_current_user
from db.queries.chats import (
    get_user_chats, get_chat_by_id, get_chat_members, is_chat_member,
    get_chat_messages, get_new_messages, create_chat, add_chat_member,
    remove_chat_member, send_message, find_direct_chat,
    get_unread_chat_count, mark_chat_read,
)
from db.queries.users import get_user_by_id

router = APIRouter(prefix="/api")


class CreateChatRequest(BaseModel):
    member_ids: list[int]
    name: Optional[str] = None
    is_group: bool = False


class SendMessageRequest(BaseModel):
    text: str


class AddMemberRequest(BaseModel):
    user_id: int


@router.get("/chats")
def list_chats(current_user_id: int = Depends(get_current_user)):
    try:
        with db() as client:
            chats = get_user_chats(client, current_user_id)
        return {"ok": True, "chats": chats}
    except Exception as e:
        print(f"List chats error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.post("/chats")
def create_new_chat(req: CreateChatRequest, current_user_id: int = Depends(get_current_user)):
    member_ids = list(set(req.member_ids))
    if current_user_id not in member_ids:
        member_ids.append(current_user_id)

    if len(member_ids) < 2:
        raise HTTPException(status_code=400, detail="Chat needs at least 2 members")

    try:
        with db() as client:
            # For DMs, return existing chat if one already exists
            if not req.is_group and len(member_ids) == 2:
                other_id = next(m for m in member_ids if m != current_user_id)
                existing = find_direct_chat(client, current_user_id, other_id)
                if existing:
                    return {"ok": True, "chat_id": existing['id'], "existed": True}

            for uid in member_ids:
                user = get_user_by_id(client, uid)
                if not user:
                    raise HTTPException(status_code=404, detail=f"User {uid} not found")

            with client.transaction() as tx:
                chat_id = create_chat(tx, req.name if req.is_group else None, req.is_group)
                for uid in member_ids:
                    add_chat_member(tx, chat_id, uid)

        return {"ok": True, "chat_id": chat_id, "existed": False}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create chat error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.get("/chats/unread-count")
def unread_count(current_user_id: int = Depends(get_current_user)):
    try:
        with db() as client:
            count = get_unread_chat_count(client, current_user_id)
        return {"ok": True, "count": count}
    except Exception as e:
        print(f"Unread count error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.post("/chats/{chat_id}/read")
def mark_read(chat_id: int, current_user_id: int = Depends(get_current_user)):
    try:
        with db() as client:
            if not is_chat_member(client, chat_id, current_user_id):
                raise HTTPException(status_code=403, detail="Not a member of this chat")
            msgs = get_chat_messages(client, chat_id, limit=1, offset=0)
            # get the actual last message id
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
    try:
        with db() as client:
            if not is_chat_member(client, chat_id, current_user_id):
                raise HTTPException(status_code=403, detail="Not a member of this chat")
            chat = get_chat_by_id(client, chat_id)
            if not chat:
                raise HTTPException(status_code=404, detail="Chat not found")
            members = get_chat_members(client, chat_id)
            messages = get_chat_messages(client, chat_id, limit, offset)

            if not chat['is_group']:
                other = next((m for m in members if m['user_id'] != current_user_id), None)
                chat['display_name'] = other['username'] if other else "Unknown"
                chat['display_image'] = other['profile_image_url'] if other else None
            else:
                chat['display_name'] = chat['name']
                chat['display_image'] = None

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
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    try:
        with db() as client:
            if not is_chat_member(client, chat_id, current_user_id):
                raise HTTPException(status_code=403, detail="Not a member of this chat")
            with client.transaction() as tx:
                msg_id = send_message(tx, chat_id, current_user_id, text)
        return {"ok": True, "message_id": msg_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Send message error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.post("/chats/{chat_id}/members")
def add_member(
    chat_id: int,
    req: AddMemberRequest,
    current_user_id: int = Depends(get_current_user),
):
    try:
        with db() as client:
            if not is_chat_member(client, chat_id, current_user_id):
                raise HTTPException(status_code=403, detail="Not a member of this chat")
            chat = get_chat_by_id(client, chat_id)
            if not chat or not chat['is_group']:
                raise HTTPException(status_code=400, detail="Can only add members to group chats")
            user = get_user_by_id(client, req.user_id)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            with client.transaction() as tx:
                add_chat_member(tx, chat_id, req.user_id)
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Add member error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.delete("/chats/{chat_id}/leave")
def leave_chat(chat_id: int, current_user_id: int = Depends(get_current_user)):
    try:
        with db() as client:
            if not is_chat_member(client, chat_id, current_user_id):
                raise HTTPException(status_code=403, detail="Not a member of this chat")
            with client.transaction() as tx:
                remove_chat_member(tx, chat_id, current_user_id)
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Leave chat error: {e}")
        raise HTTPException(status_code=500, detail="Server error")
