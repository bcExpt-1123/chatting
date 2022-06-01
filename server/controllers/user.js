// utils
import makeValidation from '@withvoid/make-validation';
import mongoose from 'mongoose';
// models
import UserModel, { Payment_status } from '../models/User.js';
import nodemailer from 'nodemailer';
import jwt from "jsonwebtoken";

const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
    },
});
export default {
    onGetAllUsers: async (req, res) => {
        try {
            const users = await UserModel.getUsers();
            return res.status(200).json({ success: true, users });
        } catch (error) {
            return res.status(500).json({ success: false, error: error })
        }
    },
    onGetUserById: async (req, res) => {
        try {
            const user = await UserModel.getUserById(req.params.id);
            return res.status(200).json({ success: true, user });
        } catch (error) {
            return res.status(500).json({ success: false, error: error })
        }
    },
    onCreateUser: async (req, res) => {
        try {
            const validation = makeValidation(types => ({
                payload: req.body,
                checks: {
                    UserName: { type: types.string },
                    Password: { type: types.string },
                    Email: { type: types.string },
                    PhoneNumber: { type: types.string },
                    type: { type: types.enum, options: { enum: Payment_status } },
                }
            }));
            if (!validation.success) return res.status(400).json({ ...validation });

            const { UserName, Password, Email, PhoneNumber, type } = req.body;
            const _id = new mongoose.Types.ObjectId;
            const user = await UserModel.createUser(_id, UserName, Password, Email, PhoneNumber, type);

            const verificationToken = await UserModel.generateVerificationToken();
            const url = `http://localhost:5000/verify/${verificationToken}`

            transporter.sendMail({
                to: Email,
                subject: 'Verify Account',
                html: `Click <a href = '${url}'>here</a> to confirm your email.`
            })
            // return res.status(200).json({ success: true, user });
            return res.status(201).send({
                message: `Sent a verification email to ${email}`
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: error })
        }
    },
    onDeleteUserById: async (req, res) => {
        try {
            const user = await UserModel.deleteByUserById(req.params.id);
            return res.status(200).json({
                success: true,
                message: `Deleted a count of ${user.deletedCount} user.`
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: error })
        }
    },
    login: async (req, res) => {
        const { Email } = req.body;
        if (!Email) {
            return res.status(422).send({
                message: "Missing email."
            });
        }
        try {
            const user = await UserModel.findOne({ email }).exec();
            if (!user) {
                return res.status(404).send({
                    message: "User does not exists"
                });
            }
            if (!user.verified) {
                return res.status(403).send({
                    message: "Verify your Account."
                });
            }
            return res.status(200).send({
                message: "User logged in"
            });
        } catch (error) {
            return res.status(500).send(err);
        }
    },
    verify: async (req, res) => {
        const { token } = req.params
        if (!token) {
            return res.status(422).send({
                message: "Missing Token"
            });
        }
        let payload = null;
        try {
            payload = jwt.verify(
                token,
                process.env.USER_VERIFICATION_TOKEN_SECRET
            );
        } catch (err) {
            return res.status(500).send(err);
        }

        try {
            const user = await UserModel.findOne({ _id: payload.ID }).exec();
            if (!user) {
                return res.status(404).send({
                    message: "User does not  exists"
                });
            }
            user.verified = true;
            await user.save();
            return res.status(200).send({
                message: "Account Verified"
            });
        } catch (error) {
            return res.status(500).send(err);
        }
    }
}