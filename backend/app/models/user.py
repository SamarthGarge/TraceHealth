"""
User-related Pydantic schemas.
password_hash is NEVER included in any response model — see Backend doc §4.5.
"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime


class UserOut(BaseModel):
    """Safe user representation returned to the client. No sensitive fields."""
    id: str
    name: str
    email: EmailStr
    role: str = "user"
    consentDataStorage: bool = False
    createdAt: Optional[datetime] = None

    model_config = ConfigDict(populate_by_name=True)
