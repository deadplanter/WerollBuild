# WeRoll 5E Security Specification (Firestore Security Rules)

## 1. Data Invariants
1. **User Identity & PII Isolation**: Users can only read and write their own profile document (`/users/{userId}` where `userId == request.auth.uid`). A user cannot modify another user's profile or elevate their role.
2. **Character Ownership**: Characters (`/characters/{characterId}`) must be owned by the authenticated creator (`ownerId == request.auth.uid`). Users can only update or delete characters they own.
3. **Campaign Authority**: Campaigns (`/campaigns/{campaignId}`) are managed strictly by the Dungeon Master who created them (`dmUserId == request.auth.uid`).
4. **Forum Integrity**: Forum posts (`/forumPosts/{postId}`) require that `authorId == request.auth.uid`. Content must be non-empty and bounded in size.
5. **Connection Test**: The test document (`/test/{testId}`) is publicly readable to check connectivity without write permissions.
6. **Default Deny Catch-All**: All unmapped paths are strictly closed for read and write operations.

---

## 2. The "Dirty Dozen" Malicious Payloads

1. **Payload 1: Identity Spoofing on User Profile**
   - Attempt: User `attacker-1` attempts to overwrite `/users/victim-2` with `{ "id": "victim-2", "email": "victim@evil.com", "role": "admin" }`.
   - Expected: `PERMISSION_DENIED`.

2. **Payload 2: Role Escalation on Profile Creation**
   - Attempt: User attempts to register with `{ "id": "auth.uid", "role": "admin", "displayName": "Attacker" }` bypassing default roles.
   - Expected: `PERMISSION_DENIED`.

3. **Payload 3: Ghost Field Injection (Shadow Update)**
   - Attempt: Update `/users/{userId}` with an unlisted field `{ "isSuperAdmin": true }`.
   - Expected: `PERMISSION_DENIED`.

4. **Payload 4: Character Theft via Owner Switch**
   - Attempt: User updates existing character and sets `ownerId` to attacker's UID.
   - Expected: `PERMISSION_DENIED` (`ownerId` is immutable).

5. **Payload 5: Oversized String Injection (Denial of Wallet)**
   - Attempt: Creating a character with a 2MB string in the `name` field.
   - Expected: `PERMISSION_DENIED` (enforced `.size() <= 100`).

6. **Payload 6: Orphaned Character Creation**
   - Attempt: Creating a character with `ownerId` belonging to another user.
   - Expected: `PERMISSION_DENIED` (`incoming().ownerId == request.auth.uid`).

7. **Payload 7: Campaign DM Hijacking**
   - Attempt: Non-DM modifying campaign parameters or deleting campaign.
   - Expected: `PERMISSION_DENIED`.

8. **Payload 8: Forum Post Impersonation**
   - Attempt: Creating a forum post with `authorId` set to a moderator's UID.
   - Expected: `PERMISSION_DENIED`.

9. **Payload 9: Unauthenticated Character Listing**
   - Attempt: Client performs `list` query on `/characters` without authenticating.
   - Expected: `PERMISSION_DENIED`.

10. **Payload 10: ID Poisoning on Document Paths**
    - Attempt: Accessing `/users/{junk_character_string_with_null_bytes}`.
    - Expected: `PERMISSION_DENIED` (`isValidId` regex check failed).

11. **Payload 11: Malicious Write to Test Collection**
    - Attempt: Writing data to `/test/connection` to pollute or exhaust quota.
    - Expected: `PERMISSION_DENIED` (read-only collection).

12. **Payload 12: Catch-All Breach**
    - Attempt: Reading or writing to arbitrary paths such as `/system/secrets`.
    - Expected: `PERMISSION_DENIED` (global deny-all rule).

---

## 3. Test Runner Specification
The test suite `firestore.rules.test.ts` validates that all 12 attack vectors are rejected by Firestore Security Rules with `PERMISSION_DENIED`.
