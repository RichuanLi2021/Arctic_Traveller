from fastapi import APIRouter, HTTPException

from ..core.models import ChatRequest, ChatResponse
from ..core.services import generate_chat_reply

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    """
    Chat endpoint that uses LangChain + Gemini to answer questions, injecting dataset context.
    """
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    result = generate_chat_reply(message)
    return ChatResponse(
        reply=result["reply"],
        note=result["note"]
    )
