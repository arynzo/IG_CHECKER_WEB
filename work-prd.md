# PRD — Instagram Username Checker

## 1. Project Overview

Existing **Next.js 16** project folder mein ek single-page **Instagram Username Checker** web application implement karni hai.

Application ka purpose:

- User multiple Instagram usernames/text lines paste karega.
- Application automatically input se usernames extract karegi.
- User ko checking start karne se pehle confirmation popup dikhaya jayega.
- Confirmation ke baad usernames ko backend-side API ke through check kiya jayega.
- Instagram API response ke basis par usernames ko:
  - **Active**
  - **Suspended**

  categories mein divide kiya jayega.

- UI dark mode mein modern, clean aur polished honi chahiye.

**Do not create a new Next.js project. Existing Next.js 16 project mein hi continue/modify karo.**

---

# 2. Technology Requirements

Use:

- **Next.js 16**
- **React**
- **TypeScript** if the existing project uses TypeScript; otherwise follow the existing project convention.
- **Tailwind CSS**
- **shadcn/ui**
- Next.js **App Router**
- Server-side API route / Route Handler for Instagram requests.

Do not introduce unnecessary heavy dependencies.

The UI should be responsive and work well on desktop and mobile.

---

# 3. Important Security Requirement

Instagram request ke liye jo authorization key/token use hota hai, woh **frontend/browser mein kabhi expose nahi hona chahiye**.

The Instagram authorization header must only exist on the server side.

Frontend should call an internal endpoint such as:

```text
POST /api/check-usernames
```

and the Next.js backend should make the actual Instagram request.

Never:

- Put authorization token in React components.
- Put authorization token in client-side JavaScript.
- Return the authorization token to the frontend.
- Store the token in localStorage/sessionStorage.
- Hardcode the token inside browser-executed code.

Prefer environment variables for the authorization credential, for example:

```env
INSTAGRAM_AUTH_TOKEN=...
```

The exact token value should NOT be hardcoded in source code.

---

# 4. Instagram API

For every username, backend needs to make a request equivalent to:

```text
https://i.instagram.com/api/v1/users/{USERNAME}/usernameinfo_stream/
```

Use the provided authorization header on the server side:

```http
Authorization: Bearer <INSTAGRAM_AUTH_TOKEN>
```

The actual authorization credential must come from the server environment.

## Existing response examples

There is an existing `res.txt` file in the project containing the response returned when a username exists.

**Inspect `res.txt` before implementing the response parser.**

A successful/existing username request returns:

```text
HTTP 200
```

and its response body is documented in:

```text
res.txt
```

Use the actual response structure from `res.txt` rather than assuming field names.

---

# 5. Non-Existing Username Response

When username does not exist, Instagram returns:

```json
{
  "message": "We're sorry, we couldn't find that.",
  "status_code": "404",
  "status": "fail"
}
```

with:

```text
HTTP 404
```

This should be classified as:

```text
Suspended
```

in the application UI.

---

# 6. Username Input UI

The main page should contain a large textarea.

Example:

```text
user1
user2
user3
user4
```

Each line should normally be treated as one username.

However, the application must also support loosely formatted input.

For example:

```text
USERNAME: someuser
USERNAME = someuser
username - someuser
username someuser
```

The application should automatically extract:

```text
someuser
```

from these lines.

Parsing should be case-insensitive.

Examples:

```text
USERNAME: john123
```

→

```text
john123
```

---

```text
USERNAME = john123
```

→

```text
john123
```

---

```text
username - john123
```

→

```text
john123
```

---

```text
username john123
```

→

```text
john123
```

---

Simple input:

```text
john123
```

→

```text
john123
```

---

# 7. Input Parsing Requirements

When the user enters text:

1. Split input by newline.
2. Trim whitespace from every line.
3. Ignore empty lines.
4. Detect common username prefixes such as:
   - `USERNAME:`
   - `USERNAME =`
   - `USERNAME -`
   - `USERNAME`

5. Extract the value after the prefix.
6. Trim the extracted username.
7. Remove unnecessary surrounding whitespace.
8. Remove duplicate usernames.
9. Preserve the original order.

Example:

```text
USERNAME: user1

user2
USERNAME = user3
user1
username - user4
```

Parsed result:

```text
user1
user2
user3
user4
```

`user1` should only appear once.

---

# 8. Start Checking Button

Below the textarea add a prominent button:

```text
Start Checking
```

Button should remain disabled if there are no valid usernames.

When clicked:

1. Parse the textarea.
2. Generate the final username list.
3. Open a confirmation dialog/modal.

Use a proper **shadcn/ui Dialog** rather than a browser `alert()`.

---

# 9. Confirmation Dialog

