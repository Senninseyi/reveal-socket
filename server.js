const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mysql = require("mysql2/promise");
const cors = require("cors");
const Redis = require("ioredis");
const OneSignal = require("@onesignal/node-onesignal");
const config = require("./config");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "video/mp4",
      "application/pdf",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only jpg, png, mp4, and pdf files are allowed."
        )
      );
    }
  },
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  ...config.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.on("connection", (connection) => {
  console.log("[MySQL] New connection created");
});

pool.on("acquire", (connection) => {
  console.log("[MySQL] Connection acquired from pool");
});

pool.on("release", (connection) => {
  console.log("[MySQL] Connection released back to pool");
});

pool.on("error", (err) => {
  console.error("[MySQL] Pool error:", err);
});

const redis = new Redis({
  ...config.redis,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`[Redis] Retrying connection in ${delay}ms...`);
    return delay;
  },
});

redis.on("connect", () => {
  console.log("[Redis] Connected to Redis server");
});

redis.on("ready", () => {
  console.log("[Redis] Client ready to use");
});

redis.on("error", (err) => {
  console.error("[Redis] Error:", err);
});

redis.on("close", () => {
  console.log("[Redis] Connection closed");
});

redis.on("reconnecting", () => {
  console.log("[Redis] Reconnecting...");
});

const ONLINE_USERS_KEY = "online_users";
const USER_SOCKET_KEY = "user_socket:";
const USER_DEVICE_KEY = "user_device:";
const USER_TOKEN_KEY = "user_token:";

const configuration = OneSignal.createConfiguration({
  organizationApiKey: config.onesignal.organisationKey,
  restApiKey: config.onesignal.restApiKey,
});

const client = new OneSignal.DefaultApi(configuration);

(async () => {
  try {
    const onesignalapp = await client.getApp(config.onesignal.appId);
    console.log(onesignalapp, "ONESIGNAL APP DETAILS");
  } catch (error) {
    console.error("Error retrieving OneSignal app details:", error);
  }
})();

const authenticateSocket = async (socket, next) => {
  try {
    const userId = socket.handshake.headers.userid;

    if (!userId) {
      return next(new Error("Authentication required"));
    }

    const [rows] = await pool.execute(
      "SELECT u.* FROM prod_reveal_app.users u WHERE u.id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return next(new Error("Invalid user ID or token"));
    }

    socket.userId = userId;
    next();
  } catch (error) {
    console.error("[Auth] Error authenticating socket:", error);
    next(new Error("Authentication failed"));
  }
};

io.use(authenticateSocket);

const verifyUserAuthorization = async (socket, userId) => {
  return true;
};

async function sendPushNotificationAdjusted(userId, title, message, data = {}) {
  try {
    console.log(
      `[OneSignal] Attempting to send notification to user ${userId}`
    );
    const deviceToken = await redis.get(`${USER_DEVICE_KEY}${userId}`);
    console.log(deviceToken, "USER DEVICE TOKEN FOR:", userId);

    if (deviceToken) {
      console.log(`[OneSignal] Found device token for user ${userId}`);

      const notification = new OneSignal.Notification();
      notification.app_id = config.onesignal.appId;
      notification.name = `notification_${Date.now()}`;
      notification.contents = {
        en: message,
      };
      notification.headings = {
        en: title,
      };
      notification.data = data;

      if (deviceToken) {
        notification.include_subscription_ids = [deviceToken];
      } else if (deviceToken) {
        notification.include_subscription_ids = [deviceToken];
      } else {
        notification.included_segments = ["Test Users"];
      }

      const response = await client.createNotification(notification);
      console.log(`[OneSignal] Notification sent successfully:`, response);
    } else {
      console.log(`[OneSignal] No device token found for user ${userId}`);
    }
  } catch (error) {
    console.error("[OneSignal] Error sending push notification:", error);
  }
}

