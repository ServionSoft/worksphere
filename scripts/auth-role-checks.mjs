import assert from "assert";

const DEMO_PASSWORD = "WorkSphere!2026";
const DEMO_ACCOUNTS = [
  { email: "admin@worksphere.demo", password: DEMO_PASSWORD, portal: "admin" },
  { email: "client@worksphere.demo", password: DEMO_PASSWORD, portal: "client" },
  {
    email: "developer@worksphere.demo",
    password: DEMO_PASSWORD,
    portal: "developer",
  },
];

function authenticate(email, password, portal) {
  const account = DEMO_ACCOUNTS.find((a) => a.email === email.trim().toLowerCase());
  if (!account || account.password !== password) {
    return { ok: false, error: "Invalid email or password." };
  }
  if (account.portal !== portal) {
    return { ok: false, error: "Portal mismatch." };
  }
  return { ok: true, portal: account.portal };
}

function requiredPortal(pathname) {
  // Do not treat admin /clients as the client portal
  if (pathname === "/client" || pathname.startsWith("/client/")) return "client";
  if (pathname.startsWith("/developer")) return "developer";
  if (
    pathname === "/" ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/settings")
  ) {
    return "admin";
  }
  return null;
}

// Valid logins
assert.equal(authenticate("admin@worksphere.demo", DEMO_PASSWORD, "admin").ok, true);
assert.equal(authenticate("client@worksphere.demo", DEMO_PASSWORD, "client").ok, true);
assert.equal(
  authenticate("developer@worksphere.demo", DEMO_PASSWORD, "developer").ok,
  true
);

// Invalid credentials
assert.equal(authenticate("admin@worksphere.demo", "wrong", "admin").ok, false);

// Wrong portal
assert.equal(
  authenticate("client@worksphere.demo", DEMO_PASSWORD, "admin").ok,
  false
);
assert.equal(
  authenticate("admin@worksphere.demo", DEMO_PASSWORD, "developer").ok,
  false
);

// Route portal mapping
assert.equal(requiredPortal("/"), "admin");
assert.equal(requiredPortal("/projects/p1"), "admin");
assert.equal(requiredPortal("/client/dashboard"), "client");
assert.equal(requiredPortal("/developer/marketplace"), "developer");

console.log("auth-role-checks: all passed");