The dialog should show:

### Header

```text
Ready to Check?
```

or a similar clear title.

Show the total number of usernames.

Example:

```text
4 usernames found
```

Inside the dialog there should be a fixed-height scrollable container.

Example:

```text
1. someuser
2. anotheruser
3. testuser
4. demo_user
```

Requirements:

- Fixed maximum height.
- `overflow-y-auto`.
- User can scroll through the complete list.
- Do not make the dialog itself excessively tall.
- Keep the UI clean.

At the bottom provide two buttons:

```text
Cancel
Check
```

### Cancel

- Close dialog.
- Do not start checking.
- Do not modify results.

### Check

- Close dialog.
- Start the username checking process.

---

# 10. Backend Checking

Actual Instagram requests must happen **server-side**.

Create an API route such as:

```text
/api/check-usernames
```

Request example:

```json
{
  "usernames": ["user1", "user2", "user3"]
}
```

The server should:

1. Validate request body.
2. Validate usernames.
3. Make Instagram requests.
4. Determine whether each username exists.
5. Return structured results.

---

# 11. Concurrent Checking

Checking should preferably happen concurrently instead of:

```text
user1 → wait → user2 → wait → user3
```

Use controlled concurrency.

For example:

```text
user1 ─┐
user2 ─┼── simultaneously
user3 ─┤
user4 ─┘
```

But do **not** create an uncontrolled number of requests.

Implement a reasonable concurrency limit, preferably configurable.

Example:

```ts
const CONCURRENCY = 5;
```

If there are 100 usernames:

```text
Batch 1 → 5 users
Batch 2 → next 5 users
...
```

This prevents excessive simultaneous requests.

If the project architecture allows safe streaming/progressive results, results should appear as they become available.

If progressive streaming makes the implementation unnecessarily complex, a single API response is acceptable, but the backend should still use controlled concurrency.

---

# 12. Result Classification

Every username should end up in one of two categories:

## Active

If Instagram returns:

```text
HTTP 200
```

classify it as:

```text
Active
```

The successful response should be parsed/validated using the actual structure found in `res.txt`.

---

## Suspended

If Instagram returns:

```text
HTTP 404
```

with the documented response:

```json
{
  "message": "We're sorry, we couldn't find that.",
  "status_code": "404",
  "status": "fail"
}
```

classify it as:

```text
Suspended
```

---

# 13. Error Handling

Do not blindly classify every error as Suspended.

Differentiate:

### HTTP 200

```text
Active
```

### HTTP 404

```text
Suspended
```

### 429 / rate limit

Should be treated as an error or retry state, not automatically Suspended.

### 5xx

Treat as server/network error.

### Network timeout

Treat as error.

### Unexpected response

Treat as error.

The UI can optionally show a third small state such as:

```text
Errors
```

if necessary, but the primary requested sections are:

- Active
- Suspended

Do not incorrectly put failed requests into Suspended.

---

# 14. Results UI

Below the textarea/input area, create the results section.

There should be two separate result cards/sections.

---

## Active Section

Title:

```text
Active
```

Show total:

```text
Active: 12
```

Each username should appear on its own row.

Example:

```text
🟢 user1
🟢 user2
🟢 user3
```

Use a green indicator/emoji for active users.

Provide a separate:

```text
Copy
```

button.

Clicking Copy should copy **only the usernames**, not the emoji.

For example clipboard content:

```text
user1
user2
user3
```

One username per line.

---

# 15. Suspended Section

Title:

```text
Suspended
```

Show total:

```text
Suspended: 5
```

Each username:

```text
🔴 user4
🔴 user5
🔴 user6
```

Use a red indicator/emoji.

Provide its own separate:

```text
Copy
```

button.

Clicking Copy should copy **only the usernames**:

```text
user4
user5
user6
```

Do not copy:

```text
🔴 user4
```

Only:

```text
user4
```

---

# 16. Copy Button Behavior

Active Copy button:

```text
navigator.clipboard.writeText(activeUsernames.join("\n"))
```

Suspended Copy button:

```text
navigator.clipboard.writeText(suspendedUsernames.join("\n"))
```

After successful copy, provide small visual feedback.

Example:

```text
Copied!
```

or temporarily change the icon.

Do not use intrusive alerts.

---

# 17. Loading / Checking State

Once checking begins, UI should clearly show that checking is in progress.

For example:

```text
Checking...
```

with a spinner.

Show progress if possible:

```text
Checking 23 / 100
```

or:

```text
23 of 100 checked
```

The user should be able to understand that the application is still working.

Disable the Start Checking button while a check is running.

---

# 18. Result Updates

If progressive results are implemented, results should appear as each username is checked.

Example:

