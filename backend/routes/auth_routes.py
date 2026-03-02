"""
Authentication routes: register, login, token refresh, get current user.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserRole, Ambulance, Hospital
from schemas import UserRegister, UserLogin, Token, UserOut, RefreshTokenRequest
from auth import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, rotate_refresh_token, get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user (patient, EMS, or hospital)."""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    if data.role not in ["patient", "ems", "hospital"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be patient, ems, or hospital")

    # Create user
    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=UserRole(data.role),
    )
    db.add(user)
    db.flush()  # Get user.id before creating related records

    # Create role-specific records
    if data.role == "ems":
        ambulance = Ambulance(
            user_id=user.id,
            latitude=data.ambulance_lat or 28.6139,
            longitude=data.ambulance_lon or 77.2090,
            capability_level=data.capability_level or "BLS",
        )
        db.add(ambulance)

    elif data.role == "hospital":
        hospital = Hospital(
            user_id=user.id,
            name=data.hospital_name or data.name,
            latitude=data.hospital_lat or 28.6139,
            longitude=data.hospital_lon or 77.2090,
            specialty=data.specialty or "general",
            total_icu_beds=data.total_icu_beds or 10,
            available_icu_beds=data.total_icu_beds or 10,
        )
        db.add(hospital)

    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Login and receive JWT access + refresh tokens."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": user.id, "role": user.role.value})
    refresh_token = create_refresh_token(user.id, db)
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@router.post("/refresh", response_model=Token)
def refresh(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Rotate refresh token and get new access + refresh tokens."""
    result = rotate_refresh_token(data.refresh_token, db)
    if not result:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    access_token, new_refresh = result
    return {"access_token": access_token, "refresh_token": new_refresh, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def get_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user's info."""
    return current_user
