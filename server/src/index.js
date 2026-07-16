import app from "./app.js";
import env from "./utils/env.util.js";

const PORT = env.PORT || 5000;

app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
