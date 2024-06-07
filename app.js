const express = require('express');
const session = require('express-session');
const app = express();
const port = 3000;
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const UserModel = require('./models/user');
const AdminModel = require('./models/admin');
const singUp = require('./controllers/signUp')
const login = require('./controllers/login');
const ProductModel = require('./models/product');
const CartModel = require('./models/cart');

app.set('view engine', 'ejs');
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(express.json());
app.use(bodyParser.urlencoded({extended: true}));


// HOME
app.get('/', async (req, res) => {
    const products = await ProductModel.find({});
    if (req.session && req.session.loggedin) {
        res.render('home', { isLoggedIn: true, email: req.session.email, products } );
    } else {
        res.render('home', { isLoggedIn: false, email: null, products });
    }
});


// SIGNUP
app.get('/signup', async (req, res) => {
    res.render('signup-form', { status: null });
});
app.get('/getSignUpForm/:status', async (req, res) => {
    console.log(req.params.status);
    if (req.params.status == 400 || '400') {
        res.render('signup-form', { status: req.params.status });
    }
});
app.post('/postSignUpForm', async (req, res) => {
    console.log(req.body);
    const data = await singUp(req.body);
    console.log(data);
    if (data && data.status == 200) {
        res.redirect('/login');
    } else if (data) {
        res.redirect(`/getSignUpForm/${data.status}`);
    }
});

// LOGIN
app.get('/login', async (req, res) => {
    res.render('login-form');
});
app.post('/postLoginForm', async (req, res) => {
    const data = await login(req.body);
    console.log(data);
    if (data.status == 200) {
        req.session.loggedin = true;
		req.session.email = req.body.email;
        req.session.type = data.data.type
        if (!data.data.type || data.data.type == 'customer') {
            res.redirect('/');
        } else {
            res.redirect('/admin');
        }
    } else {
        res.redirect('/login');
    }
});

// LOGOUT
app.get('/logout', async (req, res) => {
    await req.session.destroy();
    res.redirect('/')
});

// ADMIN

app.get('/admin', async (req, res) => {
    if (req.session && req.session.loggedin && req.session.type == 'admin') {
        res.render('admin')
    } else {
        res.redirect('/');
    }
});

// ADD PRODUCT
app.get('/upload', async (req, res) => {
    if (req.session && req.session.loggedin && req.session.type == 'admin') {
        res.render('upload')
    } else {
        res.redirect('/');
    }
});
// const upload = multer({
//     dest: "/uploads/images/products"
// });
// for uploading and storing in internal storage
// app.post('/upload', upload.single("image"), async (req, res) => {
//     let data = await req.body;
//     const tempPath = req.file.path;
//     const targetPath = path.join(__dirname, `./uploads/images/products/${req.file.originalname}`);

//     if (path.extname(req.file.originalname).toLowerCase() === ".png" || ".jpg" || ".jpeg") {
//       fs.rename(tempPath, targetPath, err => {
//         data.image = req.file.originalname;
//         const product = new ProductModel(data);
//         product.save();
//       });
//     } else {
//       fs.unlink(tempPath, err => {
//       });
//     }
//     res.redirect('/');
// });
// for providing link of online images
app.post('/upload', async (req, res) => {
    let data = await req.body;
    const product = new ProductModel(data);
    product.save();
    res.redirect('/upload');
});


app.get('/customerAndOrders', async (req, res) => {
    if (req.session && req.session.loggedin && req.session.type == 'admin') {
        const customers = await UserModel.find({}).populate('orders.products.product')
        res.render('customer-and-orders', { customers: customers })
    } else {
        res.redirect('/');
    }
});


// DESCRIPTION PAGE
app.get('/description/:id', async (req, res) => {
    const id = req.params.id;
    const product = await ProductModel.findOne({ _id: id });
    if (req.session && req.session.loggedin) {
        res.render('description', { isLoggedIn: true, email: req.session.email, product })
    } else {
        res.render('description', { isLoggedIn: false, email: null, product });
    } 
});


// ADD TO CART
// app.get('/addToCart/:id', async (req, res) => {
//     const id = req.params.id;
//     if (req.session && req.session.loggedin) {
//         const user = await UserModel.findOneAndUpdate(
//             { email: req.session.email },
//             { $push: { cartItems: mongoose.Types.ObjectId(id) } }    
//         );
//         res.redirect('/');
//     } else {
//         res.redirect('/');
//     }
// });

// GET CART
app.get('/cart', async (req, res) => {
    if (req.session && req.session.loggedin) {
        const user = await UserModel.findOne({ email: req.session.email });
        const cart = await CartModel.findOne({ user: user._id }).populate('products.product');
        res.render('cart', { isLoggedIn: true, email: req.session.email, cart });
    } else {
        res.redirect('/');
    }
});

// ADD TO CART
app.get('/addToCart/:id', async (req, res) => {
    const id = req.params.id;
    const product = await ProductModel.findOne({ _id: id });
    const user = await UserModel.findOne({ email: req.session.email });
    const cart = await CartModel.findOne({ user: user._id }).populate('products.product');
    let flag = true;
    if (cart && user && cart.products.length > 0) {
        cart.products.forEach( async (productData, index) => {
            console.log('====================================');
            console.log('PRODUCT => ', productData.product);
            console.log('====================================');
            if (id == productData.product._id) {
                flag = false;
                cart.products[index].quantity += 1;
                cart.totalPrice += product.price;
                cart.totalDiscount += product.discount;
                await CartModel.findOneAndUpdate({ _id: cart._id }, cart);
                res.redirect('/cart');
            };
        });        
    };
    if (cart && user && flag == true) {
        flag = false;
        cart.products.push({ product: product._id, quantity: 1 });
        cart.totalPrice += product.price;
        cart.totalDiscount += product.discount;
        await CartModel.findOneAndUpdate({ _id: cart._id }, cart);
        res.redirect('/cart');
    } else if (user && !cart && flag == true) {
        const cart = {
            user: user._id,
            products: [{ product: product._id, quantity: 1 }],
            totalPrice: product.price,
            totalDiscount: product.discount,
            shippingFee: 50
        }
        const newCart = new CartModel(cart);
        const cartId = await newCart.save();
        await UserModel.findOneAndUpdate({ _id: user._id }, { $set: { cart: cartId } })
        res.redirect('/cart');
    }
});

// ADD TO PURCHASED FROM CART
app.get('/checkoutFromCart', async (req, res) => {
    const user = await UserModel.findOne({ email: req.session.email });
    const cart = await CartModel.findOne({ user: user._id }).populate('products.product');
    if ( user.orders && user.orders.length > 0 ) {
        await UserModel.findOneAndUpdate({ user: user._id }, { $push: {orders: cart} });
        await CartModel.findOneAndUpdate({ user: user._id }, { $set: {products: [], totalPrice: 0, totalDiscount: 0} });
        res.redirect('/account');
    } else {
        await UserModel.findOneAndUpdate({ _id: user._id }, { $push: { orders: cart } });
        await CartModel.findOneAndUpdate({ user: user._id }, { $set: {products: [], totalPrice: 0, totalDiscount: 0} });
        res.redirect('/account');
    }
});

// USER ACCOUNT
app.get('/account', async (req, res) => {
    const user = await UserModel.findOne({ email: req.session.email }).populate('orders.products.product');
    if (req.session && req.session.loggedin) {
        res.render('account', { isLoggedIn: true, email: req.session.email, user } );
    } else {
        res.redirect('/');
    }
});

mongoose.connect('mongodb://localhost:27017/shop',{
    useNewUrlParser: true,
    useUnifiedTopology: true
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});