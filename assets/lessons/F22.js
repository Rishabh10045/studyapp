/* Lesson F22: Security basics: auth, OAuth, TLS */
(function () {
  "use strict";
  var H = window.HLD;
  function b64u(bytes) { var s = ""; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function b64uStr(str) { return b64u(new TextEncoder().encode(str)); }
  function hmac(secret, data) {
    if (!(window.crypto && crypto.subtle)) return Promise.resolve(null);
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]).then(function (k) { return crypto.subtle.sign("HMAC", k, enc.encode(data)); }).then(function (sig) { return b64u(new Uint8Array(sig)); });
  }

  function widget(el, ctx) {
    var s = ctx.state; if (!s.role) { s.role = "viewer"; s.ttl = 15; s.age = 5; s.tamper = false; }
    var SECRET = "server-only-secret";
    el.innerHTML = "<div class='grid3'><label class='field'>Role in token<select data-k='role'><option>viewer</option><option>editor</option><option>admin</option></select></label>" +
      "<label class='field'>Token lifetime: <strong data-v='ttl' style='color:var(--text)'></strong><input type='range' min='1' max='60' data-k='ttl'></label>" +
      "<label class='field'>Minutes since issued: <strong data-v='age' style='color:var(--text)'></strong><input type='range' min='0' max='90' data-k='age'></label></div>" +
      "<label class='toggle'><input type='checkbox' data-r='tamper'> Attacker edits the payload to role = admin (keeps the old signature)</label>" +
      "<div class='card'><strong>JWT sent in Authorization: Bearer …</strong><pre data-r='tok' style='white-space:pre-wrap;word-break:break-all;font-size:12px;margin:6px 0'></pre><div class='rows' data-r='dec'></div></div>" +
      "<div class='callout' data-r='ver'></div><p class='caption'>Real HMAC-SHA256 (HS256) computed in your browser with a demo secret. Note the payload is only base64url-encoded, not encrypted — anyone can read it.</p>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    var seq = 0;
    function draw() {
      el.querySelector("[data-k='role']").value = s.role; ["ttl", "age"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; el.querySelector("[data-v='" + k + "']").textContent = s[k] + " min"; });
      q("tamper").checked = s.tamper;
      var iat = 1767225600, header = { alg: "HS256", typ: "JWT" }, payload = { sub: "user_42", role: s.role, iat: iat, exp: iat + s.ttl * 60 };
      var h = b64uStr(JSON.stringify(header)), p = b64uStr(JSON.stringify(payload)), my = ++seq;
      hmac(SECRET, h + "." + p).then(function (sig) {
        if (my !== seq) return;
        var sent = s.tamper ? Object.assign({}, payload, { role: "admin" }) : payload, ps = b64uStr(JSON.stringify(sent));
        q("tok").innerHTML = "<span style='color:var(--c0)'>" + h + "</span>.<span style='color:var(--c2)'>" + ps + "</span>.<span style='color:var(--danger)'>" + (sig || "(WebCrypto unavailable)") + "</span>";
        q("dec").innerHTML = [["Header", JSON.stringify(header)], ["Payload (decoded)", JSON.stringify(sent)], ["Signature", "HMAC-SHA256(header.payload, secret)"]].map(function (r) { return "<div class='row'><span class='t'>" + r[0] + "</span><span class='dt'><code>" + ctx.esc(r[1]) + "</code></span></div>"; }).join("");
        hmac(SECRET, h + "." + ps).then(function (check) {
          if (my !== seq) return;
          var v = q("ver"), expired = s.age >= s.ttl;
          if (!sig) { v.className = "callout"; v.textContent = "WebCrypto isn't available in this browser context."; return; }
          if (check !== sig) { v.className = "callout"; v.style.borderColor = "var(--danger)"; v.innerHTML = "<strong>401 Unauthorized:</strong> signature mismatch — the payload was modified. Without the server's secret the attacker can't produce a valid signature."; }
          else if (expired) { v.className = "callout"; v.style.borderColor = "var(--c1)"; v.innerHTML = "<strong>401 Unauthorized:</strong> token expired (exp passed). The client must use its refresh token to get a new access token."; }
          else { v.className = "callout success"; v.style.borderColor = ""; v.innerHTML = "<strong>Valid.</strong> Signature matches and exp is in the future. Authorization check next: does role '" + ctx.esc(s.role) + "' allow this action?"; }
        });
      });
    }
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = k === "role" ? e.target.value : +e.target.value; ctx.save(); draw(); } });
    el.addEventListener("change", function (e) { if (e.target.getAttribute("data-r") === "tamper") { s.tamper = e.target.checked; ctx.save(); draw(); } });
    draw();
  }

  H.registerLesson({
    code: "F22",
    summary: "The security basics every design needs: authentication vs authorization, sessions vs tokens (JWT), OAuth 2.0 and OpenID Connect, TLS and encryption, secrets management, and common defences at the edge.",
    slides: [
      { t: "Authentication vs authorization", x: "Two separate questions asked on every request.",
        p: ["Authentication (AuthN): who are you? — passwords, passkeys, SSO, MFA", "Authorization (AuthZ): what may you do? — roles (RBAC), attributes (ABAC), ownership checks", "401 Unauthorized = not authenticated; 403 Forbidden = authenticated but not allowed", "Check authorization on the server for every resource, never just in the UI"],
        m: "flowchart LR\n  R[\"Request\"] --> AN{\"AuthN: valid identity?\"}:::s1\n  AN -->|\"no\"| E1[\"401\"]:::bad\n  AN -->|\"yes\"| AZ{\"AuthZ: allowed on this resource?\"}:::s0\n  AZ -->|\"no\"| E2[\"403\"]:::bad\n  AZ -->|\"yes\"| OK[\"Handle request\"]:::s2" },
      { t: "Storing passwords", x: "Never store passwords in plain text or with a fast hash.",
        p: ["Use a slow, salted password hash: Argon2id, bcrypt or scrypt", "A unique random salt per user defeats precomputed (rainbow) tables", "Rate-limit and lock out repeated login failures (F19)", "Offer MFA and passkeys (WebAuthn) to resist phishing"],
        m: "flowchart LR\n  PW[\"password\"] --> H[\"Argon2id(password, salt)\"]:::s0 --> DB[(\"users: salt, hash\")]:::s1\n  PW -. \"✗ SHA-256(password)\" .-> BAD[\"fast to brute-force\"]:::bad" },
      { t: "Sessions vs tokens", x: "After login, the client must prove identity on later requests.",
        table: [["", "Server session", "Self-contained token (JWT)"], ["What client holds", "Random session ID in a cookie", "Signed token with claims"], ["Server lookup", "Session store (e.g. Redis) each request", "Verify signature locally"], ["Revocation", "Easy: delete the session", "Hard until expiry: keep tokens short-lived"], ["Fits", "Classic web apps", "APIs, mobile, service-to-service"]],
        p: ["Cookies: set HttpOnly, Secure, SameSite to reduce XSS and CSRF risk"],
        m: "flowchart LR\n  C[\"Client\"] -->|\"cookie: sid=8f3…\"| S1[\"Server\"] --> RS[(\"Session store\")]:::s1\n  C -->|\"Bearer eyJ…\"| S2[\"Server\"] --> V[\"Verify signature (no lookup)\"]:::s0" },
      { t: "JWT: what's inside", x: "A JSON Web Token is header.payload.signature, each base64url-encoded.",
        p: ["Payload claims: sub (user), exp (expiry), iat, iss, aud, roles", "Signed (HS256 shared secret, or RS256/ES256 with a private key) — not encrypted by default", "Short-lived access tokens (minutes) + longer refresh tokens stored securely", "Validate alg, signature, exp, iss and aud; never accept 'alg: none'", "Public-key signing lets many services verify without holding the signing key"],
        m: "flowchart LR\n  H[\"Header {alg, typ}\"]:::s0 --> T[\"header.payload.signature\"]\n  P[\"Payload {sub, role, exp}\"]:::s2 --> T\n  S[\"Signature = sign(header.payload, key)\"]:::bad --> T" },
      { t: "OAuth 2.0: delegated authorization", x: "Lets a user grant an app limited access to their data on another service without sharing their password.",
        p: ["Roles: resource owner (user), client (app), authorization server, resource server (API)", "Authorization code flow with PKCE is recommended for web, mobile and single-page apps", "The app receives an access token with scopes (e.g. read:calendar)", "OAuth is about authorization; it doesn't define who the user is"],
        m: "sequenceDiagram\n  participant U as User\n  participant A as App\n  participant AS as Auth server\n  participant API as Resource API\n  A->>AS: redirect user (client_id, scope, PKCE challenge)\n  U->>AS: log in + consent\n  AS-->>A: authorization code (via redirect)\n  A->>AS: code + PKCE verifier\n  AS-->>A: access token (+ refresh token)\n  A->>API: GET /calendar (Bearer token)" },
      { t: "OpenID Connect and SSO", x: "OpenID Connect (OIDC) is an identity layer on top of OAuth 2.0: it adds an ID token (a JWT) that says who the user is.",
        p: ["'Sign in with Google/Apple/Microsoft' uses OIDC", "Enterprise single sign-on: OIDC or SAML with an identity provider (Okta, Entra ID)", "Your app trusts the IdP and doesn't store passwords", "Map IdP identity to your own user and roles"],
        m: "flowchart LR\n  U[\"User\"] --> APP[\"Your app\"]:::s0\n  APP -->|\"OIDC\"| IDP[\"Identity provider\"]:::s1\n  IDP -->|\"ID token: sub, email\"| APP\n  APP --> DB[(\"users + roles\")]" },
      { t: "TLS: encryption in transit", x: "TLS encrypts and authenticates connections (HTTPS). The server proves its identity with a certificate signed by a trusted certificate authority.",
        p: ["Handshake agrees on keys; TLS 1.3 needs one round trip (and 0-RTT resumption)", "Certificates from CAs such as Let's Encrypt (free, automated)", "Terminate TLS at the load balancer/gateway; re-encrypt inside if required", "mTLS: both sides present certificates — common between internal services (service mesh)", "HSTS tells browsers to always use HTTPS"],
        m: "sequenceDiagram\n  participant C as Client\n  participant S as Server\n  C->>S: ClientHello (key share)\n  S-->>C: ServerHello + certificate + Finished\n  Note over C: verify cert chain to a trusted CA\n  C->>S: Finished + encrypted HTTP request\n  S-->>C: encrypted response" },
      { t: "Encryption at rest and secrets", x: "Protect stored data and the keys that unlock everything.",
        p: ["Encrypt disks, databases and object storage (usually provider-managed, AES-256)", "Envelope encryption: data keys encrypted by a master key in a KMS/HSM", "Secrets (DB passwords, API keys) in a secrets manager (Vault, AWS Secrets Manager), never in code or git", "Rotate keys and credentials; least-privilege IAM roles for services", "Extra protection for sensitive fields (PII, card data → tokenize; PCI DSS)"],
        m: "flowchart LR\n  KMS[\"KMS master key\"]:::s1 -->|\"encrypts\"| DK[\"Data key\"]:::s0 -->|\"encrypts\"| DATA[(\"Data at rest\")]:::s2\n  SVC[\"Service (IAM role)\"] -->|\"fetch at startup\"| SM[\"Secrets manager\"]" },
      { t: "Common threats and defences", x: "A short checklist worth mentioning.",
        table: [["Threat", "Defence"], ["SQL injection", "Parameterized queries / ORM"], ["XSS", "Output encoding, Content-Security-Policy, HttpOnly cookies"], ["CSRF", "SameSite cookies, CSRF tokens"], ["Broken access control (IDOR)", "Check ownership on every object access"], ["DDoS / brute force", "CDN/WAF, rate limiting, captchas"], ["Leaked secrets", "Secrets manager, scanning, rotation"]],
        p: ["OWASP Top 10 lists the most common web app risks; broken access control is #1 in the 2021 edition"],
        m: "flowchart LR\n  U[\"Internet\"] --> CDN[\"CDN + WAF + DDoS protection\"]:::s2 --> GW[\"Gateway: TLS, auth, rate limits\"]:::s1 --> SV[\"Services: authZ checks\"]:::s0 --> DB[(\"Encrypted DB\")]" },
      { t: "Security in interviews", x: "Mention briefly, concretely, at the right layers.",
        p: ["'HTTPS everywhere; TLS terminated at the LB; mTLS inside the mesh.'", "'OIDC login; short-lived JWT access tokens verified at the gateway; refresh tokens rotated.'", "'Per-object authorization checks (owner or shared-with) in each service.'", "'Data encrypted at rest; secrets in a vault; PII minimized.'", "'Signed, expiring URLs for private media.'"],
        m: "flowchart LR\n  C[\"Client\"] -->|\"HTTPS + JWT\"| GW[\"Gateway: verify token\"]:::s1 -->|\"mTLS\"| S[\"Service: authZ\"]:::s0 --> D[(\"Encrypted storage\")]:::s2" }
    ],
    widget: { heading: "JWT signature and expiry checker", caption: "Change the role, lifetime and token age, or tamper with the payload, and see how the server's verification responds.", render: widget },
    examples: [
      ["Let's Encrypt", "A free, automated certificate authority launched in 2015/2016 that helped make HTTPS the default on the web."],
      ["Sign in with Google / Apple", "Built on OpenID Connect over OAuth 2.0; apps receive an ID token instead of handling passwords."],
      ["Passkeys", "Apple, Google and Microsoft support passkeys (FIDO2/WebAuthn), phishing-resistant credentials bound to the site."],
      ["Equifax 2017", "A breach exposing data on about 147 million people was traced to an unpatched Apache Struts vulnerability — a reminder that patching is security."]
    ],
    pitfalls: [
      "Confusing authentication with authorization (or 401 with 403)",
      "Storing passwords with plain or fast hashes",
      "Treating JWT payloads as secret (they're only encoded) or never expiring them",
      "Only checking permissions in the UI, not on the server for each object",
      "Secrets in source code or environment files committed to git",
      "Using OAuth alone as 'login' without OIDC's ID token"
    ],
    quiz: [
      ["A logged-in user requests another user's private invoice. Correct status?", ["401", "403 (or 404 to hide existence)", "200", "500"], 1, "They're authenticated, but not authorized for that object."],
      ["Best way to store passwords?", ["Plain text", "SHA-256", "Salted slow hash like Argon2id or bcrypt", "Reversible encryption"], 2, "Slow, salted hashes resist brute force and rainbow tables."],
      ["What protects a JWT from being modified?", ["Base64 encoding", "Its signature", "HTTPS only", "The exp claim"], 1, "Changing the payload breaks the signature."],
      ["Main drawback of long-lived stateless JWTs?", ["Too slow to verify", "Hard to revoke before expiry", "Can't hold claims", "Need a DB lookup"], 1, "Keep access tokens short-lived and use refresh tokens."],
      ["OAuth 2.0 is primarily for…", ["Encrypting disks", "Delegated authorization with scoped access tokens", "Load balancing", "Password hashing"], 1, "OIDC adds authentication on top."],
      ["Recommended OAuth flow for mobile and single-page apps?", ["Implicit flow", "Authorization code with PKCE", "Password grant", "No flow"], 1, "PKCE protects the code exchange without a client secret."],
      ["What does TLS provide?", ["Only compression", "Encryption and server authentication in transit", "Authorization", "Rate limiting"], 1, "mTLS adds client authentication too."],
      ["Where should DB passwords live?", ["In source code", "In a secrets manager with least-privilege access", "In the README", "In a JWT"], 1, "Rotate them and keep them out of git."]
    ],
    practice: {
      q: "Design authentication and authorization for a B2B SaaS app: web + mobile clients, enterprise customers want SSO with their own identity provider, users have roles per organization, and there are 20 internal microservices.",
      a: [
        ["Login", "OIDC: our auth service federates to each customer's IdP (OIDC or SAML) for SSO; email + password (Argon2id) + MFA/passkeys for others."],
        ["Tokens", "Auth service issues short-lived (~10–15 min) JWT access tokens signed with RS256/ES256 and rotating refresh tokens; public keys published (JWKS) for verification."],
        ["Clients", "Web: tokens in HttpOnly Secure SameSite cookies via a backend-for-frontend; mobile: authorization code + PKCE, tokens in secure storage."],
        ["Gateway", "Verifies signature, exp, iss, aud; rate limits; forwards user id, org id and roles."],
        ["Authorization", "RBAC per organization (membership table org_id, user_id, role) plus per-object ownership checks in each service; central policy library or engine (e.g. OPA)."],
        ["Internal", "mTLS between services via a service mesh; service identities with least-privilege; secrets in a vault."],
        ["Trade-offs", "Short tokens limit revocation delay but add refresh traffic; a deny-list for urgent revocation (e.g. fired employee) checked at the gateway."]
      ]
    },
    recap: [
      "AuthN = who you are (401); AuthZ = what you may do (403), checked per object on the server.",
      "Hash passwords with Argon2id/bcrypt; add MFA or passkeys.",
      "Sessions are easy to revoke; JWTs verify locally but must be short-lived.",
      "OAuth 2.0 delegates access (code + PKCE); OIDC adds identity for login/SSO.",
      "TLS in transit, encryption at rest, secrets in a vault, least privilege."
    ]
  });
})();
