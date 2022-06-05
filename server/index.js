import http from "http";
import express from "express";
import logger from "morgan";
import cors from "cors";
// routes
import indexRouter from "./routes/index.js";
import userRouter from "./routes/user.js";
import chatRoomRouter from "./routes/chatRoom.js";
import chatUserRouter from "./routes/chatUser.js";
import deleteRouter from "./routes/delete.js";
import passwordResetRouter from "./routes/passwordReset.js";
import { Server } from "socket.io";
// middlewares
import { decode } from './middlewares/jwt.js'
import "./config/mongo.js";
import WebSockets from "./utils/WebSockets.js";

const app = express();

/** Get port from environment and store in Express. */
const port = process.env.PORT || "5000";
app.set("port", port);

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/", indexRouter);
app.use("/passwordreset", passwordResetRouter);
app.use("/users", userRouter);
app.use("/room", decode, chatRoomRouter);
app.use("/delete", deleteRouter);
app.use("/chat", decode, chatUserRouter);
/** catch 404 and forward to error handler */
app.use('*', (req, res) => {
    return res.status(404).json({
        success: false,
        message: 'API endpoint doesnt exist'
    })
});

/** Create HTTP server. */
const server = http.createServer(app);
const io = new Server(server);
global.io = io;
io.on('connection', WebSockets.connection)

/** Listen on provided port, on all network interfaces. */
server.listen(port);
/** Event listener for HTTP server "listening" event. */
server.on("listening", () => {
    console.log(`Listening on port:: http://localhost:${port}/`)
});