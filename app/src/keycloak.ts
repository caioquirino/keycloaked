import Keycloak from 'keycloak-js';

export const keycloak = new Keycloak({
  url: 'http://localhost:8080',
  realm: 'playground',
  clientId: 'example-app',
});

// Expose keycloak instance in browser devtools console for easy debugging
if (typeof window !== 'undefined') {
  (window as unknown as { keycloak: Keycloak }).keycloak = keycloak;
}

let initPromise: Promise<boolean> | null = null;

export function initKeycloak(): Promise<boolean> {
  if (!initPromise) {
    initPromise = keycloak.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      checkLoginIframe: false,
    });
  }
  return initPromise;
}
