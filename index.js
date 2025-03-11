const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const moment = require("moment-timezone");
const { type } = require("os");

// Initialize Express app and server
const app = express();
app.use(express.json());
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
  battery: {
    type: Number,
  },
  timestamp: {
    type: Date,
    default: () => moment().tz("Asia/Kolkata").toDate(),
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  uniqueId: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const Location = mongoose.model("Location", locationSchema);

// User activity tracking
const activeUsers = new Map();

const port = process.env.PORT || 8080;

io.on("connection", (client) => {
  console.log("New client connected!");

  client.on("location_update", async (data) => {
    const { latitude, longitude, userId, battery, networkStatus, uniqueId } =
      data;

    console.log(data, "hagfdhgawfdhgawfh");

    try {
      // Generate server-side timestamp in IST
      const istTimestamp = moment().tz("Asia/Kolkata").toDate();

      io.emit("location_saved", {
        latitude,
        longitude,
        userId,
        timestamp: istTimestamp,
        battery,
        networkStatus,
        uniqueId,
      });

      if (userId && uniqueId) {
        // Mark user as active
        activeUsers.set(userId, {
          uniqueId,
          lastActive: istTimestamp,
          isActive: true,
        });

        await Location.create({
          latitude,
          longitude,
          userId,
          timestamp: istTimestamp,
          battery,
          uniqueId,
        });
      }
    } catch (error) {
      console.error("Error saving location:", error);
    }
  });

  // New event to set user as inactive
  client.on("set_user_inactive", async (data) => {
    const { userId } = data;

    try {
      if (userId && activeUsers.has(userId)) {
        const userData = activeUsers.get(userId);
        userData.isActive = false;
        userData.lastActive = moment().tz("Asia/Kolkata").toDate();
        activeUsers.set(userId, userData);

        io.emit("user_status_update", {
          userId,
          isActive: false,
          lastActive: userData.lastActive,
        });

        console.log(`User ${userId} marked as inactive`);
      }
    } catch (error) {
      console.error("Error setting user inactive:", error);
    }
  });

  // Handle client disconnection
  client.on("disconnect", () => {
    console.log("Client disconnected!");
  });
});

// API Routes

// Get last location for a user
app.get("/api/location/last/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const lastLocation = await Location.findOne({
      userId: mongoose.Types.ObjectId.isValid(userId) ? userId : null,
    })
      .sort({ timestamp: -1 })
      .limit(1);

    if (!lastLocation) {
      return res
        .status(404)
        .json({ message: "No location data found for this user" });
    }

    // Format the timestamp in IST for response
    const formattedLocation = {
      ...lastLocation.toObject(),
      timestamp: moment(lastLocation.timestamp)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD HH:mm:ss"),
      formattedTime: moment(lastLocation.timestamp)
        .tz("Asia/Kolkata")
        .format("DD MMM YYYY, h:mm A"),
    };

    return res.json({
      success: true,
      data: formattedLocation,
      userStatus: activeUsers.has(userId)
        ? activeUsers.get(userId)
        : { isActive: false },
    });
  } catch (error) {
    console.error("Error fetching last location:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching location data",
      error: error.message,
    });
  }
});

// Get location history for a user by date range
app.get("/api/location/history", async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const query = { userId };

    // Add date filtering if provided
    if (startDate || endDate) {
      query.timestamp = {};

      if (startDate) {
        // Convert to IST for querying
        query.timestamp.$gte = moment
          .tz(startDate, "Asia/Kolkata")
          .startOf("day")
          .toDate();
      }

      if (endDate) {
        // Convert to IST for querying
        query.timestamp.$lte = moment
          .tz(endDate, "Asia/Kolkata")
          .endOf("day")
          .toDate();
      }
    }

    const locationHistory = await Location.find(query).sort({ timestamp: 1 });

    // Format timestamps in the response
    const formattedHistory = locationHistory.map((location) => {
      const locationObj = location.toObject();
      return {
        ...locationObj,
        timestamp: moment(location.timestamp)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DD HH:mm:ss"),
        formattedTime: moment(location.timestamp)
          .tz("Asia/Kolkata")
          .format("DD MMM YYYY, h:mm:ss A"),
      };
    });

    return res.json({
      success: true,
      count: formattedHistory.length,
      data: formattedHistory,
    });
  } catch (error) {
    console.error("Error fetching location history:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching location history",
      error: error.message,
    });
  }
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
