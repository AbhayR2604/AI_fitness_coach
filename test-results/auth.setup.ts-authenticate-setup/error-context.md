# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.setup.ts >> authenticate
- Location: tests/auth.setup.ts:9:6

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^log in$/i })
    - locator resolved to <button disabled type="submit" class="inline-flex items-center justify-center gap-2 rounded-full bg-[#174b39] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24634a] focus:outline-none focus:ring-2 focus:ring-[#c9f36d] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    53 × waiting for element to be visible, enabled and stable
       - element is not enabled
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic [ref=e3]:
    - link "AI FITNESS COACH" [ref=e4] [cursor=pointer]:
      - /url: /
      - text: AI FITNESS
      - generic [ref=e8]: COACH
    - generic [ref=e9]:
      - paragraph [ref=e10]: Welcome back
      - heading "Log in to your rhythm." [level=1] [ref=e11]
      - paragraph [ref=e12]: Your next session is closer than you think.
      - generic [ref=e13]:
        - generic [ref=e14]:
          - text: Email
          - textbox "Email" [ref=e15]:
            - /placeholder: you@example.com
            - text: cricketeerabhay@gmail.com
        - generic [ref=e16]:
          - text: Password
          - textbox "Password" [active] [ref=e17]:
            - /placeholder: ••••••••
            - text: Welcome@123
        - link "Forgot password?" [ref=e19] [cursor=pointer]:
          - /url: "#"
        - button "Log in" [disabled] [ref=e20]
      - paragraph [ref=e23]:
        - text: New here?
        - link "Create an account" [ref=e24] [cursor=pointer]:
          - /url: /signup
```

# Test source

```ts
  1   | import {
  2   |   test as setup,
  3   |   expect,
  4   | } from "@playwright/test";
  5   | 
  6   | const authFile =
  7   |   "playwright/.auth/user.json";
  8   | 
  9   | setup(
  10  |   "authenticate",
  11  |   async ({ page }) => {
  12  |     const email =
  13  |       process.env.TEST_USER_EMAIL;
  14  | 
  15  |     const password =
  16  |       process.env.TEST_USER_PASSWORD;
  17  | 
  18  |     if (!email || !password) {
  19  |       throw new Error(
  20  |         "TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env.local"
  21  |       );
  22  |     }
  23  | 
  24  |     await page.goto("/login", {
  25  |       waitUntil: "networkidle",
  26  |     });
  27  | 
  28  |     await page.waitForTimeout(1000);
  29  | 
  30  |     const emailInput =
  31  |       page.getByLabel(/email/i);
  32  | 
  33  |     const passwordInput =
  34  |       page.getByLabel(/password/i);
  35  | 
  36  |     await expect(
  37  |       emailInput
  38  |     ).toBeVisible();
  39  | 
  40  |     await expect(
  41  |       passwordInput
  42  |     ).toBeVisible();
  43  | 
  44  |     await emailInput.fill(
  45  |       email
  46  |     );
  47  | 
  48  |     await passwordInput.fill(
  49  |       password
  50  |     );
  51  | 
  52  |     const loginButton =
  53  |       page.getByRole("button", {
  54  |         name: /^log in$/i,
  55  |       });
  56  | 
  57  |     await expect(
  58  |       loginButton
  59  |     ).toBeVisible();
  60  | 
> 61  |     await loginButton.click();
      |                       ^ Error: locator.click: Test timeout of 30000ms exceeded.
  62  | 
  63  |     /*
  64  |      * Give Supabase + Next.js time
  65  |      * to complete authentication
  66  |      * and redirect.
  67  |      */
  68  |     await page.waitForTimeout(3000);
  69  | 
  70  |     console.log(
  71  |       "URL after login:",
  72  |       page.url()
  73  |     );
  74  | 
  75  |     const alert =
  76  |       page.getByRole("alert");
  77  | 
  78  |     if (
  79  |       await alert.count()
  80  |     ) {
  81  |       console.log(
  82  |         "Login error:",
  83  |         await alert.innerText()
  84  |       );
  85  |     }
  86  | 
  87  |     console.log(
  88  |       "Page text:",
  89  |       await page
  90  |         .locator("body")
  91  |         .innerText()
  92  |     );
  93  | 
  94  |     /*
  95  |      * Save the session only if
  96  |      * authentication actually moved
  97  |      * us away from /login.
  98  |      */
  99  |     if (
  100 |       page.url().includes(
  101 |         "/login"
  102 |       )
  103 |     ) {
  104 |       throw new Error(
  105 |         "Login did not complete. Check the URL and login error printed above."
  106 |       );
  107 |     }
  108 | 
  109 |     await page
  110 |       .context()
  111 |       .storageState({
  112 |         path: authFile,
  113 |       });
  114 |   }
  115 | );
```