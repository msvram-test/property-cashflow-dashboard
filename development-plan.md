# Development Plan

## Current Focus
Fix Axios 401 Authorization error on dashboard property fetch.

## Diagnostics & Findings
- Backend FastAPI routes validated tokens via `get_current_user` using JWTBearer.
- Frontend correctly included `Authorization: Bearer {token}`.
- Tokens in localStorage often become invalid if backend `JWT_SECRET_KEY` changes or tokens expire.
- The error message was ambiguous; frontend repeatedly retried with same invalid token.

## Fix Implemented
**File Modified:** `backend/utils/auth_utils.py`
- Enhanced JWT decoding to separately detect expired tokens.
- Added clear logs: `[Auth] Token expired.` and `[Auth] JWTError: ...`.
- `decode_access_token` now returns `{"error": "expired"}` for expired tokens to help in identifying session expiration clearly.

## Next Steps
1. Restart backend with new changes to load update.
2. Re-login via frontend to create fresh JWT.
3. Test `/api/properties` endpoint to confirm 401 resolution.
4. If verified, commit and push changes per sprint workflow, then delegate deployment.

## Status
✅ Token decoding clarified  
✅ JWT error handling improved  
🔄 Awaiting local verification before closing sprint task
