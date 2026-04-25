import { Router } from "express";
import {
  createAdminEvent,
  createAdminVenue,
  createAdminVenueLayout,
} from "../controllers/admin.controller.js";

const router = Router();

router.post("/venues", createAdminVenue);
router.post("/venues/full-setup", createAdminVenueLayout);
router.post("/events", createAdminEvent);

export default router;
