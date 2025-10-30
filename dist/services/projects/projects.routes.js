"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const projects_controller_1 = require("./projects.controller");
const router = (0, express_1.Router)();
// Projects
router.post('/projects', projects_controller_1.ProjectsController.createProject);
router.get('/projects', projects_controller_1.ProjectsController.getProjects);
router.put('/projects/:id', projects_controller_1.ProjectsController.updateProject);
// Tasks
router.post('/tasks', projects_controller_1.ProjectsController.createTask);
router.get('/tasks', projects_controller_1.ProjectsController.getTasks);
router.put('/tasks/:id', projects_controller_1.ProjectsController.updateTask);
// Dashboard
router.get('/dashboard/stats', projects_controller_1.ProjectsController.getDashboardStats);
exports.default = router;
//# sourceMappingURL=projects.routes.js.map