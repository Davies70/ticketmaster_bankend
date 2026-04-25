import express from "express";
import adminRoutes from "./routes/admin.routes.js";

const app = express();
app.use(express.json());

// Mount the routes
app.use("/api/admin", adminRoutes);

app.listen(3000, () => {
  console.log(`Server running on http://localhost:3000`);
});
