const fs = require("fs");
const path = require("path");
const request = require("request");
const helper = require("../util/myModule");
const currencyFormatter = require('currency-formatter');

const PDFDocument = require("pdfkit");
const stripe = require('stripe')('sk_test_S13vmXHzUuBdJ68etJ1ge4dj00CiMskYqw');

const Product = require("../models/product");
const Order = require("../models/order");

const ITEMS_PER_PAGE = 6;

const removeAccent = require("../util/myModule").removeAccent;

const search = (data, query, queryOt) => {
  const Regex = new RegExp(removeAccent(queryOt), "i");
  const result = data.filter(e => Regex.test(removeAccent(e[query]) ) );
  return result;
}

exports.getIndex = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  let totalItems;
  let queryPath = ''
  const query1 = "title"
  const queryOt1 = req.query.queryOt1 || ""

  Product.find()
    .then(products => {      
      let result = products
      if (queryOt1) {
        queryPath = `query1=${query1}&queryOt1=${queryOt1}`
        result = search(products, query1, queryOt1)
      }
      totalItems = result.length
      result = result.slice( (page-1) * ITEMS_PER_PAGE , (page-1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE)
      return result
    })
    .then(products => {
      res.render('./shop/index', {
        prods: products,
        pageTitle: 'Hệ thống bán hàng điện tử gia dụng gia đình cửa hàng XM',
        path: '/',
        queryPath: queryPath,
        queryOt1: queryOt1,
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
}


exports.getProducts = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  let totalItems;
  let queryPath = ''
  const query1 = "title"
  const queryOt1 = req.query.queryOt1 || ""

  Product.find()
    .then(products => {      
      let result = products
      if (queryOt1) {
        queryPath = `query1=${query1}&queryOt1=${queryOt1}`
        result = search(products, query1, queryOt1)
      }
      totalItems = result.length
      result = result.slice( (page-1) * ITEMS_PER_PAGE , (page-1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE)
      return result
    })
    .then(products => {
      res.render('./shop/product-list', {
        prods: products,
        pageTitle: 'Tất cả các sản phẩm',
        path: '/products',
        queryPath: queryPath,
        queryOt1: queryOt1,
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render("./shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products"
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};


exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      res.render("./shop/cart", {
        pageTitle: "Giỏ hàng của bạn",
        path: "/cart",
        products: products
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
}

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      res.redirect("/cart");
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
}

exports.postCartDeleleProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect("/cart");
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
}


const getDataCurrency = (req, res, callback) => {
  let options = {
    method: 'GET',
    url: 'https://free.currconv.com/api/v7/convert',
    qs: {q: 'USD_VND', compact: 'ultra', apiKey: '329e67800ba9b2c435cd'},
  };

  return request(options, function (error, response, body) {
    if (error) throw new Error(error);
    callback(req, res, body);
  });
  
}

exports.getCheckout = (req, res, next) => {

  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then(user => {
      getDataCurrency(req, res, (req, res, currency) => {
        const products = user.cart.items;
        currency = JSON.parse(currency);
        let total = 0;

        products.forEach(p => {
          total += p.quantity * p.productId.price;
        })

        res.render("shop/checkout", {
          path: "/checkout",
          pageTitle: "Thanh toán",
          products: products,
          totalSum: total,
          totalCurrencyUSD: total / currency.USD_VND
        });
      })      
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
}

exports.postOrder = (req, res, next) => {
  const token = req.body.stripeToken;
  const name = req.body.name || '';
  const address = req.body.address || '';
  const phoneNumber = req.body.phoneNumber || '';
  let totalSum = 0;
  
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then(user => {
      user.cart.items.forEach(p => {
        totalSum += p.quantity * p.productId.price;
      })

      const products = user.cart.items.map(i => {
        return {
          quantity: i.quantity,
          product: {
            ...i.productId._doc
          }
        };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products,
        name: name,
        address: address,
        phoneNumber: phoneNumber
      });
      return order.save();
    })
    .then(result => {
      getDataCurrency(req, res, (req, res, currency) => {
        currency = JSON.parse(currency);       
        const charge = stripe.charges.create({          
          amount: Math.round((totalSum / currency.USD_VND) * 100),
          currency: "usd",
          description: "Demo order",
          source: token,
          metadata: {
            order_id: result._id.toString()
          }
        });
        return req.user.clearCart();
      })
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
}

exports.getOrders = (req, res, next) => {
  Order.find({
      "user.userId": req.user._id
    })
    .then(orders => {
      res.render("./shop/orders", {
        pageTitle: "Đơn hàng của bạn",
        path: "/orders",
        orders: orders
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
}

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;

  Order.findById(orderId)
    .then(order => {
      if (!order) {
        return next(new Error("Không tìm thấy đơn hàng."));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Không được phép"));
      }

      const invoiceName = "invoice-" + orderId + ".pdf";
      const invoicePath = path.join("data", "invoices", invoiceName);

      const pdfDoc = new PDFDocument();
      res.setHeader('Content-type', 'application/pdf');
      res.setHeader('Content-disposition', 'inline; filename="' + invoiceName + '"');

      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text("Hoa don", {
        underline: true
      });

      pdfDoc.text("------------------------------------------");

      pdfDoc.fontSize(15).text("Dia chi: " +  helper.removeAccent(order.address)) ;
      pdfDoc.fontSize(15).text("SDT: " + order.phoneNumber) ;
      pdfDoc.text(" ");

      let totalPrice = 0;
      order.products.forEach(prod => {
        totalPrice += totalPrice = prod.quantity * prod.product.price;
        console.log(helper.removeAccent(prod.product.title));
        pdfDoc.fontSize(14).text(helper.removeAccent(prod.product.title) + " - " + prod.quantity + " x " + prod.product.price + " VND");
      });

      pdfDoc.fontSize(24).text("---------------------------------------------");

      pdfDoc.fontSize(20).text("Tong tien: " + totalPrice + " VND") ;

      // end to create file and send 
      pdfDoc.end();
    })
    .catch(err => next(err));
}