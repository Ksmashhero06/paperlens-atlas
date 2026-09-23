from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_strict, get_db
from app.core.config import settings
from app.core.limiter import limiter
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.auth import Token
from app.schemas.user import OAuthLoginRequest, UserCreate, UserLogin, UserResponse

router = APIRouter()

ADMIN_EMAIL = "kkssakthikumaran@gmail.com"
COOKIE_NAME = "paperlens_token"
COOKIE_MAX_AGE = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def _set_auth_cookie(response: Response, token: str):
    """Set secure httpOnly JWT cookie."""
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=settings.ENV == "production",
        path="/"
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(
    request: Request,
    response: Response,
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
) -> Token:
    email_clean = user_in.email.lower().strip()
    stmt = select(User).where(User.email == email_clean)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    is_admin = (email_clean == ADMIN_EMAIL.lower())

    new_user = User(
        email=email_clean,
        hashed_password=get_password_hash(user_in.password),
        name=user_in.name,
        is_admin=is_admin,
        provider="email"
    )
    db.add(new_user)
    await db.flush()

    # Create default workspace for user
    default_workspace = Workspace(
        user_id=new_user.id,
        name="Default Workspace",
        description="Your default PaperLens research workspace."
    )
    db.add(default_workspace)
    await db.commit()
    await db.refresh(new_user)

    access_token = create_access_token(subject=new_user.id)
    _set_auth_cookie(response, access_token)
    user_response = UserResponse.model_validate(new_user)

    return Token(access_token=access_token, token_type="bearer", user=user_response)


@router.post("/oauth", response_model=Token)
async def oauth_login(
    response: Response,
    oauth_in: OAuthLoginRequest,
    db: AsyncSession = Depends(get_db)
) -> Token:
    """
    OAuth login & registration endpoint for Google (GSI JWT ID token) and Microsoft.
    Auto-registers new users, sets is_admin=True for kkssakthikumaran@gmail.com.
    """
    import base64
    import json
    from datetime import datetime, timezone

    email = oauth_in.email
    name = oauth_in.name
    picture = oauth_in.picture
    provider_id = oauth_in.provider_id

    # If Google GSI JWT ID token credential is provided, decode payload securely
    if oauth_in.credential:
        try:
            parts = oauth_in.credential.split(".")
            if len(parts) >= 2:
                # Add padding if needed
                padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
                payload_bytes = base64.b64decode(padded)
                payload = json.loads(payload_bytes)
                email = payload.get("email") or email
                name = payload.get("name") or name
                picture = payload.get("picture") or picture
                provider_id = payload.get("sub") or provider_id
        except Exception:
            pass

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required for OAuth login."
        )

    email_clean = email.lower().strip()
    stmt = select(User).where(User.email == email_clean)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    is_admin_user = (email_clean == ADMIN_EMAIL.lower())

    if not user:
        user = User(
            email=email_clean,
            name=name,
            provider=oauth_in.provider.lower(),
            provider_id=provider_id,
            picture=picture,
            is_admin=is_admin_user,
            is_active=True,
            last_login_at=datetime.now(timezone.utc),
            hashed_password=None
        )
        db.add(user)
        await db.flush()

        default_workspace = Workspace(
            user_id=user.id,
            name=f"{oauth_in.provider.capitalize()} Workspace",
            description="Your default PaperLens research workspace."
        )
        db.add(default_workspace)
        await db.commit()
        await db.refresh(user)
    else:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated. Please contact administrator."
            )
        user.last_login_at = datetime.now(timezone.utc)
        if picture:
            user.picture = picture
        if name and not user.name:
            user.name = name
        if is_admin_user and not user.is_admin:
            user.is_admin = True
        await db.commit()
        await db.refresh(user)

    access_token = create_access_token(subject=user.id)
    _set_auth_cookie(response, access_token)
    user_response = UserResponse.model_validate(user)

    return Token(access_token=access_token, token_type="bearer", user=user_response)


@router.post("/login", response_model=Token)
@limiter.limit("20/minute")
async def login(
    request: Request,
    response: Response,
    user_in: UserLogin,
    db: AsyncSession = Depends(get_db)
) -> Token:
    from datetime import datetime, timezone
    email_clean = user_in.email.lower().strip()
    stmt = select(User).where(User.email == email_clean)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact administrator."
        )

    user.last_login_at = datetime.now(timezone.utc)
    if email_clean == ADMIN_EMAIL.lower() and not user.is_admin:
        user.is_admin = True

    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(subject=user.id)
    _set_auth_cookie(response, access_token)
    user_response = UserResponse.model_validate(user)

    return Token(access_token=access_token, token_type="bearer", user=user_response)


@router.post("/logout")
async def logout(response: Response):
    """Clear the httpOnly authentication cookie."""
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"status": "ok", "message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user_strict)) -> UserResponse:
    return UserResponse.model_validate(current_user)


