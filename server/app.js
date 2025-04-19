const express = require("express");
require("dotenv").config();
const cors = require("cors");
const { Pool } = require("pg");
const app = express();
const productRouter = require("./routes/productRouter");
const { initialize } = require("./connection/post-gre");
const orderRouter = require("./routes/orderRouter");
const cookieParser = require("cookie-parser");

app.use(cors());
app.use(express.json());
app.use(cookieParser());
initialize();

app.use("/api/product", productRouter);
app.use("/api/orders", orderRouter);

app.listen(3000, () => console.log("hi there"));
