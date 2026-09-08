from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.entities import User
from app.schemas.api import AIAnswer, AIQuery
from app.services.ai_service import ask_ai, build_context

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post("/ask", response_model=AIAnswer)
async def ask(payload: AIQuery, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    context = build_context(db, payload.habitation_id, payload.district)
    try:
        answer, provider = await ask_ai(payload.question, context)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return AIAnswer(answer=answer, context_summary=context, provider=provider)
