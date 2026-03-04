from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.repositories.user_repo import UserRepository
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.schemas.auth import TokenResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self.user_repo = UserRepository(db)

    async def register(
        self, name: str, email: str, password: str, role: str
    ) -> User:
        """Register a new user."""
        # Check if user already exists
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise ValueError("User with this email already exists")

        # Validate role
        try:
            user_role = UserRole(role)
        except ValueError:
            raise ValueError(f"Invalid role: {role}. Must be one of: {[r.value for r in UserRole]}")

        user = User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role=user_role,
        )
        return await self.user_repo.create(user)

    async def login(self, email: str, password: str) -> Optional[TokenResponse]:
        """Authenticate user and return tokens."""
        user = await self.user_repo.get_by_email(email)
        if not user:
            return None

        if not verify_password(password, user.password_hash):
            return None

        access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
        refresh_token = create_refresh_token({"sub": str(user.id), "role": user.role.value})

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            role=user.role.value,
        )

    async def refresh_access_token(self, refresh_token: str) -> Optional[TokenResponse]:
        """Generate a new access token from a refresh token."""
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            return None

        user_id = payload.get("sub")
        role = payload.get("role")

        new_access_token = create_access_token({"sub": user_id, "role": role})
        new_refresh_token = create_refresh_token({"sub": user_id, "role": role})

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            role=role,
        )
