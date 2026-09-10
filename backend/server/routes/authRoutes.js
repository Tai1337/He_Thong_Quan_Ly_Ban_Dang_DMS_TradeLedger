import express from 'express';
import { loginUser } from '../controllers/authController.js';

const router = express.Router();

export const setupAuthRoutes = (io) => {
  router.post('/login', (req, res) => loginUser(req, res, io));
  return router;
};

export default router;
