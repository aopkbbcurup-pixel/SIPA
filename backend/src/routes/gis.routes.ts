import { Router } from "express";
import { gisController } from "../controllers/gis.controller";

const router = Router();

router.get("/comparables", gisController.getComparables);

export const gisRoutes = router;
