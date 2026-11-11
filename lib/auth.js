import createAuth from "@tridnguyen/auth/spa";

// Client ID of the "Auth" SPA application in the tridnguyen.auth0.com tenant.
const clientId = "IxcfVZqCVF9b5FS2NVVnElOeBnoNG02Z";

function isCallback() {
  const q = new URLSearchParams(location.search);
  return q.has("state") && (q.has("code") || q.has("error"));
}

/**
 * Sign in with the tridnguyen.auth0.com tenant (Google login).
 * Resolves to { user, login, logout }. `user` is null when signed out.
 */
export async function initAuth() {
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
    user,
    login: () =>
      client.loginWithRedirect({ appState: { hash: location.hash } }),
    logout: () => client.logout({ logoutParams: { returnTo: redirectUri } }),
  };
}
