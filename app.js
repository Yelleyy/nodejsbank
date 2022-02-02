require("dotenv").config();
require("./config/database").connect();
const path = require('path');
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
var LocalStorage = require('node-localstorage').LocalStorage;
const bodyParser = require('body-parser')
const User = require("./model/user");
const Bank = require("./model/bank");
const Banktransaction = require("./model/banktransaction");
const auth = require("./middleware/auth");
var MersenneTwister = require('mersenne-twister');

let localStorage = new LocalStorage('./scratch');
var generator = new MersenneTwister();
var gennum = generator.random_int() * generator.random_int();

const app = express();

// const isLoggedIn = (req, res, next) => {
//     if (req.isAuthenticated()) {
//         next();
//     } else {
//         res.redirect('/login');
//     }
// };
// app.get('/', isLoggedIn, function(req, res, next) {
//     res.render('welcome', { title: 'Express', user: req.user });
// });

app.set('view engine', 'ejs');
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname));


app.use(express.json({ limit: "50mb" }));
const urlencodedParser = bodyParser.urlencoded({ extended: false })

app.post("/register", urlencodedParser, async(req, res) => {
    try {
        // Get user input
        const { first_name, last_name, email, password, password_repeat, tel } = req.body;
        console.log(req.body)
            // Check user input
        const oldUser = await User.findOne({ email });
        const oldTel = await User.findOne({ tel });
        if (!(email && password && first_name && last_name && tel)) {
            res.status(400).send("All input is required");
        } else if (oldUser) {
            return res.status(409).send("This Email Already Exist. Please use another email");
        } else if (oldTel) {
            return res.status(410).send("This Tel Already Exist. Please use another tel");
        } else if (password != password_repeat) {
            res.status(411).send("Password doesn't match");
            // return res.render('index', { alert: "Password doesn't match" })
        } else {

            encryptedPassword = await bcrypt.hash(password, 10);

            // Create user in our database
            const user = await User.create({
                first_name: first_name,
                last_name: last_name,
                email: email.toLowerCase(), // sanitize: convert email to lowercase
                password: encryptedPassword,
                tel: tel,
            });

            // Create token
            const token = jwt.sign({ user_id: user._id, email },
                process.env.TOKEN_KEY, {
                    expiresIn: "2h",
                }
            );
            // save user token
            user.token = token;
            window.localStorage.setItem('token', token);
            // return new user
            res.status(200).json(user);
        }
    } catch (err) {
        console.log(err);
    }
});

app.post("/login", urlencodedParser, async(req, res) => {
    try {

        const { email, password } = req.body;
        if (!(email && password)) {
            res.status(400).send("All input is required");
        }

        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign({ user_id: user._id, email },
                process.env.TOKEN_KEY, {
                    expiresIn: "2h",
                }
            );

            user.token = token;
            localStorage.setItem('token', token);
            localStorage.setItem('email', email);
            console.log(localStorage.getItem('token'));
            res.redirect('/welcome')
            res.status(200).json(user);
        }
        res.status(400).render('index')

    } catch (err) {
        console.log(err);
    }
});

app.get("/welcome", auth, (req, res) => {
    res.render('home', { name: localStorage.getItem('email') })
});

app.get("/profile", (req, res) => {
    res.render('bankprofile', { name: localStorage.getItem('email') })
});
app.post("/createaccount", urlencodedParser, async(req, res) => {
    try {

        const { account_name, email } = req.body;
        console.log(req.body)
        if (!(account_name, email)) {
            res.status(400).send("All input is required");
        } else {
            await Bank.create({
                _id: gennum,
                account_name: account_name,
                email: email.toLowerCase(),
            });
            res.redirect('/myaccount');
        }
    } catch (err) {
        console.log(err);
    }
});
app.get("/myaccount", urlencodedParser, async(req, res) => {
    try {
        email = localStorage.getItem('email')
        console.log("myemail " + email);
        if (!(email)) {
            res.status(400).send("All input is required");
        }
        Bank.find({ email }, (err, data) => {

            res.render("account", {
                name: localStorage.getItem('email'),
                data: data
            });
        });
    } catch (err) {
        console.log(err);
    }
});

