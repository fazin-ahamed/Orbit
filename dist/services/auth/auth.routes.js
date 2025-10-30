"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const router = (0, express_1.Router)();
// Authentication routes
router.post('/login', auth_controller_1.AuthController.login);
router.post('/register', auth_controller_1.AuthController.register);
router.post('/logout', auth_controller_1.AuthController.logout);
router.post('/refresh', auth_controller_1.AuthController.refreshToken);
// MFA routes
router.post('/mfa/setup', auth_controller_1.AuthController.setupMFA);
router.post('/mfa/verify', auth_controller_1.AuthController.verifyMFA);
router.post('/mfa/disable', auth_controller_1.AuthController.disableMFA);
// Profile routes
router.get('/profile', auth_controller_1.AuthController.getProfile);
router.put('/profile', auth_controller_1.AuthController.updateProfile);
// Token validation
router.post('/validate', auth_controller_1.AuthController.validate);
// TODO: Add SSO routes (SAML/OIDC)
// router.post('/sso/saml', AuthController.samlLogin);
// router.get('/sso/callback', AuthController.ssoCallback);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map