io.on("connection", async (socket) => {
  console.log(
    `[Socket.IO] New client connected - Socket ID: ${socket.id}, User ID: ${socket.userId}`
  );

  socket.on("register_device", async (data) => {
    try {
      const { deviceToken } = data;
      await verifyUserAuthorization(socket, socket.userId);

      console.log(`[Socket.IO] Registering device for user ${socket.userId}`);

      await redis.set(`${USER_DEVICE_KEY}${socket.userId}`, deviceToken);
      console.log(
        `[Socket.IO] Device registered successfully for user ${socket.userId}`
      );
    } catch (error) {
      console.error("[Socket.IO] Error registering device:", error);
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("user_connected", async () => {
    try {
      await verifyUserAuthorization(socket, socket.userId);

      console.log(`[Socket.IO] User ${socket.userId} attempting to connect`);
      await redis.set(`${USER_SOCKET_KEY}${socket.userId}`, socket.id);
      await redis.sadd(ONLINE_USERS_KEY, socket.userId);

      socket.broadcast.emit("user_status_change", {
        userId: socket.userId,
        status: "online",
      });

      console.log(
        `[Socket.IO] User ${socket.userId} connected successfully - Socket ID: ${socket.id}`
      );
    } catch (error) {
      console.error("[Socket.IO] Error handling user connection:", error);
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("send_message", async (data) => {
    try {
      console.log("Raw data received:", data);
      console.log("Socket ID:", socket.id);
      console.log("User ID:", socket.userId);

      let messageData;
      if (typeof data === "string") {
        try {
          messageData = JSON.parse(data);
        } catch (e) {
          console.error("Error parsing message data:", e);
          throw new Error("Invalid message format");
        }
      } else {
        messageData = data;
      }

      console.log("Parsed message data:", messageData);

      const { recipientId, message, attachment, replyToMessageId } =
        messageData;

      if (!recipientId) {
        throw new Error("Recipient ID is required");
      }

      const numericRecipientId = parseInt(recipientId, 10);
      if (isNaN(numericRecipientId)) {
        throw new Error("Invalid recipient ID format");
      }

      await verifyUserAuthorization(socket, socket.userId);

      if (attachment) {
        const [user] = await pool.execute(
          "SELECT created_at FROM users WHERE id = ?",
          [socket.userId]
        );

        if (!user || user.length === 0) {
          throw new Error("User not found");
        }

        const accountAge = Math.floor(
          (Date.now() - new Date(user[0].created_at).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (accountAge < 10) {
          throw new Error(
            "Account must be at least 10 days old to send attachments"
          );
        }
      }

      const [parentMessage] = await pool.execute(
        `SELECT parent_message_id FROM messages 
         WHERE (sender_id = ? AND receiver_id = ?) 
         OR (sender_id = ? AND receiver_id = ?)
         ORDER BY created_at DESC LIMIT 1`,
        [socket.userId, numericRecipientId, numericRecipientId, socket.userId]
      );

      let parentMessageId = null;
      if (parentMessage && parentMessage.length > 0) {
        parentMessageId = parentMessage[0].parent_message_id;
      }

      const [result] = await pool.execute(
        `INSERT INTO messages (
          sender_id, 
          receiver_id, 
          message, 
          parent_message_id,
          reply_to_message_id,
          attachment_path,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          socket.userId,
          numericRecipientId,
          message || null,
          parentMessageId,
          replyToMessageId || null,
          attachment ? JSON.stringify(attachment) : null,
        ]
      );

      if (!parentMessageId) {
        await pool.execute(
          "UPDATE messages SET parent_message_id = ?, updated_at = NOW() WHERE id = ?",
          [result.insertId, result.insertId]
        );
        parentMessageId = result.insertId;
      }

      const [sender] = await pool.execute(
        "SELECT alias FROM users WHERE id = ?",
        [socket.userId]
      );

      if (!sender || sender.length === 0) {
        throw new Error("Sender not found");
      }

      const [messageDetails] = await pool.execute(
        "SELECT created_at FROM messages WHERE id = ?",
        [result.insertId]
      );

      const responseData = {
        id: result.insertId,
        senderId: socket.userId,
        receiverId: numericRecipientId,
        senderName: sender[0].alias,
        content: message,
        attachment: attachment,
        parentMessageId: parentMessageId,
        replyToMessageId: replyToMessageId,
        isRead: false,
        createdAt: messageDetails[0].created_at,
        updatedAt: messageDetails[0].created_at,
      };

      console.log("Response data prepared:", responseData);

      const recipientSocketId = await redis.get(
        `${USER_SOCKET_KEY}${numericRecipientId}`
      );

      socket.emit("message_sent", responseData);

      // Send to recipient if they're online
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("receive_message", responseData);

        await sendPushNotificationAdjusted(
          numericRecipientId,
          `New message from ${sender[0].alias}`,
          message || "Sent an attachment",
          { messageId: result.insertId }
        );
      } else {
        // Send push notification if recipient is offline
        await sendPushNotificationAdjusted(
          numericRecipientId,
          `New message from ${sender[0].alias}`,
          message || "Sent an attachment",
          { messageId: result.insertId }
        );
      }
    } catch (error) {
      console.error("[Socket.IO] Error sending message:", error);
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("connect", () => {
    console.log("New socket connected:", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

server.listen(config.port, () => {
  console.log(`[Server] Running on port ${config.port}`);
  console.log(
    `[Server] MySQL connected to ${config.database.host}:${config.database.port}`
  );
  console.log(
    `[Server] Redis connected to ${config.redis.host}:${config.redis.port}`
  );
});
