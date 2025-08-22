const API_BASE = "https://jasmine-garden-nhill.onrender.com";

document.addEventListener("DOMContentLoaded", async () => {
    const stripe = Stripe(
        "pk_test_51RqkZQIbC0QJ3rbtZZhTqbq4iCUQjjW9pg6W9wHe2JdVGs7n4loN1BUmsnOuX65URHx6XkJ7E1Uo5met7FDOl0Iq00Fx1IRu0m"
    ); // Replace with your key

    const menuContainer = document.getElementById("menu-container");
    const orderItemsEl = document.getElementById("order-items");
    const orderTotalEl = document.getElementById("order-total");
    const checkoutBtn = document.getElementById("checkout-btn");

    let order = [];

    // Load menu items
    try {
        const response = await fetch(`${API_BASE}/api/menu`);
        const menuItems = await response.json();

        menuItems.forEach((item) => {
            const itemEl = document.createElement("div");
            itemEl.className = "menu-item";
            itemEl.innerHTML = `
        <h3>${item.name}</h3>
        <p>$${item.price.toFixed(2)}</p>

        <div class="quantity-controls">
          <button class="decrement" data-id="${item.id}">-</button>
          <span class="quantity" data-id="${item.id}">0</span>
          <button class="increment" data-id="${item.id}">+</button>
        </div>
      `;
            menuContainer.appendChild(itemEl);
        });

        // Set up event listeners for quantity buttons
        document.querySelectorAll(".increment").forEach((btn) => {
            btn.addEventListener("click", (e) =>
                updateQuantity(e.target.dataset.id, 1)
            );
        });

        document.querySelectorAll(".decrement").forEach((btn) => {
            btn.addEventListener("click", (e) =>
                updateQuantity(e.target.dataset.id, -1)
            );
        });
    } catch (err) {
        console.error("Failed to load menu:", err);
    }

    // Update quantity and order
    function updateQuantity(itemId, change) {
        const quantityEl = document.querySelector(
            `.quantity[data-id="${itemId}"]`
        );
        let quantity = parseInt(quantityEl.textContent) + change;
        quantity = Math.max(0, quantity);
        quantityEl.textContent = quantity;

        updateOrder(itemId, quantity);
    }

    function updateOrder(itemId, quantity) {
        // Remove if exists
        order = order.filter((item) => item.id !== itemId);

        if (quantity > 0) {
            const menuItem = Array.from(
                menuContainer.querySelectorAll(".menu-item")
            ).find((el) => el.querySelector(`.quantity[data-id="${itemId}"]`));

            const name = menuItem.querySelector("h3").textContent;
            const price = parseFloat(
                menuItem.querySelector("p").textContent.replace("$", "")
            );

            order.push({ id: itemId, name, price, quantity });
        }

        renderOrder();
    }

    function renderOrder() {
        orderItemsEl.innerHTML = "";
        let total = 0;

        order.forEach((item) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;

            const itemEl = document.createElement("div");
            itemEl.className = "order-item";
            itemEl.innerHTML = `
        <span>${item.name} x${item.quantity}</span>
        <span>$${itemTotal.toFixed(2)}</span>
      `;
            orderItemsEl.appendChild(itemEl);
        });

        orderTotalEl.textContent = `Total: $${total.toFixed(2)}`;
        checkoutBtn.disabled = order.length === 0;
    }

    // Checkout handler
    checkoutBtn.addEventListener("click", async () => {
        try {
            // 1. Validate order
            if (order.length === 0) {
                alert("Your cart is empty!");
                return;
            }

            // 2. Create checkout session
            const response = await fetch(
                `${API_BASE}/api/create-checkout-session`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ items: order }),
                }
            );

            // 3. Handle empty response
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Server returned empty response");
            }

            // 4. Process successful response
            const { id } = await response.json();
            const { error } = await stripe.redirectToCheckout({
                sessionId: id,
            });

            if (error) throw error;
        } catch (err) {
            console.error("Checkout failed:", err);
            alert(`Checkout error: ${err.message}`);
        }
    });
});
