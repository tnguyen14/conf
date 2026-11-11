import createAuth from "@tridnguyen/auth/spa";

const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;

function isCallback() {
  const q = new URLSearchParams(location.search);
  return q.has("state") && (q.has("code") || q.has("error"));
}

/**
 * Sign in with the tridnguyen.auth0.com tenant (Google login).
 * Resolves to { configured, user, login, logout }. `user` is null when
 * signed out. If no client ID was set at build time, sign-in is off.
 */
export async function initAuth() {
  if (!clientId) return { configured: false, user: null };
  const redirectUri = location.origin + location.pathname;
  const client = await createAuth({
    clientId,
    authorizationParams: {
      redirect_uri: redirectUri,
      scope: "openid profile email",
    },
  });
  if (isCallback()) {
    let hash = location.hash;
    try {
      const { appState } = await client.handleRedirectCallback();
      hash = appState?.hash || "";
    } catch (e) {
      console.error("Auth callback failed", e);
    }
    // Drop ?code&state from the URL and return to the tab the user was on.
    history.replaceState(null, "", location.pathname + hash);
  }
  const user = (await client.isAuthenticated())
    ? (await client.getUser()) || {}
    : null;
  return {
    configured: true,
    user,
    login: () =>
      client.loginWithRedirect({ appState: { hash: location.hash } }),
    logout: () => client.logout({ logoutParams: { returnTo: redirectUri } }),
  };
}
