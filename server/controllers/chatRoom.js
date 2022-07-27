// utils
import makeValidation from '@withvoid/make-validation';
// models
import ChatRoomModel, { CHAT_ROOM_TYPES } from '../models/ChatRoom.js';
import chatMessageSchema from '../models/ChatMessage.js';
import UploadSchemaModel from '../models/upload.js';
import ReplySchemaModal from '../models/replymessage.js';
import UserModel from '../models/User.js';
import appRoot from 'app-root-path';
import Emoticon from '../models/emoticon_model.js'

export default {
    initiate: async (req, res) => {
        try {
            const validation = makeValidation(types => ({
                payload: req.body,
                checks: {
                    userIds: {
                        type: types.array,
                        options: { unique: true, empty: false, stringOnly: true }
                    },
                    type: { type: types.enum, options: { enum: CHAT_ROOM_TYPES } },
                }
            }));
            if (!validation.success) return res.status(400).json({ ...validation });

            const { userIds, type } = req.body;
            const { userId: chatInitiator } = req;
            const allUserIds = [...userIds, chatInitiator];
            const chatRoom = await ChatRoomModel.initiateChat(allUserIds, type, chatInitiator);
            return res.status(200).json({ success: true, chatRoom });
        } catch (error) {
            return res.status(500).json({ success: false, error: error })
        }
    },
    postMessage: async (req, res) => {
        try {
            const { roomId } = req.params;
            const validation = makeValidation(types => ({
                payload: req.body,
                checks: {
                    messageText: { type: types.string },
                }
            }));
            if (!validation.success) return res.status(400).json({ ...validation });

            const messagePayload = {
                messageText: req.body.messageText,
            };
            const currentLoggedUser = req.userId;
            const post = await chatMessageSchema.createPostInChatRoom(roomId, messagePayload, currentLoggedUser);
            global.io.sockets.in(roomId).emit('new message', { message: post });
            return res.status(200).json({ success: true, post });
        } catch (error) {
            return res.status(500).json({ success: false, error: error })
        }
    },
    getRecentConversation: async (req, res) => {
        try {
            const currentLoggedUser = req.userId;
            const options = {
                page: parseInt(req.query.page) || 0,
                limit: parseInt(req.query.limit) || 10,
            };
            const rooms = await ChatRoomModel.getChatRoomsByUserId(currentLoggedUser);
            const roomIds = rooms.map(room => room._id);
            const recentConversation = await chatMessageSchema.getRecentConversation(
                roomIds, options, currentLoggedUser
            );
            return res.status(200).json({ success: true, conversation: recentConversation });
        } catch (error) {
            return res.status(500).json({ success: false, error: error })
        }
    },
    getConversationByRoomId: async (req, res) => {
        try {
            const { roomId } = req.params;
            const room = await ChatRoomModel.getChatRoomByRoomId(roomId)
            if (!room) {
                return res.status(400).json({
                    success: false,
                    message: 'No room exists for this id',
                })
            }
            const users = await UserModel.getUserByIds(room.userIds);
            const options = {
                page: parseInt(req.query.page) || 0,
                limit: parseInt(req.query.limit) || 10,
            };
            const conversation = await chatMessageSchema.getConversationByRoomId(roomId, options);
            return res.status(200).json({
                success: true,
                conversation,
                users,
            });
        } catch (error) {
            return res.status(500).json({ success: false, error });
        }
    },
    markConversationReadByRoomId: async (req, res) => {
        try {
            const { roomId } = req.params;
            const room = await ChatRoomModel.getChatRoomByRoomId(roomId)
            if (!room) {
                return res.status(400).json({
                    success: false,
                    message: 'No room exists for this id',
                })
            }

            const currentLoggedUser = req.userId;
            const result = await chatMessageSchema.markMessageRead(roomId, currentLoggedUser);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            return res.status(500).json({ success: false, error });
        }
    },
    getallchatusers: async (req, res) => {
        try {
            const { userId } = req.body;
            if (!userId) return res.status(400).json({
                success: false,
                message: 'No User Id',
            })
            const otherusers = await UserModel.find({ _id: { $nin: userId } });
            console.log(otherusers);
            let chatmessages = await chatMessageSchema.find({
                "$or": [{
                    touserId: userId
                }, {
                    fromuserId: userId
                }]
            });
            return res.status(200).json({
                success: true, otherusers,
                chatmessages
            });
        } catch (error) {
            return res.status(500).json({ success: false, error });
        }
    },
    unreadmessageusers: async (req, res) => {
        try {
            const { userId } = req.body;
            const otherusers = await UserModel.find({ _id: { $nin: userId } });
            let chatmessages = await chatMessageSchema.find({
                "$and": [{
                    touserId: userId
                }, {
                    readcheck: false
                }]
            });
            return res.status(200).json({
                success: true,
                otherusers,
                chatmessages
            })
        } catch (error) {
            return res.status(500).json({ success: false, error });
        }
    },
    readmessageusers: async (req, res) => {
        try {
            const { userId } = req.body;
            const otherusers = await UserModel.find({ _id: { $nin: userId } });
            let chatmessages = await chatMessageSchema.find({
                "$and": [{
                    touserId: userId
                }, {
                    readcheck: true
                }]
            });
            return res.status(200).json({
                success: true,
                otherusers,
                chatmessages
            })
        } catch (error) {
            return res.status(500).json({ success: false, error });
        }
    },
    getUserConversation: async (req, res) => {
        try {
            const { fromuserId, touserId } = req.body;
            if (!fromuserId || !touserId) return res.status(400).json({
                success: false,
                message: 'Somthing Missing',
            })
            const options = {
                page: parseInt(req.query.page) || 0,
                limit: parseInt(req.query.limit) || 10,
            };
            await chatMessageSchema.updateMany({ fromuserId: touserId },
                {
                    $set: {
                        readcheck: true
                    }
                }
            )
            const conversation = await chatMessageSchema.getConversationByUserId(fromuserId, touserId);
            global.io.sockets.in(touserId).emit('join', { message: conversation });
            return res.status(200).json({
                success: true,
                conversation,
            });
        } catch (error) {
            return res.status(500).json({
                success: false, error
            })
        }
    },
    newpostMessage: async (req, res) => {
        try {
            const validation = makeValidation(types => ({
                payload: req.body,
                checks: {
                    fromuserId: {
                        type: types.string,
                    },
                    touserId: {
                        type: types.string,
                    },
                    messageText: { type: types.string },
                }
            }));
            if (!validation.success) return res.status(400).json({ ...validation });
            const { fromuserId, touserId, messageText } = req.body;
            const post = await chatMessageSchema.oncreatesave(fromuserId, touserId, messageText);
            global.io.sockets.in(touserId).emit('new message', { message: post });
            return res.status(200).json({ success: true, post });
        } catch (error) {
            return res.status(500).json({
                success: false, error
            })
        }
    },
    uploadfiles: async (req, res) => {
        try {
            if (!req.files) {
                res.send({
                    status: false,
                    message: 'No file uploaded'
                });
            } else {
                //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
                let file = req.files.file;
                //Use the mv() method to place the file in upload directory (i.e. "uploads")
                file.mv(`${appRoot}/uploads/` + file.name);
                //send response
                let { user_id } = req.body;
                const post = await UploadSchemaModel.oncreatesave(file.name, file.mimetype, user_id);
                res.status(200).send({
                    status: true,
                    message: 'File is uploaded',
                    data: post
                });
            }
        } catch (err) {
            res.status(500).send(err);
        }
    },
    replaymessage: async (req, res) => {
        try {
            const { meesage_text, reply_message, touserId, fromuserId } = req.body;
            let chatmessages = await chatMessageSchema.findOne({
                message: meesage_text
            });
            const post = await ReplySchemaModal.oncreatesave(reply_message, meesage_text, chatmessages.id, touserId, fromuserId);
            global.io.sockets.in(touserId).emit('reply message', { message: post });
            res.send({
                success: true,
                data: post
            })
        } catch (error) {
            res.status(500).send(error)
        }
    },
    emoticons: async (req, res) => {
        try {
            const { messageId, icon, userId } = req.body;
            Emoticon.oncreatesave(userId, messageId, icon)
                .then(function (emoticon) {
                    chatMessageSchema.findById(emoticon.messageId)
                        .then(async function (message) {
                            console.log(message);
                            let emoticons = message.emoticons;
                            const emoteObj = { userId: emoticon.userId, icon: emoticon.icon };
                            if (emoticons === undefined) {
                                message.emoticons = [emoteObj];
                            } else {
                                emoticons.push(emoteObj);
                                message.emoticons = emoticons;
                            }
                            console.log(message.emoticons);
                            let emoticons_ = {};
                            emoticons_.userId = emoticons[0].userId;
                            emoticons_.icon = emoticons[0].icon;
                            console.log(emoticons_);
                            let result = await chatMessageSchema.updateOne({ _id: emoticon.messageId }, {
                                emoticons: {
                                    userId: emoticons_.user_id,
                                    icon: emoticons_.icon,
                                }
                            });
                            res.status(200).send({ success: true })
                        }, function (err) {
                            res.status(500).send(err)
                        });
                }, function (err) {
                    res.status(500).send(err)
                });
        } catch (error) {
            res.status(500).send(error)
        }
    },
    getemoticons: async (req, res) => {
        try {
            Emoticon.find({})
                .then(function (emoticons) {
                    res.json(emoticons);
                }, function (err) {
                    next(err);
                });
        } catch (error) {
            res.status(500).send(error)
        }
    }
}