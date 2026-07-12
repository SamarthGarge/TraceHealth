"""
Password hashing using passlib with bcrypt.
bcrypt auto-handles salting and work factor.
"""
from passlib.context import CryptContext

_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Returns a bcrypt hash of the plain-text password."""
    return _ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Returns True if plain matches the stored hash."""
    return _ctx.verify(plain, hashed)