```text
Checking...

Active
🟢 user1
🟢 user3

Suspended
🔴 user2
```

Then continue updating.

The counts should update dynamically:

```text
Active: 2
Suspended: 1
```

If the API returns all results at once, render the complete result after the request finishes.

---

# 19. Overall UI Design

Use **shadcn/ui** components and Tailwind CSS.

Design should be:

- Dark mode
- Modern
- Minimal
- Professional
- Clean
- Good spacing
- Rounded cards
- Subtle borders
- Good typography
- Proper hover/focus states
- Responsive

Suggested page structure:

```text
┌──────────────────────────────────────────┐
│                                          │
│       Instagram Username Checker         │
│       Check usernames quickly            │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Paste usernames here...             │  │
│  │                                    │  │
│  │ user1                              │  │
│  │ user2                              │  │
│  │ USERNAME: user3                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│          [ Start Checking ]              │
│                                          │
│  ┌───────────────┐ ┌──────────────────┐  │
│  │ Active        │ │ Suspended        │  │
│  │ 12      Copy  │ │ 4        Copy    │  │
│  │               │ │                  │  │
│  │ 🟢 user1      │ │ 🔴 user4         │  │
│  │ 🟢 user2      │ │ 🔴 user5         │  │
│  └───────────────┘ └──────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

On mobile:

```text
Active
↓
Suspended
```

should stack vertically.

---

# 20. Suggested shadcn Components

Use appropriate shadcn components such as:

- `Button`
- `Textarea`
- `Dialog`
- `Card`
- `Badge`
- `ScrollArea`
- `Separator`
- `Progress`
- `Tooltip`

Do not install components that are unnecessary.

---

# 21. Empty State

Before checking, result sections should have a clean empty state.

Example:

```text
No active usernames yet.
```

and:

```text
No suspended usernames yet.
```

Avoid showing confusing empty arrays.

---

# 22. Validation

Before opening confirmation dialog:

If textarea is empty:

```text
Please enter at least one username.
```

If only empty/invalid lines exist:

```text
No valid usernames found.
```

Use shadcn toast if the project already has toast support.

Do not use browser `alert()` unless absolutely necessary.

---

# 23. API Response Format

Use a clean internal response structure.

Example:

```json
{
  "results": [
    {
      "username": "user1",
      "status": "active"
    },
    {
      "username": "user2",
      "status": "suspended"
    }
  ]
}
```

For errors:

```json
{
  "username": "user3",
  "status": "error",
  "error": "Request failed"
}
```

Do not return sensitive headers, authorization tokens, cookies, or raw private authentication information to the client.

---

# 24. API Request Validation

Backend should validate:

- Request method
- JSON body
- `usernames` must be an array
- Username count should have a reasonable maximum
- Each username should be a string
- Trim whitespace
- Ignore empty usernames
- Deduplicate usernames

Do not allow arbitrary URLs from the client.

The frontend should only send usernames.

The backend itself should construct:

```text
https://i.instagram.com/api/v1/users/{username}/usernameinfo_stream/
```

---

# 25. Timeout

Every external Instagram request should have a timeout using `AbortController`.

Do not allow a request to hang indefinitely.

Example concept:

```ts
const controller = new AbortController();

