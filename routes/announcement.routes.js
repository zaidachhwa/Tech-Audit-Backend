import {createAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
} from "../controllers/announcement.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, createAnnouncement);
router.get("/", verifyToken, getAnnouncements);
router.delete("/:id", verifyToken, deleteAnnouncement);

export default router;