const mongoose = require("mongoose");
// var date = new Date();

// date.setHours(date.getHours() + 7)
const transactionSchema = new mongoose.Schema({
    _id: { type: Number, default: null },
    account_id: { type: String, default: null },
    email: { type: String, defaul: null },
    destination_account: { type: String, default: null },
    destination_email: { type: String, defaul: null },
    action: { type: String, default: null },
    balance: { type: Number, default: null },
    remain: { type: Number, default: null },
    date: {
        type: Date,
        default: Date
    },
});
module.exports = mongoose.model("banktransaction", transactionSchema);