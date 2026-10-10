"""
Password hashing using bcrypt directly.
"""
import bcrypt

def hash_password(plain: str) -> str:
    """Returns a bcrypt hash of the plain-text password."""
    # passlib defaults to 12 rounds for bcrypt
    salt = bcrypt.gensalt(12)
    hashed = bcrypt.hashpw(plain.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    """Returns True if plain matches the stored hash."""
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False
