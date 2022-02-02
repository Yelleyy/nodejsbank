const mongoose = require("mongoose");

const bankSchema = new mongoose.Schema({
    _id: { type: Number, default: null },
    account_name: { type: String, default: "youraccount" },
    email: { type: String, },
    balance: { type: Number, default: 0 },
});

module.exports = mongoose.model("bank", bankSchema);