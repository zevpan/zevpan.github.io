import { createPublicKey, verify as verifySignature } from "node:crypto";
import { HttpError, ROLES, isUuid } from "./domain.mjs";

const CLOCK_SKEW_SECONDS = 60;
const JWKS_CACHE_MS = 5 * 60 * 1000;

export function createJwksVerifier({ issuer, audience, jwksUrl, fetchImpl = fetch, now = () => Date.now() }) {
  if (!issuer || !audience || !jwksUrl) throw new Error("OMS_OIDC_ISSUER, OMS_OIDC_AUDIENCE, and OMS_OIDC_JWKS_URL are required.");
  let cachedKeys = null;
  let cacheExpiresAt = 0;

  async function getKeys() {
    if (cachedKeys && now() < cacheExpiresAt) return cachedKeys;
    let response;
    try {
      response = await fetchImpl(jwksUrl, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(5000) });
    } catch {
      throw new HttpError(503, "identity_keys_unavailable", "Identity verification is temporarily unavailable.");
    }
    if (!response.ok) throw new HttpError(503, "identity_keys_unavailable", "Identity verification is temporarily unavailable.");
    let body;
    try { body = await response.json(); }
    catch { throw new HttpError(503, "identity_keys_invalid", "Identity provider returned an invalid key set."); }
    if (!Array.isArray(body.keys)) throw new HttpError(503, "identity_keys_invalid", "Identity provider returned an invalid key set.");
    cachedKeys = body.keys.filter(key => key.kty === "RSA" && key.use !== "enc" && (!key.alg || key.alg === "RS256") && (!key.key_ops || key.key_ops.includes("verify")));
    cacheExpiresAt = now() + JWKS_CACHE_MS;
    return cachedKeys;
  }

  return async function verifyAuthorization(authorization) {
    const token = typeof authorization === "string" && authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token || token.length > 12000) throw new HttpError(401, "unauthorized", "A valid bearer token is required.");
    const parts = token.split(".");
    if (parts.length !== 3) throw new HttpError(401, "unauthorized", "Bearer token is invalid.");

    let header;
    try {
      header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    } catch {
      throw new HttpError(401, "unauthorized", "Bearer token is invalid.");
    }
    if (header.alg !== "RS256" || typeof header.kid !== "string" || ["crit", "b64", "jku", "x5u", "jwk"].some(name => Object.hasOwn(header, name))) {
      throw new HttpError(401, "unauthorized", "Bearer token header is not accepted.");
    }

    const keys = await getKeys();
    const jwk = keys.find(key => key.kid === header.kid);
    if (!jwk) {
      cachedKeys = null;
      const refreshedKeys = await getKeys();
      const refreshed = refreshedKeys.find(key => key.kid === header.kid);
      if (!refreshed) throw new HttpError(401, "unauthorized", "Bearer token signing key is unknown.");
      return verifyClaims(parts, refreshed, issuer, audience, now());
    }
    return verifyClaims(parts, jwk, issuer, audience, now());
  };
}

function verifyClaims(parts, jwk, issuer, audience, nowMs) {
  let key;
  try {
    key = createPublicKey({ key: jwk, format: "jwk" });
  } catch {
    throw new HttpError(503, "identity_key_invalid", "Identity provider signing key is invalid.");
  }
  let validSignature = false;
  try { validSignature = verifySignature("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], "base64url")); }
  catch { throw new HttpError(401, "unauthorized", "Bearer token signature is invalid."); }
  if (!validSignature) throw new HttpError(401, "unauthorized", "Bearer token signature is invalid.");

  let claims;
  try {
    claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    throw new HttpError(401, "unauthorized", "Bearer token claims are invalid.");
  }
  const nowSeconds = Math.floor(nowMs / 1000);
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== issuer || !audiences.includes(audience) || !Number.isFinite(claims.exp) || claims.exp + CLOCK_SKEW_SECONDS <= nowSeconds || (claims.nbf != null && (!Number.isFinite(claims.nbf) || claims.nbf > nowSeconds + CLOCK_SKEW_SECONDS)) || (claims.iat != null && (!Number.isFinite(claims.iat) || claims.iat > nowSeconds + CLOCK_SKEW_SECONDS))) {
    throw new HttpError(401, "unauthorized", "Bearer token is expired or intended for another service.");
  }
  if (typeof claims.sub !== "string" || claims.sub.length < 1 || claims.sub.length > 255 || !isUuid(claims.tenant_id) || !Array.isArray(claims.roles)) {
    throw new HttpError(403, "invalid_identity", "The identity token is missing a user, tenant, or role claim.");
  }
  const roles = claims.roles.filter(role => ROLES.includes(role));
  if (!roles.length) throw new HttpError(403, "invalid_identity", "The identity token has no supported OMS role.");
  if ((claims.supplier_id != null && (typeof claims.supplier_id !== "string" || claims.supplier_id.length > 255)) || (claims.driver_id != null && (typeof claims.driver_id !== "string" || claims.driver_id.length > 255))) {
    throw new HttpError(403, "invalid_identity", "The identity token has an invalid supplier or driver assignment.");
  }
  return { subject: claims.sub, tenantId: claims.tenant_id, roles, supplierId: claims.supplier_id || null, driverId: claims.driver_id || null };
}
