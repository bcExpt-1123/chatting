// utils
import makeValidation from '@withvoid/make-validation';
import mongoose from 'mongoose';
// models
import UserModel, { Payment_status } from '../models/User.js';
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
function generateAccessToken(username) {
    return jwt.sign(username, process.env.USER_VERIFICATION_TOKEN_SECRET);
}
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
                    userName: { type: types.string },
                    password: { type: types.string },
                    email: { type: types.string },
                }
            }));
            if (!validation.success) return res.status(400).json({ ...validation });
            const { userName, password, email } = req.body;
            const user = await UserModel.findOne({ Email: email });
            if (user) return res.status(400).json({ msg: "User already exists" })
            const _id = new mongoose.Types.ObjectId;
            const salt = await bcrypt.genSalt(10);
            const cropassword = await bcrypt.hash(password, salt);
            const token = generateAccessToken({ username: req.body.username });
            const result = await UserModel.createUser(_id, userName, cropassword, email, token);
            return res.status(200).json({ success: true, result, token });
        } catch (error) {
            return res.status(500).json({ success: false, error: error })
        }
    },
    login: async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).send({
                message: "Something missing"
            });
        }
        try {
            const user = await UserModel.findOne({ Email: email }).exec();
            if (!user) {
                return res.status(404).send({
                    message: "User does not exists"
                });
            } else {
                const validPassword = await bcrypt.compare(req.body.password, user.Password);
                if (validPassword) {
                    res.status(200).json({ message: "Valid password", user });
                } else {
                    res.status(400).json({ error: "Invalid Password" });
                }
            }
        } catch (error) {
            return res.status(500).send(error);
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
    onDeleteuserAll: async (req, res) => {
        try {
            const user = await UserModel.deleteByUsers();
            return res.status(200).json({
                success: true,
                data: user,
                message: `Deleted all Users.`
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: error })
        }
    }
}