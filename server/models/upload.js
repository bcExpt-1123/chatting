import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";


const UploadSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: () => uuidv4().replace(/\-/g, ""),
        },
        file_name: String,
        type: String,
        user_id: Number
    },
    {
        timestamps: true,
        collection: "companymembers",
    }
);

UploadSchema.statics.oncreatesave = async function (file_name, type, user_id) {
    try {
        const post = await this.create({
            file_name,
            type,
            user_id,
        });
        const aggregate = await this.aggregate([
            // get post where _id = post._id
            { $match: { _id: post._id } },
            // do a join on another table called users, and 
            // get me a user whose _id = postedByUser
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user_id',
                }
            },
            { $unwind: '$user_id' },
        ]);
        return post;
    } catch (error) {

    }
}
export default mongoose.model("Uploads", UploadSchema);
