import { handleAuthRedirect, isAuthRedirect } from "./lib/auth.js";

// This page is also the Auth0 callback and logout URL for every conference.
if (isAuthRedirect()) {
  document.documentElement.classList.add("auth-redirect");
  handleAuthRedirect().then((leaving) => {
    if (!leaving) document.documentElement.classList.remove("auth-redirect");
  });
}
