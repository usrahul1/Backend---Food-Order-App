const express = require("express");
const app = express();
const connectDb = require("../connection/post-gre");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/generateToken");
const { cloudinary } = require("../connection/cloudinary");

const signup = async (req, res) => {
	const { fullName, email, password, address, mobileNumber } = req.body;
	const { profilePic } = req.body;
	let client;
	try {
		client = await connectDb();
		if (
			!fullName ||
			!email ||
			!password ||
			!address ||
			!mobileNumber ||
			!profilePic
		) {
			return res.status(400).json({ message: "All fields are required" });
		}

		if (password.length < 6) {
			return res
				.status(400)
				.json({ message: "Password must be at least 6 characters" });
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return res
				.status(400)
				.json({ status: "error", message: "Invalid email format" });
		}

		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		const uploadResponse = await cloudinary.uploader.upload(profilePic);

		const result = await client.query(
			`
			INSERT INTO public.users (name, email, password, contact, address, picUrl)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (email) DO NOTHING
			RETURNING *;
			`,
			[
				fullName,
				email,
				hashedPassword,
				mobileNumber,
				address,
				uploadResponse.secure_url,
			]
		);

		if (result.rows.length === 0) {
			return res
				.status(400)
				.json({ status: "error", message: "Email already exists" });
		}

		res.status(201).json({ message: "User created successfully" });
	} catch (error) {
		console.log("Error in signup controller", error.message);
		res.status(500).json({ message: "Internal Server Error" });
	} finally {
		if (client) client.release();
	}
};

const login = async (req, res) => {
	const { email, password } = req.body;
	let client;

	try {
		client = await connectDb();
		const result = await client.query(
			`
			SELECT * FROM public.users WHERE email = $1;
			`,
			[email]
		);

		if (result.rows.length <= 0) {
			return res.status(400).json({ message: "Invalid credentials" });
		}

		const user = result.rows[0];
		const passHash = user.password;

		const isPassCorrect = await bcrypt.compare(password, passHash);
		if (!isPassCorrect) {
			return res.status(400).json({ message: "Invalid credentials" });
		}

		const cookie = generateToken(user.email);
		res.cookie("token", cookie, {
			httpOnly: true,
			maxAge: 3600000,
		});

		res.status(200).json({ message: "Login Successfull!" });
	} catch (error) {
		console.log("Error in login controller", error.message);
		res.status(500).json({ message: "Internal Server Error" });
	} finally {
		if (client) client.release();
	}
};

const logout = (req, res) => {
	try {
		res.cookie("token", "", { maxAge: 0 });
		res.status(200).json({ message: "Logged out successfully" });
	} catch (error) {
		console.log("Error in logout controller", error.message);
		res.status(500).json({ message: "Internal Server Error" });
	}
};

module.exports = { signup, login, logout };