app.get("/menu", urlencodedParser, async(req, res) => {
    let email = localStorage.getItem('email')
    console.log(email);
    // localStorage.setItem("email", email)
    Bank.find({ email }, (err, data) => {
        res.render('bankmenu', {
            name: email,
            data: data
        });
    });

});
app.post("/deposit", urlencodedParser, async(req, res) => {
    try {
        const { id, amount } = req.body;
        console.log(id, amount);
        const bank = await Bank.updateOne({
            _id: id
        }, {
            $inc: {
                balance: amount
            }
        })
        res.redirect('/menu');
    } catch (err) {
        console.log(err);
    }
});
app.post("/withdraw", urlencodedParser, async(req, res) => {
    try {
        const { id, amount } = req.body;
        newamount = (-amount).toString();
        amount2 = parseInt(newamount);
        const mybank = await Bank.findOne({ _id: id })
        let mybalance = mybank.balance
        newbalance = mybalance - amount;
        if (newbalance >= 0) {

            console.log(id, amount2);
            await Bank.updateOne({
                _id: id
            }, {
                $inc: {
                    balance: amount2
                }
            })
            res.redirect('/menu');
        } else {
            res.status(404).send('Error 404 your balance not enought to withdraw')
        }
    } catch (err) {
        console.log(err);
    }
});
app.post("/transfer", urlencodedParser, async(req, res) => {
    try {
        const { my_id, transfer_id, amount } = req.body;
        if (!(my_id && transfer_id && amount)) {
            res.status(400).send("All input is required");
        }
        console.log(my_id, transfer_id, amount);
        const mybank = await Bank.findOne({ _id: my_id })
        const desbank = await Bank.findOne({ _id: transfer_id })
        let mybalance = mybank.balance
        console.log("balance = " + mybalance);
        newbalance = mybalance - amount;
        if (newbalance >= 0) {

            if (desbank) {
                await Bank.updateOne({
                    _id: transfer_id
                }, {
                    $inc: {
                        balance: amount
                    }
                })
                amountto = (-amount).toString();
                amount2 = parseInt(amountto);
                await Bank.updateOne({
                    _id: my_id
                }, {
                    $inc: {
                        balance: amount2
                    }
                })
                await Banktransaction.create({
                    _id: gennum,
                    account_id: my_id,
                    email: mybank.email.toLowerCase(),
                    destination_account: transfer_id,
                    destination_email: desbank.email.toLowerCase(),
                    action: "transfer",
                    balance: amount,
                    remain: mybank.balance - amount,
                })
                await Banktransaction.create({
                    _id: gennum * 2,
                    account_id: transfer_id,
                    email: desbank.email.toLowerCase(),
                    destination_account: my_id,
                    destination_email: mybank.email.toLowerCase(),
                    action: "recieve",
                    balance: amount,
                    remain: parseFloat(desbank.balance) + parseFloat(amount),

                })
                res.redirect('/menu');
            } else {
                res.status(404).send('Error 404 not found this account ID')
            }
        } else {
            res.status(404).send('Error 404 your balance not enought to transfer')
        }
    } catch (err) {
        console.log(err);
    }
});
app.post("/transfermenu", async(req, res) => {
    try {
        email = localStorage.getItem('email')
        console.log("myemail " + email);
        if (!(email)) {
            res.status(400).send("All input is required");
        }
        Banktransaction.find({ $and: [{ email: email }, { action: "transfer" }] }, (err, data) => {

            res.render("transfer", {
                name: localStorage.getItem('email'),
                data: data
            });
        });
    } catch (err) {
        console.log(err);

    }
});
app.post("/recievemenu", async(req, res) => {
    try {
        email = localStorage.getItem('email')
        console.log("myemail " + email);
        if (!(email)) {
            res.status(400).send("All input is required");
        }
        Banktransaction.find({ $and: [{ destination_email: email }, { action: "recieve" }] }, (err, data) => {

            res.render("recieve", {
                name: localStorage.getItem('email'),
                data: data
            });
        });
    } catch (err) {
        console.log(err);

    }
});
app.get("/history", (req, res) => {

    res.render("transaction", {
        name: localStorage.getItem('email')
    });
});
app.get("/", (req, res) => {
    res.render('index');

});
app.get("/logout", (req, res) => {
    localStorage.clear();
    res.redirect('/');
});

app.use("*", (req, res) => {
    res.status(404).json({
        success: "false",
        message: "Page not found",
        error: {
            statusCode: 404,
            message: "You reached a route that is not defined on this server",
        },
    });
});

module.exports.getToken = () => { return localStorage.getItem('token') };
module.exports = {
    app
};