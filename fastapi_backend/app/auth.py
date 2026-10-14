
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

# Load fastapi_backend/.env
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=False)

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    secret_key = os.getenv("DJANGO_SECRET_KEY")

    if not secret_key:
        raise HTTPException(
            status_code=500,
            detail="DJANGO_SECRET_KEY is not configured in FastAPI .env",
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            secret_key,
            algorithms=["HS256"],
        )

        user_id = payload.get("user_id")
        role = payload.get("role")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="User ID is missing from the access token",
            )

        # Do not silently invent a role; verify that Django supplies it.
        if role is None:
            raise HTTPException(
                status_code=401,
                detail="Role is missing from the access token. Check Django's JWT serializer.",
            )

        return {
            "user_id": int(user_id),
            "role": role,
        }

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token. Log in again.",
        )
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid user ID in access token",
        )
