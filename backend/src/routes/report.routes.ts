import { Router } from "express";
import {
  createReportController,
  deleteAttachmentController,
  deleteReportController,
  generatePdfController,
  getReportController,
  listReportsController,
  recalculateController,
  updateReportController,
  updateStatusController,
  uploadAttachmentsController,
  previewReportController,
} from "../controllers/report.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateBody, validateQuery } from "../middleware/validate.middleware";
import { reportInputSchema, reportQuerySchema, statusUpdateSchema } from "../types/report.dto";
import { upload } from "../utils/upload";

const router = Router();

router.get("/", authenticate(), validateQuery(reportQuerySchema), listReportsController);
router.get("/:id", authenticate(), getReportController);
router.post("/", authenticate(["appraiser", "admin"]), validateBody(reportInputSchema), createReportController);
router.put("/:id", authenticate(["appraiser", "admin"]), validateBody(reportInputSchema), updateReportController);
router.delete("/:id", authenticate(["admin"]), deleteReportController);
router.patch("/:id/status", authenticate(), validateBody(statusUpdateSchema), updateStatusController);
router.post("/:id/recalculate", authenticate(), recalculateController);
router.post("/:id/attachments", authenticate(), upload.array("files", 10), uploadAttachmentsController);
router.delete("/:id/attachments/:attachmentId", authenticate(), deleteAttachmentController);
router.get("/:id/preview", authenticate(), previewReportController);
router.get("/:id/pdf", authenticate(), generatePdfController);

export default router;
