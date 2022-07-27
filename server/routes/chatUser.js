import express from 'express';
// controllers
import chatRoom from '../controllers/chatRoom.js';
import ChatMessage from '../models/ChatMessage.js';

const router = express.Router();

router
    .post('/', chatRoom.getallchatusers)
    .post('/getconvation', chatRoom.getUserConversation)
    .post('/upload', chatRoom.uploadfiles)
    .post('/reply', chatRoom.replaymessage)
    .post('/emoticon', chatRoom.emoticons)
    .get('/emoticon', chatRoom.getemoticons)
    .post('/message', chatRoom.newpostMessage)
    .get('/unread', chatRoom.unreadmessageusers)
    .get('/read', chatRoom.readmessageusers)
export default router;