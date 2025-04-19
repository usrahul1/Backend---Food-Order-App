const express = require("express");
const router = express.Router();
const { connectDb } = require("../connection/post-gre");
const { protectRoute } = require("../middlewares/routerController");
const { cloudinary } = require("../connection/cloudinary");

//get all products
router.get("/", protectRoute, async (req, res) => {
	const client = await connectDb();
	try {
		const result = await client.query("SELECT * FROM products");
		res.status(200).json(result.rows);
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: "Failed to get all products." });
	} finally {
		client.release();
	}
});

//add a product
router.post("/", protectRoute, async (req, res) => {
	const { name, price } = req.body;
	const { prodPic } = req.body;
	const client = await connectDb();

	try {
		const uploadResponse = await cloudinary.uploader.upload(prodPic);
		await client.query(
			`
			INSERT INTO public.products (name, price, picUrl)
			VALUES ($1, $2, $3)
			RETURNING *;  -- This returns the inserted row
      `,
			[name, price, uploadResponse.secure_url]
		);
		res.status(201).json({ message: "Product added successfully!" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to insert product." });
	} finally {
		client.release();
	}
});

//updating a product using put
router.put("/:id", protectRoute, async (req, res) => {
	const { id } = req.params;
	const { name, price } = req.body;

	if (!name || !price) {
		return res.status(400).json({ message: "Name and price are required" });
	}

	const client = await connectDb();

	try {
		const result = await client.query(
			"UPDATE products SET name = $1, price = $2 WHERE id = $3 RETURNING *",
			[name, price, id]
		);

		if (result.rowCount === 0) {
			return res.status(404).json({ message: "Product not found" });
		}

		res
			.status(200)
			.json({ message: "Product updated", product: result.rows[0] });
	} catch (error) {
		console.error("Error updating product:", error);
		res.status(500).json({ error: "Server error" });
	}
});

//deleting a product
router.delete("/:id", protectRoute, async (req, res) => {
	const { id } = req.params;
	const client = await connectDb();

	try {
		const result = await client.query(
			"DELETE FROM products WHERE id = $1 RETURNING *",
			[id]
		);

		if (result.rowCount === 0) {
			return res.status(404).json({ message: "Product not found" });
		}

		res
			.status(200)
			.json({ message: "Product deleted", product: result.rows[0] });
	} catch (error) {
		console.error("Error deleting product:", error);
		res.status(500).json({ error: "Server error" });
	}
});

module.exports = router;
