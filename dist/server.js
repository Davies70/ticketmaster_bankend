"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const admin_routes_js_1 = __importDefault(require("./routes/admin.routes.js"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Mount the routes
app.use("/api/admin", admin_routes_js_1.default);
app.listen(3000, () => {
    console.log(`Server running on http://localhost:3000`);
});
//# sourceMappingURL=server.js.map