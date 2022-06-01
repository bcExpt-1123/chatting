import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import dotenv from "dotenv"
dotenv.config();
export const Payment_status = {
    PAYMENTUSER: "paymentuser",
    NONPAYMENTUSER: "nonpaymentuser",
    ADMINISTRATOR: "Administrator"
};

const userSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: () => uuidv4().replace(/\-/g, ""),
        },
        UserName: String,
        Password: String,
        Email: { type: String, unique: true },
        PhoneNumber: String,
        LastsubscriptionDate: Date,
        PaymentStatus: String,
        Company_code: String,
        Profile_image: String,
        User_code: String,
        verified: {
            type: Boolean,
            required: true,
            default: false
        }
    },
    {
        timestamps: true,
        collection: "users",
    }
);

/**
 * @param {String} UserName
 * @param {String} Password
 * @param {String} Email
 * @param {String} PhoneNumber
 * @param {Date} LastsubscriptionDate
 * @param {String} Company_code
 * @param {String} Profile_image
 * @param {String} User_code
 * @param {String} PaymentStatus
 * @returns {Object} new user object created
 */
userSchema.statics.createUser = async function (_id, UserName, Password, Email, PhoneNumber, LastsubscriptionDate, Company_code, Profile_image, User_code, PaymentStatus) {
    try {
        const user = await this.create({ _id, UserName, Password, Email, PhoneNumber, LastsubscriptionDate, Company_code, Profile_image, User_code, PaymentStatus });
        return user;
    } catch (error) {
        throw error;
    }
}

/**
 * @param {String} id, user id
 * @return {Object} User profile object
 */
userSchema.statics.getUserById = async function (id) {
    try {
        const user = await this.findOne({ _id: id });
        if (!user) throw ({ error: 'No user with this id found' });
        return user;
    } catch (error) {
        throw error;
    }
}

/**
 * @return {Array} List of all users
 */
userSchema.statics.getUsers = async function () {
    try {
        const users = await this.find();
        return users;
    } catch (error) {
        throw error;
    }
}

/**
 * @param {Array} ids, string of user ids
 * @return {Array of Objects} users list
 */
userSchema.statics.getUserByIds = async function (ids) {
    try {
        const users = await this.find({ _id: { $in: ids } });
        return users;
    } catch (error) {
        throw error;
    }
}

/**
 * @param {String} id - id of user
 * @return {Object} - details of action performed
 */
userSchema.statics.deleteByUserById = async function (id) {
    try {
        const result = await this.remove({ _id: id });
        return result;
    } catch (error) {
        throw error;
    }
}

userSchema.methods.generateVerificationToken = async function () {
    const user = this;
    const verificationToken = jwt.sign(
        { ID: user._id },
        process.env.USER_VERIFICATION_TOKEN_SECRET,
        { expiresIn: "7d" }
    );
    return verificationToken;
};
export default mongoose.model("User", userSchema);
