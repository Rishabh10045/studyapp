/* Lesson S08: Spring Security: authentication, JWT & OAuth2 */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Recorded with Spring Boot 3.4.1 / Spring Security 6.4: a real app with two SecurityFilterChains (an /api/** JWT resource
  // server, stateless with CORS; and a form-login browser chain with CSRF), RS256 tokens signed with a generated key pair,
  // exercised through MockMvc + springSecurity(). chains = the actual filter lists from FilterChainProxy; reqs = real responses.
  var REC = {"chains":[["DisableEncodeUrlFilter","WebAsyncManagerIntegrationFilter","SecurityContextHolderFilter","HeaderWriterFilter","CorsFilter","LogoutFilter","BearerTokenAuthenticationFilter","RequestCacheAwareFilter","SecurityContextHolderAwareRequestFilter","AnonymousAuthenticationFilter","SessionManagementFilter","ExceptionTranslationFilter","AuthorizationFilter"],["DisableEncodeUrlFilter","WebAsyncManagerIntegrationFilter","SecurityContextHolderFilter","HeaderWriterFilter","CsrfFilter","LogoutFilter","UsernamePasswordAuthenticationFilter","DefaultResourcesFilter","DefaultLoginPageGeneratingFilter","DefaultLogoutPageGeneratingFilter","RequestCacheAwareFilter","SecurityContextHolderAwareRequestFilter","AnonymousAuthenticationFilter","ExceptionTranslationFilter","AuthorizationFilter"]],"tokens":{"alice":{"raw":"eyJraWQiOiJrMSIsImFsZyI6IlJTMjU2In0.eyJpc3MiOiJodHRwczovL2F1\u2026e-kh1cEQTanw","header":{"kid":"k1","alg":"RS256"},"payload":{"iss":"https://auth.example.com","sub":"alice","exp":1794471775,"iat":1794470875,"roles":["USER"]},"len":511},"admin":{"raw":"eyJraWQiOiJrMSIsImFsZyI6IlJTMjU2In0.eyJpc3MiOiJodHRwczovL2F1\u2026-ud0xh8Qy9RQ","header":{"kid":"k1","alg":"RS256"},"payload":{"iss":"https://auth.example.com","sub":"root","exp":1794471775,"iat":1794470875,"roles":["USER","ADMIN"]},"len":521},"expired":{"raw":"eyJraWQiOiJrMSIsImFsZyI6IlJTMjU2In0.eyJpc3MiOiJodHRwczovL2F1\u2026xY9vKNWQXI1A","header":{"kid":"k1","alg":"RS256"},"payload":{"iss":"https://auth.example.com","sub":"alice","exp":1794471055,"iat":1794470155,"roles":["USER"]},"len":511},"forged":{"raw":"eyJraWQiOiJrMSIsImFsZyI6IlJTMjU2In0.eyJpc3MiOiJodHRwczovL2F1\u2026flVrpoRhb4oA","header":{"kid":"k1","alg":"RS256"},"payload":{"iss":"https://auth.example.com","sub":"alice","exp":1794471775,"iat":1794470875,"roles":["ADMIN"]},"len":513}},"reqs":{"public":{"status":200,"headers":"Vary: Origin","body":"UP","err":""},"notoken":{"status":401,"headers":"WWW-Authenticate: Bearer; Vary: Origin","body":"","err":""},"valid":{"status":200,"headers":"Vary: Origin","body":"orders for alice [ROLE_USER]","err":""},"expired":{"status":401,"headers":"WWW-Authenticate: Bearer error=\"invalid_token\", error_description=\"An error occurred while attempting to decode the Jwt: Jwt expired at 2026-11-12T08:10:55Z\", error_uri=\"https://tools.ietf.org/html/rfc6750#section-3.1\"; Vary: Origin","body":"","err":""},"forged":{"status":401,"headers":"WWW-Authenticate: Bearer error=\"invalid_token\", error_description=\"An error occurred while attempting to decode the Jwt: Signed JWT rejected: Invalid signature\", error_uri=\"https://tools.ietf.org/html/rfc6750#section-3.1\"; Vary: Origin","body":"","err":""},"deluser":{"status":403,"headers":"WWW-Authenticate: Bearer error=\"insufficient_scope\", error_description=\"The request requires higher privileges than provided by the access token.\", error_uri=\"https://tools.ietf.org/html/rfc6750#section-3.1\"; Vary: Origin","body":"","err":""},"deladmin":{"status":204,"headers":"Vary: Origin","body":"","err":""},"ownok":{"status":200,"headers":"Vary: Origin","body":"orders of alice","err":""},"ownother":{"status":403,"headers":"WWW-Authenticate: Bearer error=\"insufficient_scope\", error_description=\"The request requires higher privileges than provided by the access token.\", error_uri=\"https://tools.ietf.org/html/rfc6750#section-3.1\"; Vary: Origin","body":"","err":""},"corsok":{"status":200,"headers":"Access-Control-Allow-Origin: https://app.example.com; Access-Control-Allow-Methods: GET,POST,DELETE; Vary: Origin","body":"","err":""},"corsbad":{"status":403,"headers":"Vary: Origin","body":"Invalid CORS request","err":""},"webanon":{"status":302,"headers":"Location: http://localhost/login","body":"","err":""},"loginbad":{"status":302,"headers":"Location: /login?error","body":"","err":""},"loginok":{"status":302,"headers":"Location: /","body":"","err":""},"loginnocsrf":{"status":403,"headers":"","body":"","err":"Forbidden"},"transfernocsrf":{"status":403,"headers":"","body":"","err":"Forbidden"},"transfercsrf":{"status":200,"headers":"","body":"transfer done by alice","err":""}}};
  var SC = [
    { k: "public", g: "API (JWT)", label: "Public endpoint", chain: 0, req: "GET /api/public/health", tok: null, at: "AuthorizationFilter", ok: true,
      why: "No token, but the rule `requestMatchers(\"/api/public/**\").permitAll()` lets the **anonymous** authentication through." },
    { k: "notoken", g: "API (JWT)", label: "No token", chain: 0, req: "GET /api/orders", tok: null, at: "AuthorizationFilter", ok: false, then: "ExceptionTranslationFilter",
      why: "`AuthorizationFilter` denies the anonymous user; `ExceptionTranslationFilter` turns that into the resource server's entry point: **401** with `WWW-Authenticate: Bearer`." },
    { k: "valid", g: "API (JWT)", label: "Valid token", chain: 0, req: "GET /api/orders\nAuthorization: Bearer <alice>", tok: "alice", at: "BearerTokenAuthenticationFilter", ok: true,
      why: "`BearerTokenAuthenticationFilter` verifies the RS256 signature with the public key, checks `exp`, and maps the `roles` claim to `ROLE_USER`. The controller sees `Authentication.getName()` = the `sub` claim." },
    { k: "expired", g: "API (JWT)", label: "Expired token", chain: 0, req: "GET /api/orders\nAuthorization: Bearer <expired>", tok: "expired", at: "BearerTokenAuthenticationFilter", ok: false,
      why: "Signature is fine but `exp` is in the past (with the default 60 s clock skew allowance), so the decoder rejects it: **401 invalid_token**. The client must refresh the token." },
    { k: "forged", g: "API (JWT)", label: "Forged token", chain: 0, req: "GET /api/orders\nAuthorization: Bearer <forged: roles=[ADMIN]>", tok: "forged", at: "BearerTokenAuthenticationFilter", ok: false,
      why: "Someone signed their own token claiming `ADMIN`, with a different private key. The claims are readable by anyone (Base64), but the **signature** doesn't verify: **401**." },
    { k: "deluser", g: "API (JWT)", label: "USER deletes", chain: 0, req: "DELETE /api/orders/7\nAuthorization: Bearer <alice>", tok: "alice", at: "AuthorizationFilter", ok: false, then: "ExceptionTranslationFilter",
      why: "Authenticated (so not 401) but the URL rule `DELETE /api/orders/** hasRole(\"ADMIN\")` fails: **403** with `insufficient_scope`. 401 = who are you? 403 = I know you, and no." },
    { k: "deladmin", g: "API (JWT)", label: "ADMIN deletes", chain: 0, req: "DELETE /api/orders/7\nAuthorization: Bearer <admin>", tok: "admin", at: "AuthorizationFilter", ok: true,
      why: "The admin token carries `roles: [USER, ADMIN]`, so `hasRole(\"ADMIN\")` passes and the controller returns **204**." },
    { k: "ownok", g: "Method security", label: "Own orders", chain: 0, req: "GET /api/orders/of/alice\nAuthorization: Bearer <alice>", tok: "alice", at: "@PreAuthorize", ok: true,
      why: "The URL rule only says *authenticated*; the service method has `@PreAuthorize(\"#owner == authentication.name or hasRole('ADMIN')\")`, which passes for alice." },
    { k: "ownother", g: "Method security", label: "Someone else's orders", chain: 0, req: "GET /api/orders/of/bob\nAuthorization: Bearer <alice>", tok: "alice", at: "@PreAuthorize", ok: false, then: "ExceptionTranslationFilter",
      why: "The filter chain lets the request through, but the method-security proxy throws `AccessDeniedException` before `ordersOf(\"bob\")` runs, so it's **403**. This is how you stop IDOR bugs (reading other users' data by changing an id)." },
    { k: "corsok", g: "CORS", label: "Preflight: allowed origin", chain: 0, req: "OPTIONS /api/orders\nOrigin: https://app.example.com\nAccess-Control-Request-Method: GET", tok: null, at: "CorsFilter", ok: true,
      why: "The browser's **preflight** is answered by `CorsFilter` *before* authentication (preflights carry no token), echoing the allowed origin and methods." },
    { k: "corsbad", g: "CORS", label: "Preflight: other origin", chain: 0, req: "OPTIONS /api/orders\nOrigin: https://evil.example\nAccess-Control-Request-Method: GET", tok: null, at: "CorsFilter", ok: false,
      why: "Origin not in the allowed list: **403 Invalid CORS request**, and the browser blocks the real call. CORS protects *browsers'* users; curl ignores it, so it's not an auth mechanism." },
    { k: "webanon", g: "Browser (session + CSRF)", label: "Page without login", chain: 1, req: "GET /web/account", tok: null, at: "AuthorizationFilter", ok: false, then: "ExceptionTranslationFilter",
      why: "Same denial as the API, but this chain's entry point is form login: **302 redirect to /login** (the original URL is saved by the request cache)." },
    { k: "loginbad", g: "Browser (session + CSRF)", label: "Login, wrong password", chain: 1, req: "POST /login  (username=alice, password=wrong, _csrf=…)", tok: null, at: "UsernamePasswordAuthenticationFilter", ok: false,
      why: "`UsernamePasswordAuthenticationFilter` asks the `AuthenticationManager` → `DaoAuthenticationProvider` → `UserDetailsService` + `BCryptPasswordEncoder.matches()`. Mismatch: redirect to `/login?error`." },
    { k: "loginok", g: "Browser (session + CSRF)", label: "Login, right password", chain: 1, req: "POST /login  (username=alice, password=s3cret, _csrf=…)", tok: null, at: "UsernamePasswordAuthenticationFilter", ok: true,
      why: "BCrypt hash matches, the `SecurityContext` is stored in the HTTP session, and the user is redirected to the saved or default URL." },
    { k: "loginnocsrf", g: "Browser (session + CSRF)", label: "Login without CSRF token", chain: 1, req: "POST /login  (username=alice, password=s3cret)", tok: null, at: "CsrfFilter", ok: false,
      why: "Even login is CSRF-protected in a browser chain (prevents *login CSRF*). No `_csrf` token: **403** before the password is ever checked." },
    { k: "transfernocsrf", g: "Browser (session + CSRF)", label: "Logged-in POST, no CSRF", chain: 1, req: "POST /web/transfer   (session cookie of alice, no _csrf)", tok: null, at: "CsrfFilter", ok: false,
      why: "The classic CSRF attack: a malicious site makes the victim's browser POST with their session cookie. Without the secret token that only your pages know, `CsrfFilter` returns **403**." },
    { k: "transfercsrf", g: "Browser (session + CSRF)", label: "Logged-in POST with CSRF", chain: 1, req: "POST /web/transfer   (session cookie + _csrf token)", tok: null, at: "AuthorizationFilter", ok: true,
      why: "Valid CSRF token and an authenticated session: the request reaches the controller. The stateless API chain disables CSRF because it uses no cookies." }
  ];
  function s08Widget(el, ctx) {
    var s = ctx.state; if (!s.k) s.k = "deluser";
    var groups = []; SC.forEach(function (x) { if (groups.indexOf(x.g) < 0) groups.push(x.g); });
    el.innerHTML = groups.map(function (g) { return "<div style='font-size:12px;color:#64748b;margin-top:6px'>" + g + "</div><div class='btnrow'>" + SC.filter(function (x) { return x.g === g; }).map(function (x) { return "<button type='button' class='btn' data-k='" + x.k + "'>" + x.label + "</button>"; }).join("") + "</div>"; }).join("") +
      "<div data-r='out' style='margin-top:10px'></div>";
    function draw() {
      var x = SC.filter(function (y) { return y.k === s.k; })[0], r = REC.reqs[x.k], fl = REC.chains[x.chain];
      el.querySelectorAll("button[data-k]").forEach(function (b) { b.classList.toggle("primary", b.dataset.k === s.k); });
      var idx = fl.indexOf(x.at), reached = x.at === "@PreAuthorize" ? fl.length : idx;
      var chips = fl.map(function (f, i) {
        var st = "background:#f1f5f9;color:#334155;border:1px solid #cbd5e1";
        if (f === x.at) st = x.ok ? "background:#dcfce7;color:#166534;border:2px solid #16a34a" : "background:#fee2e2;color:#991b1b;border:2px solid #dc2626";
        else if (f === x.then) st = "background:#fef3c7;color:#92400e;border:2px solid #d97706";
        else if (i > reached && !(x.ok && x.at !== "CorsFilter")) st = "background:#fff;color:#cbd5e1;border:1px dashed #e2e8f0";
        return "<span style='display:inline-block;margin:2px;padding:3px 7px;border-radius:12px;font-size:12px;" + st + "'>" + f.replace("Filter", "") + "</span>";
      }).join("<span style='color:#94a3b8'>›</span>");
      if (x.at === "@PreAuthorize") chips += "<span style='color:#94a3b8'>›</span><span style='display:inline-block;margin:2px;padding:3px 7px;border-radius:12px;font-size:12px;" + (x.ok ? "background:#dcfce7;color:#166534;border:2px solid #16a34a" : "background:#fee2e2;color:#991b1b;border:2px solid #dc2626") + "'>@PreAuthorize on OrderService</span>";
      var t = x.tok ? REC.tokens[x.tok] : null;
      var col = r.status < 300 ? "#166534" : r.status < 400 ? "#1d4ed8" : "#b91c1c";
      q.innerHTML = "<pre class='code' style='white-space:pre-wrap'>" + ctx.esc(x.req) + "</pre>" +
        (t ? "<pre class='code' style='white-space:pre-wrap;font-size:12px'>" + ctx.esc("token (" + t.len + " chars): " + t.raw + "\nheader:  " + JSON.stringify(t.header) + "\npayload: " + JSON.stringify(t.payload) + (x.tok === "expired" ? "   ← exp was 2 minutes before the request" : "")) + "</pre>" : "") +
        "<div style='font-size:12px;color:#64748b;margin:6px 0 2px'>" + (x.chain === 0 ? "Chain 1: securityMatcher(\"/api/**\"), stateless JWT resource server" : "Chain 2: everything else, form login + session + CSRF") + " (real filter order from FilterChainProxy)</div><div style='line-height:2'>" + chips + "</div>" +
        "<div style='margin-top:8px;padding:8px;border:1px solid #e5e7eb;border-radius:8px'><span style='font-size:22px;font-weight:700;color:" + col + "'>" + r.status + "</span> " +
        "<pre class='code' style='white-space:pre-wrap;font-size:12px;margin-top:6px'>" + ctx.esc((r.headers ? r.headers.split("; ").join("\n") : "(no notable headers)") + (r.body ? "\n\n" + r.body : r.err ? "\n\n" + r.err : "")) + "</pre></div>" +
        "<div class='result'>" + ctx.md(x.why) + "</div>";
    }
    var q = el.querySelector("[data-r='out']");
    el.addEventListener("click", function (e) { var b = e.target.closest("button[data-k]"); if (!b) return; s.k = b.dataset.k; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Authentication, authorisation and the filter chain",
      text: "**Authentication** answers *who are you?* (password, token, certificate); **authorisation** answers *are you allowed to do this?* (roles, ownership). Spring Security does both in **servlet filters**, before your controller runs. The container calls one `DelegatingFilterProxy`, which hands the request to `FilterChainProxy`, which picks the **first `SecurityFilterChain` whose matcher fits** and runs its ordered filters: CORS, CSRF, authentication filters (bearer token, form login, basic), then `ExceptionTranslationFilter` and finally `AuthorizationFilter`. A failure becomes **401** (not authenticated) or **403** (authenticated but not allowed). Printing the chain is the fastest way to understand a configuration.",
      m: M(["flowchart LR",
        "  C[\"HTTP request\"]:::s1 --> D[\"DelegatingFilterProxy\"]:::s2 --> F[\"FilterChainProxy\"]:::s2",
        "  F --> A[\"chain 1: /api/**<br/>Cors, BearerToken,<br/>ExceptionTranslation, Authorization\"]:::s4",
        "  F --> B[\"chain 2: everything else<br/>Csrf, UsernamePassword,<br/>ExceptionTranslation, Authorization\"]:::s4",
        "  A --> CT[\"DispatcherServlet<br/>@RestController\"]:::s1",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `@Configuration @EnableWebMvc @EnableWebSecurity
class Sec {
    @Bean SecurityFilterChain chain(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(a -> a.anyRequest().authenticated()).httpBasic(b -> { }).build();
    }
    @Bean UserDetailsService users() { return new InMemoryUserDetailsManager(User.withUsername("asha").password("{noop}pw").roles("USER").build()); }
}
@RestController class Hello { @GetMapping("/hello") String hi(Authentication a) { return "hi " + a.getName(); } }
var ctx = new AnnotationConfigWebApplicationContext();
ctx.setServletContext(new MockServletContext()); ctx.register(Sec.class, Hello.class); ctx.refresh();
ctx.getBean(FilterChainProxy.class).getFilterChains().get(0).getFilters().forEach(f -> System.out.println("  " + f.getClass().getSimpleName()));
MockMvc mvc = MockMvcBuilders.webAppContextSetup(ctx).apply(springSecurity()).build();
System.out.println("no credentials : " + mvc.perform(get("/hello")).andReturn().getResponse().getStatus());
System.out.println("basic auth     : " + mvc.perform(get("/hello").with(httpBasic("asha", "pw"))).andReturn().getResponse().getContentAsString());`,
      analogy: "An office building: the turnstile checks your badge (authentication), each floor's door checks whether your badge opens that floor (authorisation), and different entrances (chains) have different turnstiles." },
    { title: "SecurityFilterChain beans and multiple chains",
      text: "Since Spring Security 6 you configure security by declaring `SecurityFilterChain` beans that build an `HttpSecurity` with lambdas (`WebSecurityConfigurerAdapter` is gone). An app that serves both a **stateless API** and **browser pages** typically has two chains: one with `securityMatcher(\"/api/**\")`, a JWT resource server, no sessions and no CSRF, ordered first with `@Order(1)`; and a catch-all with form login, sessions and CSRF. Only **one** chain handles a request, so a rule in the wrong chain silently does nothing. Spring Boot adds a default chain (everything authenticated, form + basic login, a generated password) only when you define none.",
      code: `@Configuration @EnableWebMvc @EnableWebSecurity
class TwoChains {
    @Bean @org.springframework.core.annotation.Order(1) SecurityFilterChain api(HttpSecurity http) throws Exception {
        return http.securityMatcher("/api/**").authorizeHttpRequests(a -> a.anyRequest().authenticated())
            .httpBasic(b -> { }).sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS)).csrf(c -> c.disable()).build();
    }
    @Bean @org.springframework.core.annotation.Order(2) SecurityFilterChain web(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(a -> a.anyRequest().authenticated()).formLogin(f -> { }).build();
    }
    @Bean UserDetailsService users() { return new InMemoryUserDetailsManager(User.withUsername("asha").password("{noop}pw").roles("USER").build()); }
}
@RestController class Pages { @GetMapping("/api/data") String data() { return "data"; } @GetMapping("/home") String home() { return "home"; } }
var ctx = new AnnotationConfigWebApplicationContext();
ctx.setServletContext(new MockServletContext()); ctx.register(TwoChains.class, Pages.class); ctx.refresh();
MockMvc mvc = MockMvcBuilders.webAppContextSetup(ctx).apply(springSecurity()).build();
for (String path : List.of("/api/data", "/home")) {
    var r = mvc.perform(get(path)).andReturn().getResponse();
    System.out.println(path + " anonymous -> " + r.getStatus() + (r.getRedirectedUrl() != null ? " redirect " + r.getRedirectedUrl() : " " + r.getHeader("WWW-Authenticate")));
}
System.out.println("POST /api/data without CSRF token -> " + mvc.perform(post("/api/data").with(httpBasic("asha", "pw"))).andReturn().getResponse().getStatus() + " (405: reached MVC, CSRF is off in the API chain)");
System.out.println("POST /home without CSRF token     -> " + mvc.perform(post("/home").with(user("asha"))).andReturn().getResponse().getStatus() + " (CSRF on in the web chain)");`,
      analogy: "Two entrances to a hospital: the staff entrance checks ID cards, the visitors' entrance has a reception desk. A rule posted at one door means nothing at the other." },
    { title: "Storing passwords: BCrypt and DelegatingPasswordEncoder",
      text: "Never store passwords, only **slow, salted hashes**. `BCryptPasswordEncoder` adds a random **salt** (so two users with the same password get different hashes) and a **cost factor** (each +1 doubles the work, slowing brute force). Spring's default is `DelegatingPasswordEncoder`, which prefixes the hash with its algorithm id (`{bcrypt}`, `{argon2}`, `{noop}`) so you can **migrate** algorithms over time: old hashes still verify, new ones use the new default, and `upgradeEncoding` tells you when to re-hash at the next login. Plain SHA-256 or MD5 is far too fast; an attacker can test billions per second.",
      code: `PasswordEncoder bcrypt = new BCryptPasswordEncoder();
String h1 = bcrypt.encode("s3cret"), h2 = bcrypt.encode("s3cret");
System.out.println(h1 + "\\n" + h2);
System.out.println("same password, different hashes (salt): " + !h1.equals(h2) + "; both match: " + (bcrypt.matches("s3cret", h1) && bcrypt.matches("s3cret", h2)));
for (int cost : new int[] { 10, 12 }) {
    var enc = new BCryptPasswordEncoder(cost); enc.encode("warm-up");
    long t = System.nanoTime(); enc.encode("s3cret");
    System.out.printf("cost %d: %d ms per hash%n", cost, (System.nanoTime() - t) / 1_000_000);
}
PasswordEncoder delegating = PasswordEncoderFactories.createDelegatingPasswordEncoder();
String legacy = "{noop}s3cret";
System.out.println("new hash: " + delegating.encode("s3cret").substring(0, 15) + "…   legacy matches: " + delegating.matches("s3cret", legacy) + ", needs upgrade: " + delegating.upgradeEncoding(legacy));`,
      analogy: "Salt is like each user's lock having a unique keyway: even if two people chose the same key shape, a copied lock pattern from one doesn't open the other." },
    { title: "UserDetailsService and the AuthenticationManager",
      text: "Authentication flows through an `AuthenticationManager` (usually `ProviderManager`) that asks each `AuthenticationProvider` in turn. For username/password, `DaoAuthenticationProvider` loads the user through your **`UserDetailsService`** (from a database, LDAP…), checks account status (locked, disabled, expired) and compares the password with the `PasswordEncoder`. On success you get an **authenticated** `Authentication` holding the principal and its **authorities**; on failure an `AuthenticationException`. Note `BadCredentialsException` is thrown for both unknown user and wrong password, so attackers can't enumerate usernames.",
      code: `PasswordEncoder enc = new BCryptPasswordEncoder(4);
var users = new InMemoryUserDetailsManager(
    User.withUsername("asha").password(enc.encode("pw")).roles("USER").build(),
    User.withUsername("ravi").password(enc.encode("pw")).roles("USER").disabled(true).build());
var provider = new org.springframework.security.authentication.dao.DaoAuthenticationProvider(enc); provider.setUserDetailsService(users);
AuthenticationManager manager = new ProviderManager(provider);
for (String[] c : new String[][] { { "asha", "pw" }, { "asha", "nope" }, { "ghost", "pw" }, { "ravi", "pw" } }) {
    try {
        Authentication a = manager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(c[0], c[1]));
        System.out.println(c[0] + "/" + c[1] + " -> authenticated=" + a.isAuthenticated() + " " + a.getAuthorities());
    } catch (AuthenticationException e) { System.out.println(c[0] + "/" + c[1] + " -> " + e.getClass().getSimpleName() + ": " + e.getMessage()); }
}`,
      analogy: "The receptionist (AuthenticationManager) doesn't know everyone; she calls the HR department (UserDetailsService) for your file and compares your signature (password encoder)." },
    { title: "SecurityContext: where the current user lives",
      text: "After authentication the `Authentication` is stored in the **`SecurityContextHolder`**, which by default is a **ThreadLocal**. That's how `Authentication` controller parameters, `@AuthenticationPrincipal`, `@PreAuthorize` and auditing find the current user without passing it around. Consequences: it is **cleared** after each request (by `SecurityContextHolderFilter`); it does **not** follow work handed to other threads (`@Async`, executors, `CompletableFuture`) unless you wrap them with `DelegatingSecurityContextExecutor`/`Runnable` (Spring Boot does this for its `@Async` executor if configured); and with sessions it is persisted in the `HttpSession` between requests, while a stateless JWT API rebuilds it from the token every time.",
      code: `var auth = UsernamePasswordAuthenticationToken.authenticated("asha", null, AuthorityUtils.createAuthorityList("ROLE_USER"));
SecurityContextHolder.getContext().setAuthentication(auth);
Supplier<String> who = () -> { var a = SecurityContextHolder.getContext().getAuthentication(); return a == null ? "nobody" : a.getName(); };
System.out.println("request thread     : " + who.get());
ExecutorService pool = Executors.newSingleThreadExecutor();
System.out.println("plain executor     : " + pool.submit(who::get).get());
var secured = new org.springframework.security.concurrent.DelegatingSecurityContextExecutorService(pool);
System.out.println("delegating executor: " + secured.submit(who::get).get());
SecurityContextHolder.clearContext();
System.out.println("after clearContext : " + who.get());
pool.shutdown();`,
      analogy: "The SecurityContext is a name badge clipped to the worker handling your request. Hand the job to a colleague and they don't have your badge unless you clip a copy onto them." },
    { title: "URL rules: order, roles and authorities",
      text: "`authorizeHttpRequests` rules are checked **top to bottom and the first match wins**, so specific paths must come before general ones, and `anyRequest()` must be last (Spring fails fast otherwise). `hasRole(\"ADMIN\")` checks the authority `ROLE_ADMIN`; `hasAuthority(\"orders:write\")` checks the exact string (JWT scopes become `SCOPE_…`). Prefer **deny by default** (`anyRequest().authenticated()` or `denyAll()`), and remember that path-based rules cover URLs only: a second endpoint exposing the same data needs the same rule, which is why method security is a useful second layer.",
      code: `@Configuration @EnableWebMvc @EnableWebSecurity
class Rules {
    @Bean SecurityFilterChain chain(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(a -> a
                .requestMatchers("/admin/**").authenticated()                 // too general, placed first
                .requestMatchers("/admin/users/**").hasRole("ADMIN")          // never reached!
                .requestMatchers("/reports/**").hasAuthority("reports:read")
                .anyRequest().authenticated())
            .build();
    }
}
@RestController class Admin { @GetMapping("/admin/users/list") String users() { return "all users"; } @GetMapping("/reports/q1") String rep() { return "Q1"; } }
var ctx = new AnnotationConfigWebApplicationContext();
ctx.setServletContext(new MockServletContext()); ctx.register(Rules.class, Admin.class); ctx.refresh();
MockMvc mvc = MockMvcBuilders.webAppContextSetup(ctx).apply(springSecurity()).build();
System.out.println("USER  -> /admin/users/list : " + mvc.perform(get("/admin/users/list").with(user("asha").roles("USER"))).andReturn().getResponse().getStatus() + "  (should be 403: rule order bug)");
System.out.println("role REPORTS -> /reports/q1 : " + mvc.perform(get("/reports/q1").with(user("asha").roles("REPORTS"))).andReturn().getResponse().getStatus() + "  (ROLE_REPORTS is not reports:read)");
System.out.println("authority    -> /reports/q1 : " + mvc.perform(get("/reports/q1").with(user("asha").authorities(new SimpleGrantedAuthority("reports:read")))).andReturn().getResponse().getStatus());`,
      analogy: "Rules are like a bouncer's checklist read from the top: if line one says 'anyone with a ticket gets in', line two 'VIP area: VIPs only' is never consulted." },
    { title: "Method security: @PreAuthorize and ownership checks",
      text: "`@EnableMethodSecurity` puts a proxy around beans and evaluates SpEL before (`@PreAuthorize`) or after (`@PostAuthorize`, `@PostFilter`) a method. It can use **arguments** and the **returned object**, which URL rules can't, so it's the right place for **ownership** checks (`#owner == authentication.name`) that prevent **IDOR** bugs, where a user changes an id in the URL to read someone else's data. Being proxy-based (like `@Transactional`), it does not apply to **self-invocation** or private methods. Failures throw `AccessDeniedException`, translated to 403 by the filter chain.",
      code: `record Invoice(long id, String owner, int amount) { }
@Service class Invoices {
    @PreAuthorize("hasRole('ADMIN') or #owner == authentication.name")
    List<Invoice> byOwner(String owner) { return List.of(new Invoice(1, owner, 500)); }
    @PostAuthorize("returnObject.owner() == authentication.name")
    Invoice byId(long id) { return new Invoice(id, id == 7 ? "asha" : "ravi", 900); }
}
@Configuration @EnableMethodSecurity @Import(Invoices.class) class MethodSec { }
var ctx = new AnnotationConfigApplicationContext(MethodSec.class);
Invoices inv = ctx.getBean(Invoices.class);
SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated("asha", null, AuthorityUtils.createAuthorityList("ROLE_USER")));
for (Callable<Object> call : List.<Callable<Object>>of(() -> inv.byOwner("asha"), () -> inv.byOwner("ravi"), () -> inv.byId(7), () -> inv.byId(8))) {
    try { System.out.println("allowed: " + call.call()); }
    catch (AccessDeniedException e) { System.out.println("denied : " + e.getMessage()); }
}
ctx.close();`,
      analogy: "URL rules are the lock on the archive room; @PreAuthorize is the archivist who checks that the file you asked for has your name on it." },
    { title: "JWT: signed claims, not secrets",
      text: "A **JWT** is `header.payload.signature`, each part Base64url-encoded. The payload's **claims** (`sub`, `iss`, `aud`, `exp`, roles, scopes) are **readable by anyone**: never put secrets in them. Security comes from the **signature**: the authorisation server signs with its private key (RS256/ES256) and every API verifies with the public key, usually fetched from the issuer's **JWK Set** endpoint. Validation must check signature, **`exp`/`nbf`**, **issuer** and ideally **audience**. JWTs are stateless and fast to verify, but **can't be revoked** before they expire, so keep access tokens short-lived (5–15 min) and use refresh tokens.",
      code: `var gen = java.security.KeyPairGenerator.getInstance("RSA"); gen.initialize(2048);
var keys = gen.generateKeyPair();
var jwk = new com.nimbusds.jose.jwk.RSAKey.Builder((java.security.interfaces.RSAPublicKey) keys.getPublic()).privateKey(keys.getPrivate()).build();
JwtEncoder encoder = new NimbusJwtEncoder(new com.nimbusds.jose.jwk.source.ImmutableJWKSet<>(new com.nimbusds.jose.jwk.JWKSet(jwk)));
var now = java.time.Instant.now();
String token = encoder.encode(JwtEncoderParameters.from(JwtClaimsSet.builder().issuer("https://auth.example.com").subject("asha")
    .expiresAt(now.plusSeconds(300)).claim("roles", List.of("USER")).build())).getTokenValue();
String[] parts = token.split("\\\\.");
System.out.println("payload (anyone can read it): " + new String(Base64.getUrlDecoder().decode(parts[1])));
NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey((java.security.interfaces.RSAPublicKey) keys.getPublic()).build();
decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("https://auth.example.com"));
System.out.println("valid  -> sub=" + decoder.decode(token).getSubject());
String tampered = parts[0] + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(new String(Base64.getUrlDecoder().decode(parts[1])).replace("\\"USER\\"", "\\"ADMIN\\"").getBytes()) + "." + parts[2];
try { decoder.decode(tampered); } catch (JwtException e) { System.out.println("roles edited to ADMIN -> " + e.getMessage()); }`,
      analogy: "A JWT is a concert wristband with a hologram: anyone can read what's printed on it, but only the venue can make the hologram, and it's only valid for tonight." },
    { title: "Resource server: validating tokens in Spring Boot",
      text: "With `spring-boot-starter-oauth2-resource-server`, one property makes an API a **resource server**: `spring.security.oauth2.resourceserver.jwt.issuer-uri=https://idp.example.com/realms/shop`. Boot discovers the JWK Set URL, caches the keys (handling key rotation via `kid`), validates `iss` and `exp`, and installs `BearerTokenAuthenticationFilter`. By default scopes become `SCOPE_x` authorities; to use a `roles` claim, register a `JwtAuthenticationConverter`. Add an **audience** validator so tokens issued for another API are rejected. In tests, `spring-security-test`'s `jwt()` post-processor builds the authentication without a real IdP.",
      code: `@Configuration @EnableWebMvc @EnableWebSecurity
class ResourceServer {
    @Bean SecurityFilterChain api(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(a -> a.requestMatchers(HttpMethod.DELETE, "/orders/**").hasAuthority("SCOPE_orders.write").anyRequest().authenticated())
            .oauth2ResourceServer(o -> o.jwt(j -> { })).sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS)).build();
    }
    @Bean JwtDecoder jwtDecoder() { return token -> { throw new BadJwtException("tests use jwt() instead"); }; }
}
@RestController class Orders {
    @GetMapping("/orders") String list(@AuthenticationPrincipal Jwt jwt) { return "orders of " + jwt.getSubject() + " (iss " + jwt.getIssuer() + ")"; }
    @DeleteMapping("/orders/{id}") ResponseEntity<Void> delete(@PathVariable long id) { return ResponseEntity.noContent().build(); }
}
var ctx = new AnnotationConfigWebApplicationContext();
ctx.setServletContext(new MockServletContext()); ctx.register(ResourceServer.class, Orders.class); ctx.refresh();
MockMvc mvc = MockMvcBuilders.webAppContextSetup(ctx).apply(springSecurity()).build();
var reader = jwt().jwt(j -> j.subject("asha").issuer("https://idp.example.com").claim("scope", "orders.read"));
var writer = jwt().jwt(j -> j.subject("ops").claim("scope", "orders.read orders.write"));
System.out.println("GET with token        : " + mvc.perform(get("/orders").with(reader)).andReturn().getResponse().getContentAsString());
System.out.println("DELETE, read scope    : " + mvc.perform(delete("/orders/9").with(reader)).andReturn().getResponse().getStatus());
System.out.println("DELETE, write scope   : " + mvc.perform(delete("/orders/9").with(writer)).andReturn().getResponse().getStatus());
System.out.println("garbage bearer token  : " + mvc.perform(get("/orders").header("Authorization", "Bearer abc")).andReturn().getResponse().getHeader("WWW-Authenticate"));`,
      analogy: "The API is a border officer who doesn't issue passports; it only checks the issuing country's seal (signature), the expiry date and that the visa is for this country (audience)." },
    { title: "OAuth2 and OpenID Connect: who does what",
      text: "OAuth2 is about **delegated authorisation**; OpenID Connect adds **login** (an ID token saying who the user is). Four roles: the **resource owner** (user), the **client** (your web or mobile app), the **authorisation server** (Keycloak, Okta, Auth0, Entra ID, Spring Authorization Server) and the **resource server** (your API). Browsers and mobile apps use the **authorisation code flow with PKCE**; service-to-service calls use **client credentials**. In Spring, `oauth2Login()` makes your app an OIDC *client* (session-based login with an external IdP), while `oauth2ResourceServer()` makes it an API that accepts access tokens. Many backends are only resource servers; a BFF/gateway is the client.",
      m: M(["sequenceDiagram",
        "  participant U as Browser",
        "  participant C as Client app",
        "  participant AS as Auth server",
        "  participant RS as Orders API",
        "  U->>C: open app",
        "  C->>U: redirect to AS (code_challenge)",
        "  U->>AS: log in + consent",
        "  AS->>C: redirect back with code",
        "  C->>AS: code + code_verifier",
        "  AS->>C: access token (+ ID token, refresh token)",
        "  C->>RS: GET /orders, Bearer token",
        "  RS->>RS: verify signature, exp, iss, aud",
        "  RS->>C: 200 orders"]),
      table: [["Flow", "Used by", "Spring"],
        ["Authorisation code + PKCE", "web apps, SPAs via BFF, mobile", "oauth2Login() / oauth2-client"],
        ["Client credentials", "service-to-service", "OAuth2AuthorizedClientManager + RestClient"],
        ["(Token validation)", "APIs", "oauth2ResourceServer().jwt()"],
        ["Password grant / implicit", "deprecated, don't use", "-"]],
      analogy: "A hotel: the front desk (authorisation server) checks your passport and gives you a key card (access token); the room doors (APIs) only check the card, never your passport." },
    { title: "CSRF, CORS and common misconfigurations",
      text: "**CSRF** abuses cookies: a malicious page makes the victim's browser send a state-changing request with their session cookie. Spring's `CsrfFilter` requires a secret token on POST/PUT/DELETE. Keep it **on** for cookie/session-based apps; disabling it is fine only for **stateless APIs that authenticate with headers** (bearer tokens), not cookies. **CORS** is the browser's rule for which *other origins* may call your API; configure it in Security (`http.cors(...)`) so preflights are answered before authentication, list exact origins, and never combine `*` with credentials. CORS is not access control: non-browser clients ignore it.",
      table: [["Misconfiguration", "Consequence"],
        ["csrf().disable() on a session/cookie app", "CSRF attacks work"],
        ["permitAll() on /actuator/** or /h2-console", "data and env leaks"],
        ["Broad rule before specific one", "admin paths open (first match wins)"],
        ["Roles checked only in the UI", "API callable directly"],
        ["Long-lived JWTs with no audience check", "stolen or foreign tokens accepted"],
        ["allowedOrigins(\"*\") with credentials", "rejected by Spring; with patterns, any site can read responses"]],
      code: `@Configuration @EnableWebMvc @EnableWebSecurity
class Web {
    @Bean SecurityFilterChain chain(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(a -> a.anyRequest().authenticated()).formLogin(f -> { })
            .cors(c -> c.configurationSource(req -> { var cfg = new CorsConfiguration(); cfg.setAllowedOrigins(List.of("https://shop.example.com")); cfg.setAllowedMethods(List.of("GET", "POST")); return cfg; }))
            .build();
    }
}
@RestController class Transfers { @PostMapping("/transfer") String transfer() { return "moved 500 INR"; } }
var ctx = new AnnotationConfigWebApplicationContext();
ctx.setServletContext(new MockServletContext()); ctx.register(Web.class, Transfers.class); ctx.refresh();
MockMvc mvc = MockMvcBuilders.webAppContextSetup(ctx).apply(springSecurity()).build();
System.out.println("POST with session, no CSRF token : " + mvc.perform(post("/transfer").with(user("asha"))).andReturn().getResponse().getStatus());
System.out.println("POST with session + CSRF token   : " + mvc.perform(post("/transfer").with(user("asha")).with(csrf())).andReturn().getResponse().getContentAsString());
for (String origin : List.of("https://shop.example.com", "https://evil.example")) {
    var r = mvc.perform(options("/transfer").header("Origin", origin).header("Access-Control-Request-Method", "POST")).andReturn().getResponse();
    System.out.println("preflight from " + origin + " : " + r.getStatus() + " allow-origin=" + r.getHeader("Access-Control-Allow-Origin"));
}`,
      analogy: "CSRF is a forged letter signed with your stamp that someone slipped into your outbox; the CSRF token is a secret word only letters written at your desk contain." }
  ];

  H.registerLesson({
    code: "S08",
    summary: "How Spring Security protects a Spring Boot app: the servlet filter chain and multiple `SecurityFilterChain` beans, authentication vs authorisation (401 vs 403), password hashing with BCrypt and `DelegatingPasswordEncoder`, `UserDetailsService` and the `AuthenticationManager`, the thread-bound `SecurityContext`, URL rules and their order, method security with `@PreAuthorize` for ownership checks, JWTs and stateless resource servers, OAuth2/OIDC roles and flows, and CSRF, CORS and the misconfigurations that cause real breaches.",
    slides: SLIDES,
    widget: { heading: "Interactive: follow a request through the filter chain", caption: "Every response here was recorded from a real Spring Boot 3.4 app with two filter chains (JWT API and form-login web) using RS256 tokens it signed itself. The chips are the actual filters in order; the highlighted one decided the outcome.", render: s08Widget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Mobile + web backend", "One Boot app exposes `/api/**` to a mobile app with Keycloak-issued JWTs and serves an admin UI with form login: two filter chains."],
      ["Microservices", "Each service is a resource server validating tokens from the same issuer, and checks `aud` so a token for the payments API can't call the HR API."],
      ["Multi-tenant SaaS", "`@PreAuthorize(\"@tenantGuard.canRead(#tenantId)\")` stops users from reading other tenants' data by changing a path variable."],
      ["Password migration", "Old SHA-1 hashes are prefixed `{sha1}` behind a DelegatingPasswordEncoder and upgraded to bcrypt at each user's next login."],
      ["SPA on another domain", "`https://app.example.com` calls `https://api.example.com`; CORS is configured in the security chain so preflights get through."],
      ["Security review findings", "Actuator endpoints left open, CSRF disabled on a cookie-based app, and roles only checked in the frontend."]
    ],
    pitfalls: [
      "Confusing 401 (not authenticated) with 403 (not allowed)",
      "Putting a broad URL rule before a specific one (first match wins)",
      "Mixing up `hasRole(\"X\")` (`ROLE_X`) and `hasAuthority(\"X\")`",
      "Disabling CSRF on a cookie/session-based app",
      "Storing secrets in JWT claims, or accepting tokens without checking `aud`",
      "Expecting `SecurityContextHolder` to work in `@Async` or executor threads",
      "`@PreAuthorize` on private methods or self-invoked calls (proxy bypassed)",
      "Treating CORS as access control"
    ],
    quiz: [
      { q: "A request with no token to a protected API endpoint returns…", options: ["403", "401 with WWW-Authenticate: Bearer", "302 to /login", "500"], answer: 1, why: "Recorded 'No token' scenario." },
      { q: "A valid USER token calls DELETE that requires ADMIN. Result?", options: ["401", "403 insufficient_scope", "204", "405"], answer: 1, why: "Authenticated but not authorised." },
      { q: "Which filter rejects an expired or forged JWT?", options: ["CsrfFilter", "AuthorizationFilter", "BearerTokenAuthenticationFilter", "CorsFilter"], answer: 2, why: "It decodes and validates the token before authorisation." },
      { q: "Why do two bcrypt hashes of the same password differ?", options: ["Bug", "Random salt per hash", "Time-based", "Different cost"], answer: 1, why: "Salt; matches() still works for both." },
      { q: "Rules: `/admin/**` authenticated, then `/admin/users/**` hasRole ADMIN. A USER calls /admin/users/list:", options: ["403", "200: the first rule matched", "401", "Startup error"], answer: 1, why: "First match wins." },
      { q: "Where should a 'users can only read their own invoices' check go?", options: ["CORS config", "Method security, e.g. @PreAuthorize(\"#owner == authentication.name\")", "Password encoder", "The frontend"], answer: 1, why: "Ownership needs the arguments; prevents IDOR." },
      { q: "When is disabling CSRF reasonable?", options: ["Always for REST", "For stateless APIs authenticated by headers (bearer tokens), not cookies", "When using HTTPS", "Never"], answer: 1, why: "CSRF exploits automatically sent cookies." },
      { q: "Anyone holding a JWT can…", options: ["Change its roles", "Read its claims", "Extend its expiry", "Nothing"], answer: 1, why: "Base64url, not encrypted; edits break the signature." },
      { q: "In a 2-chain setup, the browser POSTs to /login without a CSRF token. What happens?", options: ["Logged in", "403 from CsrfFilter before the password is checked", "401", "302 /login?error"], answer: 1, why: "Recorded 'Login without CSRF token'." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Code"],
        ["Chain bean", "`@Bean SecurityFilterChain api(HttpSecurity http)`"],
        ["Scope a chain", "`http.securityMatcher(\"/api/**\")` + `@Order(1)`"],
        ["URL rules", "`authorizeHttpRequests(a -> a.requestMatchers(..).hasRole(..).anyRequest().authenticated())`"],
        ["JWT API", "`oauth2ResourceServer(o -> o.jwt(withDefaults()))` + `jwt.issuer-uri`"],
        ["Stateless", "`sessionManagement(s -> s.sessionCreationPolicy(STATELESS))`"],
        ["Method security", "`@EnableMethodSecurity` + `@PreAuthorize(\"...\")`"],
        ["Passwords", "`PasswordEncoderFactories.createDelegatingPasswordEncoder()`"],
        ["Tests", "`.with(user(\"a\").roles(\"ADMIN\"))`, `.with(jwt())`, `.with(csrf())`"]],
      cards: [
        { title: "Flow", items: ["FilterChainProxy picks a chain", "Authentication filter", "SecurityContext", "AuthorizationFilter", "401 / 403"] },
        { title: "Tokens", items: ["Signed, readable", "Check exp, iss, aud", "Short-lived + refresh", "JWK Set + kid rotation"] },
        { title: "Say in interviews", items: ["AuthN vs AuthZ", "Why bcrypt", "CSRF vs CORS", "JWT revocation trade-off", "OAuth2 roles + PKCE"] }]
    },
    practice: [
      { level: "Easy", q: "Explain the difference between 401 and 403 in Spring Security.",
        a: ["401 Unauthorized: no valid authentication; the entry point asks for credentials (WWW-Authenticate or redirect to login).",
          "403 Forbidden: the user is authenticated but lacks the required role/authority, or CSRF failed.",
          "ExceptionTranslationFilter maps AuthenticationException → 401 and AccessDeniedException → 403."] },
      { level: "Easy", q: "Hash and verify a password with BCrypt.",
        a: ["Use BCryptPasswordEncoder (or the delegating encoder).",
          "encode() produces a salted hash; matches() verifies.",
          "Never decrypt; you compare."],
        code: `PasswordEncoder enc = PasswordEncoderFactories.createDelegatingPasswordEncoder();
String stored = enc.encode("correct horse");
System.out.println(stored.substring(0, 20) + "…");
System.out.println("right: " + enc.matches("correct horse", stored) + ", wrong: " + enc.matches("battery staple", stored));` },
      { level: "Easy", q: "Write a test that a USER gets 403 and an ADMIN gets 200 on /admin.",
        a: ["Configure hasRole(\"ADMIN\") for /admin/**.",
          "Use spring-security-test's user() post-processor.",
          "Assert the statuses."],
        code: `@Configuration @EnableWebMvc @EnableWebSecurity
class AdminSec { @Bean SecurityFilterChain c(HttpSecurity http) throws Exception { return http.authorizeHttpRequests(a -> a.requestMatchers("/admin/**").hasRole("ADMIN").anyRequest().authenticated()).build(); } }
@RestController class AdminApi { @GetMapping("/admin/stats") String stats() { return "42 users"; } }
var ctx = new AnnotationConfigWebApplicationContext();
ctx.setServletContext(new MockServletContext()); ctx.register(AdminSec.class, AdminApi.class); ctx.refresh();
MockMvc mvc = MockMvcBuilders.webAppContextSetup(ctx).apply(springSecurity()).build();
System.out.println("USER : " + mvc.perform(get("/admin/stats").with(user("u").roles("USER"))).andReturn().getResponse().getStatus());
System.out.println("ADMIN: " + mvc.perform(get("/admin/stats").with(user("a").roles("ADMIN"))).andReturn().getResponse().getStatus());` },
      { level: "Medium", q: "How does a Spring Boot resource server validate a JWT?",
        a: ["issuer-uri → discovers the JWK Set URI from OIDC metadata and caches public keys (by kid).",
          "BearerTokenAuthenticationFilter extracts the token; JwtDecoder verifies signature, exp/nbf and iss (plus any custom validators like audience).",
          "JwtAuthenticationConverter maps claims (scope or roles) to authorities; the Authentication is placed in the SecurityContext."] },
      { level: "Medium", q: "Map a custom `roles` claim to ROLE_ authorities.",
        a: ["Configure JwtGrantedAuthoritiesConverter with claim name and prefix.",
          "Wrap it in a JwtAuthenticationConverter and register it on .jwt(...).",
          "Then hasRole(\"ADMIN\") works."],
        code: `var granted = new JwtGrantedAuthoritiesConverter();
granted.setAuthoritiesClaimName("roles"); granted.setAuthorityPrefix("ROLE_");
var converter = new JwtAuthenticationConverter(); converter.setJwtGrantedAuthoritiesConverter(granted);
Jwt jwt = Jwt.withTokenValue("t").header("alg", "RS256").subject("asha").claim("roles", List.of("USER", "ADMIN")).build();
System.out.println(converter.convert(jwt).getAuthorities());` },
      { level: "Medium", q: "Why can't you easily revoke a JWT, and what do you do about it?",
        a: ["Resource servers validate locally without asking the issuer, so a valid token works until exp.",
          "Keep access tokens short-lived and rotate refresh tokens (revocable at the auth server).",
          "For immediate revocation: opaque tokens with introspection, or a deny-list of jti checked in a validator, at a performance cost."] },
      { level: "Medium", q: "Propagate the security context to an executor thread.",
        a: ["SecurityContextHolder is thread-local; plain executors lose it.",
          "Wrap the executor with DelegatingSecurityContextExecutorService.",
          "The context is copied at submit time and cleared afterwards."],
        code: `SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated("asha", null, List.of()));
ExecutorService raw = Executors.newFixedThreadPool(1);
ExecutorService wrapped = new org.springframework.security.concurrent.DelegatingSecurityContextExecutorService(raw);
Callable<String> who = () -> String.valueOf(SecurityContextHolder.getContext().getAuthentication() == null ? null : SecurityContextHolder.getContext().getAuthentication().getName());
System.out.println("raw: " + raw.submit(who).get() + ", wrapped: " + wrapped.submit(who).get());
raw.shutdown();` },
      { level: "Hard", q: "Design security for a system with a React SPA, a mobile app and three microservices.",
        steps: ["Use an IdP (Keycloak/Okta/Entra) as authorisation server with OIDC.",
          "SPA: a BFF (Spring Cloud Gateway or Boot app with oauth2Login) holds tokens server-side; the browser gets an HttpOnly session cookie, so keep CSRF on at the BFF.",
          "Mobile: authorisation code + PKCE, short-lived access tokens, refresh tokens in secure storage.",
          "Microservices: resource servers validating iss, exp and aud; scopes/roles mapped to authorities; method security for ownership.",
          "Service-to-service: client credentials or token exchange; mTLS inside the mesh; centralised audit logging."] },
      { level: "Hard", q: "Review this config and list the problems: `csrf().disable()`, `permitAll()` on `/actuator/**`, sessions on, `requestMatchers(\"/api/**\").authenticated()` before `requestMatchers(\"/api/admin/**\").hasRole(\"ADMIN\")`.",
        a: ["CSRF disabled while using sessions/cookies → CSRF attacks possible.",
          "Actuator fully public → env, heap dumps, metrics leak; expose only health/info and secure the rest.",
          "Rule order: the broad /api/** matches first, so any authenticated user reaches admin endpoints.",
          "Fix: specific rules first, deny by default, CSRF on (or stateless tokens), management endpoints on a separate port or secured."] },
      { level: "Hard", q: "Verify a JWT's audience in addition to signature and issuer.",
        a: ["Build a validator for the aud claim.",
          "Combine with JwtValidators.createDefaultWithIssuer via DelegatingOAuth2TokenValidator.",
          "Set it on the decoder; tokens for another API fail."],
        code: `org.springframework.security.oauth2.core.OAuth2TokenValidator<Jwt> audience = new JwtClaimValidator<List<String>>("aud", aud -> aud != null && aud.contains("orders-api"));
org.springframework.security.oauth2.core.OAuth2TokenValidator<Jwt> all = new org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer("https://idp.example.com"), audience);
var now = java.time.Instant.now();
for (String aud : List.of("orders-api", "hr-api")) {
    Jwt jwt = Jwt.withTokenValue("t").header("alg", "RS256").issuer("https://idp.example.com").audience(List.of(aud)).issuedAt(now).expiresAt(now.plusSeconds(300)).build();
    var r = all.validate(jwt);
    System.out.println(aud + " -> " + (r.hasErrors() ? "rejected: " + r.getErrors().iterator().next().getDescription() : "accepted"));
}` }
    ],
    recap: [
      "Security runs as servlet filters; FilterChainProxy picks one SecurityFilterChain per request.",
      "401 = not authenticated, 403 = authenticated but not allowed (or CSRF failed).",
      "Hash passwords with bcrypt via DelegatingPasswordEncoder; authenticate via UserDetailsService + AuthenticationManager.",
      "URL rules: first match wins, deny by default; method security for ownership checks.",
      "JWT APIs: stateless, validate signature/exp/iss/aud, short-lived tokens; CSRF matters for cookies, CORS for browsers."
    ]
  });
})();
