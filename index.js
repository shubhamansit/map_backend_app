const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const mongoose = require("mongoose");

// Initialize Express app and server
const app = express();
const server = http.createServer(app);
const io = socketio(server);

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
    const { latitude, longitude } = data;

    try {
      // const newLocation = new Location({ latitude, longitude });
      // await newLocation.save();
      // console.log("Location saved:", newLocation);

      io.emit("location_saved", { latitude, longitude });
    } catch (error) {
      console.error("Error saving location:", error);
    }
  });

  // Handle client disconnection
  client.on("disconnect", () => {
    console.log("Client disconnected!");
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server is up on port ${port}!`);
});
