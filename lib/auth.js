import createAuth from "@tridnguyen/auth/spa";
import { LISTS_API } from "./lists.js";

// Client ID of the "Auth" SPA application in the tridnguyen.auth0.com tenant.
const clientId = "IxcfVZqCVF9b5FS2NVVnElOeBnoNG02Z";

// Every conference uses one callback and logout URL: the site root
// (https://tridnguyen.com/conf/ in production, http://localhost:4005/ in dev).
// The index page there finishes the redirect and sends the user back to the
// page they came from, so new conferences need no Auth0 changes.
const BASE = import.meta.env.BASE_URL;
const AUTH_HOME = new URL(BASE, location.origin).href;
const LOGOUT_RETURN_KEY = "conf-auth-logout-return";

let clientPromise;
function getClient() {
  clientPromise ||= createAuth({
    clientId,
    authorizationParams: {
      redirect_uri: AUTH_HOME,
      // Ask for a lists API token at sign-in, like the lists UI does.
      audience: LISTS_API,
      scope: "openid profile email read:list write:list",
    },
  });
  return clientPromise;
}

const currentPath = () => location.pathname + location.search + location.hash;

// Only send users back to pages on this site, under the base path.
function safeReturnPath(path) {
  if (!path) return null;
  try {
    const url = new URL(path, location.origin);
    if (url.origin === location.origin && url.pathname.startsWith(BASE)) {
      return url.pathname + url.search + url.hash;
    }
  } catch (e) {}
  return null;
}

/**
 * For conference pages. Resolves to { user, login, logout, getToken }; `user`
 * is null when signed out. login() and logout() return to the current page.
 * getToken() returns an access token for the lists API.
 */
export async function initAuth() {
  const client = await getClient();
  const user = (await client.isAuthenticated())
    ? (await client.getUser()) || {}
    : null;
  return {
    user,
    getToken: () => client.getTokenSilently(),
    login: () =>
      client.loginWithRedirect({ appState: { returnTo: currentPath() } }),
    logout: () => {
      try {
        sessionStorage.setItem(LOGOUT_RETURN_KEY, currentPath());
      } catch (e) {}
      return client.logout({ logoutParams: { returnTo: AUTH_HOME } });
    },
  };
}

/** True if this page load is coming back from Auth0 (login or logout). */
export function isAuthRedirect() {
  const q = new URLSearchParams(location.search);
  if (q.has("state") && (q.has("code") || q.has("error"))) return true;
  try {
    return !!sessionStorage.getItem(LOGOUT_RETURN_KEY);
  } catch (e) {
    return false;
  }
}

/**
 * For the index page. Finishes a login or logout redirect and sends the user
 * back to where they started. Returns true if it is navigating away.
 */
export async function handleAuthRedirect() {
  const q = new URLSearchParams(location.search);
  if (q.has("state") && (q.has("code") || q.has("error"))) {
    let to = null;
    try {
      const { appState } = await (await getClient()).handleRedirectCallback();
      to = safeReturnPath(appState?.returnTo);
    } catch (e) {
      console.error("Auth callback failed", e);
    }
    // Either way, drop ?code&state from the URL.
    location.replace(to || BASE);
    return true;
  }
  let pending = null;
  try {
    pending = sessionStorage.getItem(LOGOUT_RETURN_KEY);
    sessionStorage.removeItem(LOGOUT_RETURN_KEY);
  } catch (e) {}
  const to = safeReturnPath(pending);
  if (to) {
    location.replace(to);
    return true;
  }
  return false;
}
