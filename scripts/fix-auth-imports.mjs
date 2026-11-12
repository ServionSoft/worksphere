import fs from "fs";
import path from "path";

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!full.endsWith(".tsx")) continue;
    const source = fs.readFileSync(full, "utf8");
    const next = source
      .replaceAll(
        'import { useAuth } from "@/lib/auth-store";',
        'import { useRequiredAuth } from "@/lib/auth-store";'
      )
      .replaceAll(
        "import { useAuth } from '@/lib/auth-store';",
        "import { useRequiredAuth } from '@/lib/auth-store';"
      )
      .replaceAll("useAuth()", "useRequiredAuth()");
    if (next !== source) {
      fs.writeFileSync(full, next);
      console.log("updated", full);
    }
  }
}

walk("components/client");
walk("components/developer");
