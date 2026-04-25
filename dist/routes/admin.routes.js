"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_js_1 = require("../controllers/admin.controller.js");
const router = (0, express_1.Router)();
router.post("/venues", admin_controller_js_1.createAdminVenue);
router.post("/venues/full-setup", admin_controller_js_1.createAdminVenueLayout);
router.post("/events", admin_controller_js_1.createAdminEvent);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map