import { Router } from "express";
import { aiController } from "../controllers/ai.controller";

const router = Router();

import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

router.post("/generate-remarks", aiController.generateRemarks);
router.post("/predict-price", aiController.predictPrice);
router.post("/chat", aiController.chat);
router.post("/extract-document", upload.single("file"), aiController.extractDocument);
router.post("/analyze-image", upload.single("file"), aiController.analyzeImage);




export const aiRoutes = router;
