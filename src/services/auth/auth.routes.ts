import { Router } from 'express';
import { AuthController } from './auth.controller';

const router = Router();

// Authentication routes
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.post('/logout', AuthController.logout);
router.post('/refresh', AuthController.refreshToken);

// MFA routes
router.post('/mfa/setup', AuthController.setupMFA);
router.post('/mfa/verify', AuthController.verifyMFA);
router.post('/mfa/disable', AuthController.disableMFA);

// Profile routes
router.get('/profile', AuthController.getProfile);
router.put('/profile', AuthController.updateProfile);

// Token validation
router.post('/validate', AuthController.validate);

// TODO: Add SSO routes (SAML/OIDC)
// router.post('/sso/saml', AuthController.samlLogin);
// router.get('/sso/callback', AuthController.ssoCallback);

export default router;