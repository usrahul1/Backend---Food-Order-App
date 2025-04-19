const express = require("express");
const router = express.Router();
const { connectDb } = require("../connection/post-gre");
const { protectRoute } = require("../middlewares/routerController");

//get all orders - admin
router.get("/", protectRoute, async (req, res) => {
	const client = await connectDb();
	try {
		const result = await client.query("SELECT * FROM products");
		res.status(200).json(result.rows);
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: "Failed to get all orders." });
	} finally {
		client.release();
	}
});

//update order by id - admin
router.put("/:id", protectRoute, async (req, res) => {
	const { id } = req.params;
	const { status } = req.body;
	const client = await connectDb();

	try {
		const result = await client.query(
			"UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
			[status, id]
		);

		if (result.rowCount === 0) {
			return res.status(404).json({ message: "Order not found" });
		}

		res
			.status(200)
			.json({ message: "Order status updated", order: result.rows[0] });
	} catch (error) {
		console.error("Error updating order:", error);
		res.status(500).json({ error: "Failed to update order" });
	}
});

//get order by id - user
router.get("/:id", protectRoute, async (req, res) => {
	const { id } = req.params;
	const client = await connectDb();

	try {
		const result = await client.query("SELECT * FROM orders WHERE id = $1", [
			id,
		]);

		if (result.rowCount === 0) {
			return res.status(404).json({ message: "Order not found" });
		}

		res.status(200).json(result.rows[0]);
	} catch (error) {
		console.error("Error fetching order:", error);
		res.status(500).json({ error: "Failed to fetch order" });
	}
});

//add new order - buyer only
router.post("/", protectRoute, async (req, res) => {
	const { buyer_name, buyer_contact, delivery_address, items } = req.body;
	const client = await connectDb();

	try {
		const result = await client.query(
			`INSERT INTO orders (buyer_name, buyer_contact, delivery_address, items)
         VALUES ($1, $2, $3, $4) RETURNING *`,
			[buyer_name, buyer_contact, delivery_address, JSON.stringify(items)]
		);

		res
			.status(201)
			.json({ message: "Order placed successfully", order: result.rows[0] });
	} catch (error) {
		console.error("Error placing order:", error);
		res.status(500).json({ error: "Failed to place order" });
	}
});

module.exports = router;
