const express = require("express");
const { Pool } = require("pg");
const app = express();

const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;

const pool = new Pool({
	host: PGHOST,
	database: PGDATABASE,
	user: PGUSER,
	password: PGPASSWORD,
	port: 5432,
	ssl: {
		require: true,
	},
});

const connectDb = async () => {
	try {
		const client = await pool.connect();
		console.log("Connected to the database successfully!");
		return client;
	} catch (error) {
		console.error("Error connecting to the database:", error);
	}
};

async function createTables(client) {
	try {
		// Products
		await client.query(`
            CREATE TABLE IF NOT EXISTS public.products (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                price NUMERIC(10, 2) NOT NULL,
				picUrl TEXT NOT NULL
        );
    `);

		// Users
		await client.query(`
            CREATE TABLE IF NOT EXISTS public.users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
				email TEXT NOT NULL UNIQUE,
				password TEXT NOT NULL,
                mobileNumber TEXT NOT NULL,
                address TEXT NOT NULL,
				picUrl TEXT NOT NULL
        );
    `);

		// Orders table with items (JSON) and linked to user
		await client.query(`
            CREATE TABLE IF NOT EXISTS public.orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                items JSONB NOT NULL, -- Array of product_id & quantity objects
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

		console.log("✅ Tables created or already exist!");
	} catch (error) {
		console.error("Error creating tables:", error);
	}
}

async function insertSampleData(client) {
	try {
		await client.query(`
			INSERT INTO public.products (name, price)
			VALUES
				('Apple', 1.99),
				('Carrot', 2.50),
				('Banana', 1.20)
			ON CONFLICT (name) DO NOTHING;
		`);

		await client.query(`
			INSERT INTO public.users (name, contact, address)
			VALUES
				('John Doe', '1234567890', '123 Elm Street'),
				('Jane Smith', '0987654321', '456 Oak Avenue')
			ON CONFLICT (name) DO NOTHING;
		`);

		// Get user IDs for orders
		const res1 = await client.query(
			`SELECT id FROM public.users WHERE name = 'John Doe'`
		);
		const res2 = await client.query(
			`SELECT id FROM public.users WHERE name = 'Jane Smith'`
		);
		const johnId = res1.rows[0]?.id;
		const janeId = res2.rows[0]?.id;

		if (johnId && janeId) {
			await client.query(
				`
				INSERT INTO public.orders (user_id, items, status)
				VALUES
					($1, $2, 'pending'),
					($3, $4, 'shipped')
				ON CONFLICT (id) DO NOTHING;
			`,
				[
					johnId,
					JSON.stringify([
						{ product_id: 1, quantity: 2 },
						{ product_id: 2, quantity: 1 },
					]),
					janeId,
					JSON.stringify([
						{ product_id: 2, quantity: 3 },
						{ product_id: 3, quantity: 1 },
					]),
				]
			);
		}

		console.log("✅ Sample data inserted successfully!");
	} catch (error) {
		console.error("Error inserting sample data:", error);
	}
}

async function initialize() {
	const client = await connectDb();

	await createTables(client);
	await insertSampleData(client);

	// await client.query(`DROP TABLE products`);
	// await client.query(`DROP TABLE orders`);
	// await client.query(`DROP TABLE users`);

	client.release();
}

module.exports = { connectDb, pool, initialize };
