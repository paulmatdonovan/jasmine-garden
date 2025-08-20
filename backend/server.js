require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 5000;

//Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend"))); // Serve static files from frontend
app.use("/css", express.static(path.join(__dirname, "../frontend/css")));
// app.use("/css", express.static(path.join(__dirname, "../frontend/menu.html")));

app.use("/js", express.static(path.join(__dirname, "../frontend/js")));

//Menu items data
const menuItems = [
    { id: 1, name: "Pad Kra Pow", price: 20 },
    { id: 2, name: "Fried Rice", price: 18 },
    { id: 3, name: "Fried Mixed Vegetables", price: 18 },
    { id: 4, name: "Pad Thai Chicken", price: 20 },
];

//Routes
app.get("/api/menu", (req, res) => {
    console.log(menuItems);
    res.json(menuItems);
});

//page routes

app.get(["/", "/home"], (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.get("/menu", (req, res) => {
    try {
        const filePath = path.normalize(
            path.join(__dirname, "../frontend/menu.html")
        );
        console.log("File path:", filePath); // Debug

        if (!fs.existsSync(filePath)) {
            throw new Error("File not found");
        }

        res.redirect("/menu.html");
    } catch (err) {
        console.error("Route error:", err);
        res.status(500).send(`
            <h1>Page Load Error</h1>
            <p>${err.message}</p>
            <p>Current dir: ${__dirname}</p>
        `);
    }
});

app.post("/api/orders", (req, res) => {
    const order = req.body;
    const filePath = path.join(__dirname, "orders.json");
    fs.readFile(filePath, "utf8", (err, data) => {
        let orders = [];
        if (!err && data) orders = JSON.parse(data);

        orders.push({ ...order, date: new Date().toISOString() });

        fs.writeFile(filePath, JSON.stringify(orders, null, 2), (err) => {
            if (err)
                return res.status(500).json({ error: "Failed to save order" });
            res.json({ success: true });
        });
    });
});

app.post("/api/create-checkout-session", async (req, res) => {
    try {
        const { items } = req.body;
        // destructuring to get something called items from the original request

        const lineItems = items.map((item) => ({
            price_data: {
                currency: "aud",
                product_data: { name: item.name },
                unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity,
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            success_url: `${process.env.FRONTEND_URL}/success.html`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel.html`,
        });
        res.json({ id: session.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
