const express = require("express");
const path = require("path");

const app = express();

// serve static files (index.html, app.js, style.css) from root
app.use(express.static(__dirname));

app.get("/health", (_req, res) => res.send("ok"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Listening on", PORT));
