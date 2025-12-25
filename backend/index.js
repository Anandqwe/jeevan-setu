const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./db/mongo");

connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "10mb" })); // for base64 images

// ✅ Test route
app.get("/", (req, res) => {
  res.send("Jeevan Setu Backend is running 🚑");
});


// ✅ Report Incident API (MongoDB integrated)
app.post("/api/report-incident", async (req, res) => {
  try {
    const db = await connectDB();

    const {
      imageBase64,
      voiceText,
      aiReport,
      location, // optional for now
    } = req.body;

    // Validation
    if (!imageBase64 || !aiReport) {
      return res.status(400).json({ message: "Invalid incident data" });
    }

    const incident = {
      imageBase64,
      voiceText: voiceText || "",
      aiReport,
      location: location || null,
      status: "REPORTED",
      assignedAmbulance: null,
      assignedHospital: null,
      createdAt: new Date(),
    };

    const result = await db
      .collection("incidents")
      .insertOne(incident);

    res.status(200).json({
      success: true,
      incidentId: result.insertedId,
    });
  } catch (err) {
    console.error("Error reporting incident:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
