import generateMessage from "./message.js";
import { createRequire } from "module";
import { v2 } from '@google-cloud/translate';
const require = createRequire(import.meta.url); // construct the require method
const googleCloudTranslation = require("../config/chatapp.json")
import Users from "./user.js";
const users_ = Users;
const { Translate } = v2;
const translate = new Translate({
    projectId: 'chatapp-353209',
    credentials: googleCloudTranslation
});
class WebSockets {
    constructor() {
        this.users = [];
    }
    connection(client) {
        // event fired when the chat room is disconnected
        console.log(client)
        console.log('a user connected');

        client.on("disconnect", () => {
            this.users = this.users.filter((user) => user.socketId !== client.id);
        });

        client.on('join', (username, userid, callback) => {

            if (!isRealString(username) || !isRealString(userid)) {
                return callback('Bad request');
            }
            client.join(userid);
            users_.removeUser(client.id);
            users_.addUser(client.id, username, userid);
            global.io.to(userid).emit('updateUserList', users_.getUserList());
            socket.emit('newMessage', generateMessage('Admin', 'Welcome to the chat app.'));
            socket.broadcast.to(userid).emit('newMessage', generateMessage('Admin', `${username} has joined.`));
            callback();
        });

        client.on('createMessage', (message, touseid, callback) => {
            var user = users_.getUser(client.id);
            if (user && isRealString(message.text)) {
                let tempObj = generateMessage(user.username, message.text);
                io.to(touseid).emit('newMessage', tempObj);
                callback({
                    data: tempObj
                });
            }
            callback();
        });

        client.on('leave', (username) => {
            client.leave(username);
        });

        client.on('disconnect', () => {
            var user = users_.removeUser(client.id);

            if (user) {
                io.to(user).emit('updateUserList', users_.getUserList());
                io.to(user).emit('newMessage', generateMessage('Admin', `${user.username} has left.`));
            }
        });

        client.on("translate", async (message, target, callback) => {
            var user = users_.getUser(client.id);
            if (user) {
                const result = await translateText(message, target)
                io.to(user).emit('translate', result);
                callback({
                    result
                });
            }
            callback()
        })

        client.on('call', (data, callback) => {
            let { description, touseid } = data;
            let remoteUserSocket = users_.getUserbyuserid(touseid);
            if (remoteUserSocket) {
                remoteUserSocket.emit("incomingCall", {
                    description,
                    username: remoteUserSocket.username
                });
                callback({
                    remoteUserSocket
                });
            } else {
                console.log("user not connected");
            }
            callback()
        })

        client.on("acceptCall", (data, callback) => {
            let { description, fromid } = data;
            let remoteUserSocket = users_.getUserbyuserid(fromid);
            if (remoteUserSocket) {
                remoteUserSocket.emit("callAnswered", {
                    description,
                    username: remoteUserSocket.username
                });
                callback({
                    remoteUserSocket
                })
            } else {
                console.log("user not connected");
            }
            callback()
        });
    }

    async translateText(text, target) {
        let [translations] = await translate.translate(text, target);
        translations = Array.isArray(translations) ? translations : [translations];
        translations.forEach((translation, i) => {
            console.log(`${text[i]} => (${target}) ${translation}`);
        });
        return translations;
    }
    subscribeOtherUser(room, otherUserId) {
        const userSockets = this.users.filter(
            (user) => user.userId === otherUserId
        );
        userSockets.map((userInfo) => {
            const socketConn = global.io.sockets.connected(userInfo.socketId);
            if (socketConn) {
                socketConn.join(room);
            }
        });
    }
}

export default new WebSockets();