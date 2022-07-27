import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";


const ReplySchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: () => uuidv4().replace(/\-/g, ""),
        },
        reply_meesage: String,
        message_text: String,
        message_id: String,
        touserId: String,
        fromuserId: String
    },
    {
        timestamps: true,
        collection: "companymembers",
    }
);

ReplySchema.statics.oncreatesave = async function (reply_meesage, message_text, message_id, touserId, fromuserId) {
    try {
        const post = await this.create({
            reply_meesage,
            message_text,
            message_id,
            touserId,
            fromuserId
        });
        const aggregate = await this.aggregate([
            // get post where _id = post._id
            { $match: { _id: post._id } },
            // do a join on another table called users, and 
            // get me a user whose _id = postedByUser
            {
                $lookup: {
                    from: 'ChatMessage',
                    localField: 'message_id',
                    foreignField: '_id',
                    as: 'message_id',
                }
            },
            { $unwind: '$message_id' },
        ]);
        return post;
    } catch (error) {

    }
}
export default mongoose.model("replymessage", ReplySchema);
