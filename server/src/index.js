import app from "./app.js";
import env from "./utils/env.util.js";
import path from "path"

const PORT = env.PORT || 5000;

app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "src/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
