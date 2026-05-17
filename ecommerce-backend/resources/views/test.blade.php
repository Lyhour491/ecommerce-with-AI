<!DOCTYPE html>
<html>
<head>
    <title>Mini E-commerce Test</title>
</head>
<body>

<h1>Mini E-commerce Full API Test</h1>

<hr>

<!-- REGISTER -->
<h2>1. Register</h2>
<input id="reg_name" placeholder="Name"><br>
<input id="reg_email" placeholder="Email"><br>
<input id="reg_password" type="password" placeholder="Password"><br>
<input id="reg_password_confirm" type="password" placeholder="Confirm Password"><br>
<button onclick="register()">Register</button>

<hr>

<!-- LOGIN -->
<h2>2. Login</h2>
<input id="email" placeholder="Email"><br>
<input id="password" type="password" placeholder="Password"><br>
<button onclick="login()">Login</button>

<h3>Token</h3>
<pre id="token"></pre>

<button onclick="getUser()">Check User</button>

<hr>

<!-- CATEGORY -->
<h2>3. Category</h2>
<input id="cat_name" placeholder="Category Name"><br>
<input id="cat_desc" placeholder="Description"><br>
<button onclick="createCategory()">Create</button>
<button onclick="getCategories()">Get</button>

<hr>

<!-- PRODUCT -->
<h2>4. Product (Multiple Images)</h2>
<input id="product_category_id" placeholder="Category ID"><br>
<input id="product_name" placeholder="Product Name"><br>
<input id="product_desc" placeholder="Description"><br>
<input id="product_price" placeholder="Price"><br>
<input id="product_stock" placeholder="Stock"><br>

<input type="file" id="product_images" multiple><br><br>

<button onclick="createProduct()">Create Product</button>
<button onclick="getProducts()">Get Products</button>

<hr>

<!-- CART -->
<h2>5. Cart</h2>
<input id="cart_product_id" placeholder="Product ID"><br>
<input id="cart_quantity" placeholder="Quantity"><br>
<button onclick="addToCart()">Add To Cart</button>
<button onclick="getCart()">View Cart</button>

<br><br>

<input id="update_cart_id" placeholder="Cart ID"><br>
<input id="update_cart_quantity" placeholder="New Quantity"><br>
<button onclick="updateCart()">Update Cart</button>

<br><br>

<input id="delete_cart_id" placeholder="Cart ID"><br>
<button onclick="deleteCart()">Delete Item</button>
<button onclick="clearCart()">Clear Cart</button>

<hr>

<!-- CHECKOUT -->
<h2>6. Checkout</h2>

<input id="shipping_address" placeholder="Shipping Address"><br><br>
<input id="phone" placeholder="Phone"><br><br>

<button onclick="checkout()">Checkout</button>
<button onclick="getOrders()">View Orders</button>

<hr>

<h2>Response</h2>
<pre id="response"></pre>

<script>
let TOKEN = "";

// REQUEST FUNCTION
async function request(url, method="GET", body=null, auth=false) {
    let headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    };

    if (auth) {
        if (!TOKEN) {
            show("❌ Login first");
            return;
        }
        headers["Authorization"] = "Bearer " + TOKEN;
    }

    let options = { method, headers };

    if (body && !(body instanceof FormData)) {
        options.body = JSON.stringify(body);
    } else if (body instanceof FormData) {
        delete headers["Content-Type"];
        options.body = body;
    }

    let res = await fetch(url, options);
    let text = await res.text();

    let data;
    try {
        data = text ? JSON.parse(text) : "";
    } catch {
        data = text;
    }

    show({ status: res.status, data });
}

// AUTH
function register() {
    request("/api/register", "POST", {
        name: reg_name.value,
        email: reg_email.value,
        password: reg_password.value,
        password_confirmation: reg_password_confirm.value
    });
}

async function login() {
    let res = await fetch("/api/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            email: email.value,
            password: password.value
        })
    });

    let data = await res.json();
    TOKEN = data.token || "";
    token.innerText = TOKEN;

    show(data);
}

function getUser() {
    request("/api/user", "GET", null, true);
}

// CATEGORY
function createCategory() {
    request("/api/categories", "POST", {
        name: cat_name.value,
        description: cat_desc.value
    }, true);
}

function getCategories() {
    request("/api/categories");
}

// PRODUCT
async function createProduct() {
    if (!TOKEN) return show("Login first");

    let formData = new FormData();

    formData.append("category_id", product_category_id.value);
    formData.append("name", product_name.value);
    formData.append("description", product_desc.value);
    formData.append("price", product_price.value);
    formData.append("stock", product_stock.value);

    let files = product_images.files;

    for (let i = 0; i < files.length; i++) {
        formData.append("images[]", files[i]);
    }

    request("/api/products", "POST", formData, true);
}

function getProducts() {
    request("/api/products");
}

// CART
function addToCart() {
    request("/api/cart", "POST", {
        product_id: cart_product_id.value,
        quantity: cart_quantity.value
    }, true);
}

function getCart() {
    request("/api/cart", "GET", null, true);
}

function updateCart() {
    request("/api/cart/" + update_cart_id.value, "PUT", {
        quantity: update_cart_quantity.value
    }, true);
}

function deleteCart() {
    request("/api/cart/" + delete_cart_id.value, "DELETE", null, true);
}

function clearCart() {
    request("/api/cart-clear", "DELETE", null, true);
}

// CHECKOUT
function checkout() {
    if (!TOKEN) return show("Login first");

    let address = document.getElementById("shipping_address").value;
    let phone = document.getElementById("phone").value;

    if (!address || !phone) {
        show("❌ Fill all fields");
        return;
    }

    request("/api/checkout", "POST", {
        shipping_address: address,
        phone: phone
    }, true);
}

function getOrders() {
    request("/api/orders", "GET", null, true);
}

// UI
function show(data) {
    response.innerText = JSON.stringify(data, null, 2);
}
</script>

</body>
</html>