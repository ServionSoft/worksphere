import fs from "fs";

const path = "lib/mock-portals.ts";
let s = fs.readFileSync(path, "utf8");

// Add visibility + workspaceId after each opportunity status: "open",
s = s.replace(
  /status: "open",\n    projectId:/g,
  `status: "open",
    visibility: "public",
    workspaceId: "ws1",
    projectId:`
);

// Fix work submission seed — not yet authorized for client
s = s.replace(
  /requiresClientApproval: true,\n    clientApprovalStatus: "pending",/,
  `requiresClientApproval: true,
    clientApprovalStatus: "not_required",
    authorizedForClient: false,`
);

// Lock prices on existing assignments
s = s.replace(
  /requirements:\n      "Follow Checkout Spec v1\.3\. Match Nova Retail tokens\. Provide screenshots for desktop and mobile\.",/,
  `requirements:
      "Follow Checkout Spec v1.3. Match Nova Retail tokens. Provide screenshots for desktop and mobile.",
    priceLocked: true,
    deadlineLocked: true,`
);

s = s.replace(
  /requirements: "AA accessibility required\. Keep strings i18n-ready\.",/,
  `requirements: "AA accessibility required. Keep strings i18n-ready.",
    priceLocked: true,
    deadlineLocked: true,`
);

fs.writeFileSync(path, s);
console.log("opp visibility", (s.match(/visibility: "public"/g) || []).length);
console.log("authorizedForClient", s.includes("authorizedForClient: false"));
