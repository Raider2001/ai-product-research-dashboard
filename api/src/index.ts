import "dotenv/config";
import { createApp } from "./app.js";
import { connectDatabase } from "./db.js";
import { seedDemoUser } from "./seed.js";

const port = Number(process.env.PORT || 8000);

await connectDatabase();
await seedDemoUser();

createApp().listen(port, () => {
  console.log(`Product research API listening on http://localhost:${port}`);
});
