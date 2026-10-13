import express from "express";
import { getProfile, updateProfile } from "../controllers/profileController.js";

const router = express.Router();

router.get("/", getProfile);
router.post("/", updateProfile);

export default router;
