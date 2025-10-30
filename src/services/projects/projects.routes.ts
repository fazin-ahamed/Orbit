import { Router } from 'express';
import { ProjectsController } from './projects.controller';

const router = Router();

// Projects
router.post('/projects', ProjectsController.createProject);
router.get('/projects', ProjectsController.getProjects);
router.put('/projects/:id', ProjectsController.updateProject);

// Tasks
router.post('/tasks', ProjectsController.createTask);
router.get('/tasks', ProjectsController.getTasks);
router.put('/tasks/:id', ProjectsController.updateTask);

// Dashboard
router.get('/dashboard/stats', ProjectsController.getDashboardStats);

export default router;
