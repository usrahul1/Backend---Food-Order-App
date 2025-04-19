const jwt = require("jsonwebtoken");

const generateToken = async (user) => {
	const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });
};

module.exports = generateToken;
