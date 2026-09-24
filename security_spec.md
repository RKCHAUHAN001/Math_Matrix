# Security Specification for Math Matrix Firestore Rules

## 1. Data Invariants

1. **User Ownership**: A user profile document (`/users/{userId}`) can only be created or modified by the authenticated user whose `request.auth.uid == userId`.
2. **Immortal Identities**: The `uid` in a profile cannot be altered once created.
3. **Daily Streaks & Scores**: Streaks and high scores must be numbers (greater than or equal to 0).
4. **Leaderboard Scores**: A score record (`/scores/{scoreId}`) can only be created if:
   - The user is authenticated.
   - The document's `userId` matches the authenticated user's `uid`.
   - The score field is a number greater than or equal to 0.
   - The difficulty matches one of the valid options (`easy`, `medium`, `hard`, `insane`).
   - The score record is immutable (cannot be updated or deleted) to prevent leaderboard tampering.
5. **Verified Users**: All database writes are guarded by `request.auth.token.email_verified == true`.
6. **Temporal Integrity**: Creation and updates must enforce strict `request.time` timestamps.

---

## 2. The "Dirty Dozen" Payloads

Here are twelve distinct payloads designed to exploit potential vulnerabilities (such as Identity Spoofing, State Shortcutting, Resource Poisoning, and Type Poisoning) and how our security rules will block them.

### Attack 1: User Identity Spoofing (Create/Update Profile for someone else)
* **Payload**: Attempting to create `/users/attacker_uid` but passing `uid: "victim_uid"`.
* **Prevention**: Checked by `request.auth.uid == userId` and `incoming().uid == userId`.

### Attack 2: Score Identity Spoofing
* **Payload**: Creating a leaderboard entry `/scores/some_score_id` with `userId: "victim_uid"`.
* **Prevention**: Blocked by `incoming().userId == request.auth.uid`.

### Attack 3: Score Modification (Leaderboard Tampering)
* **Payload**: Updating an existing leaderboard document in `/scores/{scoreId}` to increase the score.
* **Prevention**: Leaderboard score documents are immutable; updates are strictly blocked (`allow update: if false`).

### Attack 4: Self-Assigned High Scores in User Profile
* **Payload**: Attempting to update high scores directly in `/users/{userId}` without a valid score validation structure (type check).
* **Prevention**: Verified by `incoming().highScore is number` and strict schema validation in `isValidUserProfile`.

### Attack 5: Resource Exhaustion (Extremely Long Display Name)
* **Payload**: `{ "displayName": "A".repeat(100000) }` in user profile.
* **Prevention**: Guarded by length bounds: `incoming().displayName.size() <= 30`.

### Attack 6: Character Injection/ID Poisoning
* **Payload**: Target path contains special invalid symbols or oversized paths to exhaust resources.
* **Prevention**: ID variable validated via `isValidId()`.

### Attack 7: Immortality Bypass (Changing `createdAt` time)
* **Payload**: Modifying `createdAt` during a profile update to change the account age.
* **Prevention**: E-tag style assertion: `incoming().createdAt == existing().createdAt`.

### Attack 8: Cheat Playloads (Injecting string into integer score)
* **Payload**: In `/scores/{scoreId}`: `{ "score": "nine_thousand" }`
* **Prevention**: Blocked by `incoming().score is number` type check.

### Attack 9: Temporal Manipulation (User-set server time)
* **Payload**: Modifying `updatedAt` to a future timestamp from the client.
* **Prevention**: Enforced with `incoming().updatedAt == request.time`.

### Attack 10: State Shortcut (Unbounded Streaks)
* **Payload**: `{ "streak": -10 }` or `{ "streak": "infinity" }`.
* **Prevention**: Controlled by `incoming().streak is number && incoming().streak >= 0`.

### Attack 11: Ghost Field Injection (Shadow fields like `isAdmin: true` inside profiles)
* **Payload**: `{ "displayName": "Hacker", "isAdmin": true }`.
* **Prevention**: Strict key check `incoming().keys().hasOnly([...])` rejects any unexpected fields.

### Attack 12: Anonymous Scraper List Attempt
* **Payload**: Reading the whole `/users` list without filtering by owner.
* **Prevention**: `allow list` evaluates `resource.data.uid == request.auth.uid` to prevent full database scraping.
