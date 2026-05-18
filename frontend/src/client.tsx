import { StrictMode, startTransition } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";

const app = (
  <StrictMode>
    <StartClient />
  </StrictMode>
);

/** True when the build shipped prerendered HTML (SSR). Static Netlify builds have an empty body. */
function hasPrerenderedShell() {
  const body = document.body;
  if (!body) return false;
  const meaningful = body.querySelector(
    "[data-tsr-active], [data-tanstack-router], #root, main, [class*='desktop']"
  );
  if (meaningful) return true;
  // Ignore our own boot placeholder from netlify-postbuild
  const onlyBoot =
    body.children.length <= 2 &&
    body.querySelector("#edunexuz-boot") &&
    !body.querySelector("main, [data-tsr-active]");
  if (onlyBoot) return false;
  return body.childElementCount > 0 && body.textContent?.trim().length > 0;
}

startTransition(() => {
  if (hasPrerenderedShell()) {
    hydrateRoot(document, app);
  } else {
    createRoot(document).render(app);
  }
});
