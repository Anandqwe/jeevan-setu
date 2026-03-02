import bcrypt
import secrets
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

from database import get_db
from models import User, RefreshToken

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token with user claims."""
    to_encode = data.copy()
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: int, db: Session) -> str:
    """Create a refresh token and store it in the database."""
    token_str = secrets.token_urlsafe(64)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    refresh_token = RefreshToken(
        user_id=user_id,
        token=token_str,
        expires_at=expires_at,
    )
    db.add(refresh_token)
    db.commit()
    return token_str


def rotate_refresh_token(old_token: str, db: Session) -> tuple[str, str] | None:
    """
    Validate a refresh token, revoke it, and issue new access + refresh tokens.
    Returns (access_token, new_refresh_token) or None if invalid.
    """
    token_record = db.query(RefreshToken).filter(
        RefreshToken.token == old_token,
        RefreshToken.revoked == False,
    ).first()

    if not token_record:
        return None

    if token_record.expires_at < datetime.utcnow():
        token_record.revoked = True
        db.commit()
        return None

    # Revoke the old token
    token_record.revoked = True
    db.commit()

    # Get user
    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        return None

    # Issue new tokens
    access_token = create_access_token(data={"sub": user.id, "role": user.role.value})
    new_refresh = create_refresh_token(user.id, db)

    return access_token, new_refresh


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """FastAPI dependency: extract and validate the current user from JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


def require_role(*roles):
    """
    FastAPI dependency factory: restrict endpoint access to specific roles.
    Usage: Depends(require_role("ems", "hospital"))
    """
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role.value not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(roles)}"
            )
        return current_user
    return role_checker
