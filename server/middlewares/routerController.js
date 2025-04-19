const jwt = require("jsonwebtoken");
const connectDb = require("../connection/post-gre");

const protectRoute = async (req, res, next) => {
	let client;
	try {
		const token = req.cookies.token;
		if (!token) {
			return res
				.status(401)
				.json({ message: "Unauthorized - No Token Provided" });
		}
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		if (!decoded) {
			return res.status(401).json({ message: "Unauthorized - Invalid Token" });
		}

		client = await connectDb();
		let result = await client.query(
			`
			SELECT * FROM public.users WHERE email = $1;
			`,
			[decoded.email]
		);

		if (result.rows.length === 0) {
			return res.status(404).json({ message: "User not found" });
		}

		next();
	} catch (error) {
		console.log("Error in protectRoute middleware: ", error.message);
		res.status(500).json({ message: "Internal server error" });
	} finally {
		if (client) client.release();
	}
};

module.exports = { protectRoute };
