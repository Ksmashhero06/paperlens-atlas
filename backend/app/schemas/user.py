from datetime import datetime
import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: Optional[str] = None
    is_admin: bool = False
    is_active: bool = True
    provider: str = "email"
    picture: Optional[str] = None
    last_login_at: Optional[datetime] = None
    created_at: datetime
    analyses_count: int = 0

    class Config:
        from_attributes = True


class OAuthLoginRequest(BaseModel):
    provider: str  # "google" or "microsoft"
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    provider_id: Optional[str] = None
    picture: Optional[str] = None
    credential: Optional[str] = None  # Google GSI JWT ID token


class UserStatusUpdate(BaseModel):
    is_active: bool

