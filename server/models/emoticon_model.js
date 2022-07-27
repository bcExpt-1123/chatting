import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const Schema = mongoose.Schema;

const EmoticonModel = new Schema({
    _id: {
        type: String,
        default: () => uuidv4().replace(/\-/g, ""),
    },
    userId: {
        type: String,
        ref: 'User',
        index: true,
        required: true
    },
    messageId: {
        type: String,
        ref: 'ChatMessage',
        index: true,
        required: true
    },
    icon: {
        type: String,
        required: true
    },
});
EmoticonModel.statics.oncreatesave = async function (userId, messageId, icon) {
    try {
        const post = await this.create({
            userId,
            messageId,
            icon,
        });
        const aggregate = await this.aggregate([
            // get post where _id = post._id
            { $match: { _id: post._id } },
            // do a join on another table called users, and 
            // get me a user whose _id = postedByUser
            {
                $lookup: {
                    from: 'ChatMessage',
                    localField: 'messageId',
                    foreignField: '_id',
                    as: 'messageId',
                }
            },
            { $unwind: '$messageId' },
        ]);
        return post;
    } catch (error) {
        console.log(error);
        throw error;
    }
}
export default mongoose.model("emoticon", EmoticonModel);
