import SimpleAuthBaseAuthenticator from 'ember-simple-auth/authenticators/base';
import { resolve, reject } from 'rsvp';
import fetch from 'fetch';

/**
 * Encapsulates common authenticator functionality.
 *
 * Upon session invalidation, deauthentication should be attempted at the URL
 * generated by `buildDeauthEndpointURL` on a best-effort basis.
 *
 * When a session is restored, a call should be made to the endpoint specified
 * by `buildTokenValidationEndpointURL`.  If this endpoint responds with 401 or
 * 404, then the session is invalid and the restoration should be rejected.
 * All other responses should resolve the session restoration successfully.
 */
export default class BaseAuthenticator extends SimpleAuthBaseAuthenticator {
  // =unimplemented methods

  /**
   * Generates an auth method URL with which to authenticate.
   * @override
   * @param {object} options
   * @param {string} options.scope.scope_id
   * @param {string} options.authMethod.id
   * @return {string}
   */
  buildAuthEndpointURL(/* {
    scope: { id: scopeID },
    authMethod: { id: authMethodID },
  } */) {}

  /**
   * Generates a scope URL with which to deauthenticate.
   * @override
   * @param {object} options
   * @param {string} scopeID
   * @return {string}
   */
  buildDeauthEndpointURL(/* { scope: { id: scopeID } } */) {}

  /**
   * Generates an auth token validation URL used to check tokens on restoration.
   * @override
   * @param {string} tokenID
   * @return {string}
   */
  buildTokenValidationEndpointURL(/* tokenID */) {}

  // =methods

  /**
   * Checks that the given token is valid and resolves, otherwise rejects.
   */
  async validateToken(token, tokenID) {
    const tokenValidationURL = this.buildTokenValidationEndpointURL(tokenID);
    const response = await fetch(tokenValidationURL, {
      method: 'get',
      headers: { Authorization: `Bearer ${token}` },
    });
    // 401 and 404 responses mean the token is invalid, whereas other types of
    // error responses do not tell us about the validity of the token.
    if (response.status === 401 || response.status === 404) return reject();
    return resolve();
  }

  /**
   * Restores the session if data is present and token validation succeeds
   * (any response other than 401 or 404 === success).  Otherwise rejects.
   * @override
   * @param {object} data
   * @return {Promise}
   */
  async restore(data) {
    if (!data) return reject();
    return this.validateToken(
      data.attributes.token,
      data.attributes.id
    ).then(() => this.normalizeData(data));
  }

  /**
   * Normalizes the auth data.  Adds convenience booleans depending on the
   * scope within which the session is authenticated:  isGlobal, isOrg.
   * If a `username` is provided, appends this to the data.
   * @param {object} data
   * @param {string} username
   * @return {object}
   */
  normalizeData(data, username) {
    // Pull fields up from `data.attributes` for easier access in JavaScript.
    // The `attributes` field exists on the Go side for its convenience but is
    // unnecessary here.
    Object.assign(data, data.attributes);
    // Add booleans indicated the scope type
    data.isGlobal = data?.scope?.type === 'global';
    data.isOrg = data?.scope?.type === 'org';
    if (username) data.username = username;
    return data;
  }

  /**
   * Posts to the `deauthEntpoint` on a best-effort basis and then returns.
   * Deauthentication with the server is not guaranteed and request failures
   * are ignored.
   *
   * @override
   * @return {Promise}
   */
  invalidate(options) {
    const deauthEndpointURL = this.buildDeauthEndpointURL(options);
    fetch(deauthEndpointURL, { method: 'post' }).catch(() => {
      /* no op */
    });
    return super.invalidate(...arguments);
  }
}
