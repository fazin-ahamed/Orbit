"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ai_controller_1 = require("./ai.controller");
const vector_routes_1 = __importDefault(require("./vector.routes"));
const router = (0, express_1.Router)();
// AI provider management
router.get('/providers', ai_controller_1.AIController.getProviders);
router.post('/providers/configure', ai_controller_1.AIController.configureProvider);
router.get('/providers/test', ai_controller_1.AIController.testConnection);
// AI operations
router.post('/chat/completions', ai_controller_1.AIController.createChatCompletion);
router.post('/embeddings', ai_controller_1.AIController.createEmbedding);
// AI usage and monitoring
router.get('/usage', ai_controller_1.AIController.getUsage);
// Vector storage routes
router.use('/', vector_routes_1.default);
exports.default = router;
//# sourceMappingURL=ai.routes.js.map