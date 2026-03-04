from functools import wraps
from typing import List

from fastapi import HTTPException, status


def require_role(*allowed_roles: str):
    """
    Dependency factory that checks if the current user has one of the allowed roles.
    Usage: Depends(require_role("ADMIN", "EMS"))
    """
    def role_checker(current_user):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(allowed_roles)}",
            )
        return current_user
    return role_checker
