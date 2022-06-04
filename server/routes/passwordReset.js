import express from 'express';
// controllers
import User from "../models/User.js";
import Token from "../models/token.js";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";
import Joi from 'joi';
import bcrypt from "bcrypt";

const router = express.Router();


router.post("/", async (req, res) => {
    try {
        const schema = Joi.object().keys({
            email: Joi.string().email().required(),
        });
        const { error } = schema.validate(req.body);
        if (error) return res.status(400).send(error.details[0].message);

        const user = await User.findOne({ Email: req.body.email });
        if (!user)
            return res.status(400).send("user with given email doesn't exist");

        let token = await Token.findOne({ userId: user._id });
        if (!token) {
            token = await new Token({
                userId: user._id,
                token: crypto.randomBytes(32).toString("hex"),
            }).save();
        }
        const link = `${process.env.BASE_URL}/passwordreset/${user._id}/${token.token}`;
        await sendEmail(user.Email, "Password reset", link);

        res.send("password reset link sent to your email account");
    } catch (error) {
        res.send("An error occured");
    }
});

router.post("/:userId/:token", async (req, res) => {
    try {
        const schema = Joi.object().keys({ password: Joi.string().required() });
        const { error } = schema.validate(req.body);
        if (error) return res.status(400).send(error.details[0].message);

        const user = await User.findById(req.params.userId);
        if (!user) return res.status(400).send("Invalid link or expired");

        const token = await Token.findOne({
            userId: user._id,
            token: req.params.token,
        });
        if (!token) return res.status(400).send("Invalid link or expired");
        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash(req.body.password, salt);
        user.Password = password;
        await user.save();
        await token.delete();
        return res.status(200).send({
            message: `password reset sucessfully`
        });
    } catch (error) {
        res.send("An error occured");
        console.log(error);
    }
});
export default router;