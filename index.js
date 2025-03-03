const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

// Initialize Express app and server
const app = express();

app.use(cors());

const server = http.createServer(app);
const io = socketio(server, {
  cors: "*",
});

// Connect to MongoDB
mongoose.connect(
  "mongodb+srv://sweety:69mZCiazUo3FGXeo@cluster0.nzs9mid.mongodb.net/locationDB"
);

// Define Location schema and model
const locationSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Location = mongoose.model("Location", locationSchema);

const port = process.env.PORT || 8080;

io.on("connection", (client) => {
  console.log("New client connected!");

  client.on("location_update", async (data) => {
    const { latitude, longitude, userId, timestamp, battery, networkStatus } =
      data;

    console.log(data);

    try {
      io.emit("location_saved", {
        latitude,
        longitude,
        userId,
        timestamp,
        battery,
        networkStatus,
      });
    } catch (error) {
      console.error("Error saving location:", error);
    }
  });

  // Handle client disconnection
  client.on("disconnect", () => {
    console.log("Client disconnected!");
  });
});

app.get("/", (req, res) => {
  return res.json({
    message: "server is live",
  });
});
// Start the server
server.listen(port, () => {
  console.log(`Server is up on port ${port}!`);
});
