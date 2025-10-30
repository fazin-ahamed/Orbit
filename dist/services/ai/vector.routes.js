"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vector_controller_1 = require("./vector.controller");
const router = (0, express_1.Router)();
// Vector storage operations
router.post('/vectors', vector_controller_1.VectorController.createVector);
router.post('/vectors/search', vector_controller_1.VectorController.searchVectors);
router.get('/vectors/stats', vector_controller_1.VectorController.getVectorStats);
router.delete('/vectors/source/:source_id', vector_controller_1.VectorController.deleteVectorsBySource);
exports.default = router;
//# sourceMappingURL=vector.routes.js.map