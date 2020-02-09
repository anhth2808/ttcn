const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const orderSchema = new Schema({
  products: [{
    product: {type: Object, required: true},
    quantity: {type: Number, required: true}
  }],
  user: {
    email: {
      type: String,
      require: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User"
    }
  },
  name: {
    type: String,
  },
  address: {
    type: String,
  },
  phoneNumber: {
    type: String
  },
  status: {type: Number, default: 0},
  orderDate : { type : Date, default: Date.now }
});

module.exports = mongoose.model("Order", orderSchema);