const timeout = setTimeout(() => {
  controller.abort();
}, 10000);
```

Clear the timeout after the request completes.

---

# 26. Username Encoding

Username should be safely encoded when constructing the URL.

Use:

```ts
encodeURIComponent(username);
```

instead of directly concatenating unsafe input.

---

# 27. Files / Project Structure

Follow the existing project structure.

A possible structure:

```text
app/
├── page.tsx
├── api/
│   └── check-usernames/
│       └── route.ts
│
components/
├── username-input.tsx
├── check-dialog.tsx
├── result-card.tsx
└── ...
│
lib/
├── instagram.ts
├── username-parser.ts
└── ...
│
res.txt
.env.local
```

Do not blindly create all these files if equivalent existing project structure already exists.

Reuse existing utilities/components where appropriate.

---

# 28. Server-Side Instagram Utility

Keep Instagram request logic separate from the API route where practical.

For example:

```ts
async function checkInstagramUsername(username: string) {
  // server-side only
}
```

The API route should orchestrate validation/concurrency, while the Instagram utility handles the external request.

---

# 29. Environment Variable

Use:

```env
INSTAGRAM_AUTH_TOKEN=...
```

in:

```text
.env.local
```

Never prefix it with:

```text
NEXT_PUBLIC_
```

because that would expose it to the browser.

Example:

```env
INSTAGRAM_AUTH_TOKEN=IGT:2:...
```

The actual credential should be supplied by the developer/user and must not be invented.

---

# 30. Important Existing File

There is an existing:

```text
res.txt
```

file in the project.

Before coding:

1. Read `res.txt`.
2. Understand the exact successful response.
3. Determine the appropriate validation logic for HTTP 200.
4. Use that structure in the backend.
5. Do not assume that every HTTP 200 response automatically means a valid user without checking the documented response structure if the response provides relevant fields.

---

# 31. UX Details

### Start Checking

While checking:

```text
Checking 12 / 50
```

Button can show:

```text
Checking...
```

and become disabled.

### Copy

On copy:

```text
Copied!
```

temporarily.

### Dialog

The username list must be scrollable.

Example:

```text
┌───────────────────────────┐
│ Ready to check            │
│ 100 usernames found       │
│                           │
│ ┌───────────────────────┐ │
│ │ 1. username1          │ │
│ │ 2. username2          │ │
│ │ 3. username3          │ │
│ │ ...                   │ │
│ │ 100. username100      │ │
│ └───────────────────────┘ │
│                           │
│ Cancel          Check     │
└───────────────────────────┘
```

---

# 32. Accessibility

Implement:

- Proper button labels
- Keyboard navigation
- Visible focus states
- Dialog keyboard support
- Textarea label/placeholder
- Good contrast
- Accessible loading indicators where practical

---

# 33. Performance

The application should remain lightweight.

Important:

- Do not make every username a separate React-heavy component unnecessarily.
- Use controlled concurrency on the server.
- Avoid unnecessary re-renders.
- Do not send large raw Instagram responses to the browser.
- Return only required result data.

---

# 34. Security

Never expose:

```text
Authorization header
Bearer token
Instagram API credential
Raw authentication data
```

to the browser.

Do not log the authorization token.

Do not return raw request headers in API responses.

Avoid logging sensitive response data unnecessarily.

---

# 35. Error UX

If checking encounters errors, show a clear non-blocking indication.

Example:

```text
Some usernames could not be checked.
```

If an individual username fails:

```text
username123 — Error
```

If an error section is implemented, it can have:

```text
Errors: 2
```

But do not classify technical/network errors as Suspended.

---

# 36. Final Acceptance Criteria

Implementation is complete only when all of the following work:

### Input

- [ ] User can paste multiple usernames.
- [ ] Each line is parsed separately.
- [ ] `USERNAME: value` works.
- [ ] `USERNAME = value` works.
- [ ] `USERNAME - value` works.
- [ ] `USERNAME value` works.
- [ ] Plain usernames work.
- [ ] Empty lines are ignored.
- [ ] Duplicate usernames are removed.
- [ ] Original order is preserved.

### Confirmation

- [ ] Start Checking button exists.
- [ ] Clicking it opens shadcn dialog.
- [ ] Dialog shows total username count.
- [ ] Dialog contains scrollable username list.
- [ ] Cancel works.
- [ ] Check starts the process.

### Backend

- [ ] Instagram request happens server-side.
- [ ] Authorization token never reaches client.
- [ ] API endpoint validates input.
- [ ] Username URL is safely encoded.
- [ ] Request timeout exists.
- [ ] Controlled concurrency exists.
- [ ] HTTP 200 is classified as Active after appropriate response validation.
- [ ] HTTP 404 is classified as Suspended.
- [ ] 429/5xx/network errors are not classified as Suspended.

### Results

- [ ] Active section exists.
- [ ] Suspended section exists.
- [ ] Active count works.
- [ ] Suspended count works.
- [ ] Active usernames display with green emoji.
- [ ] Suspended usernames display with red emoji.
- [ ] Active Copy button works independently.
- [ ] Suspended Copy button works independently.
- [ ] Copy contains usernames only.
- [ ] Copy uses one username per line.

### UX

- [ ] Dark mode.
- [ ] shadcn/ui.
- [ ] Responsive layout.
- [ ] Loading state.
- [ ] Progress indicator.
- [ ] Empty states.
- [ ] Error handling.
- [ ] Clean modern UI.
- [ ] No unnecessary dependencies.

---

# 37. Implementation Instruction

Now implement this PRD directly inside the **existing Next.js 16 project**.

Before making changes:

1. Inspect the existing project structure.
2. Check whether TypeScript/Tailwind/shadcn are already configured.
3. Inspect the existing `res.txt`.
4. Reuse existing configuration and components where possible.
5. Do not replace or recreate the project unnecessarily.
6. Implement the feature end-to-end.
7. Ensure the authorization token remains server-side.
8. Run/build/lint the project if scripts are available.
9. Fix any TypeScript/build/runtime errors introduced by the implementation.
10. Keep the final implementation production-ready and clean.

Do not merely provide example code or an explanation. **Implement the complete feature in the existing project.**
