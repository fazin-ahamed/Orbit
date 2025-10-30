"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_controller_1 = require("./database.controller");
const router = (0, express_1.Router)();
// Database health and diagnostic routes
router.get('/health', database_controller_1.DatabaseController.healthCheck);
router.get('/stats', database_controller_1.DatabaseController.getStats);
router.get('/test-connection', database_controller_1.DatabaseController.testConnection);
exports.default = router;
//# sourceMappingURL=database.routes.js.map