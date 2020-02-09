const Product = require("../models/product");
const Order = require("../models/order");
const { validationResult } = require("express-validator/check");
const helper = require("../util/myModule");
const fileHelper = require("../util/file");

const ITEMS_PER_PAGE = 6;

const search = (data, query, queryOt) => {
  const Regex = new RegExp(removeAccent(queryOt), "i");
  const result = data.filter(e => Regex.test(removeAccent(e[query]) ) );
  return result;
}

const removeAccent = require("../util/myModule").removeAccent;

const sendJsonResponse = (res, status, content) => {
  res.status(status);
  res.json(content);
}

// ADD: product
exports.getAddProduct = (req, res, next) => {
  res.render('./admin/edit-product', {
    pageTitle: 'Thêm sản phẩm',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: []
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const price = req.body.price;
  const image = req.file;
  const description = req.body.description;

  if (!image) {
    return res.status(422).render('./admin/edit-product', {
      pageTitle: 'Thêm sản phẩm',
      path: '/admin/add-product',
      editing: false,
      product: {
        title: title,
        price: price,
        description: description
      },
      hasError: true,
      errorMessage: "Tệp đính kèm không phải là một hình ảnh.",
      validationErrors: []
    });
  }

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('./admin/edit-product', {
      pageTitle: 'Thêm sản phẩm',
      path: '/admin/add-product',
      editing: false,
      product: {
        title: title,
        price: price,
        description: description
      },
      hasError: true,
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  const imageUrl = image.path;

  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user // pass id to userId
  });

  product
    .save()
    .then(result => {
      console.log("Create Product");
      res.redirect("/admin/products");
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

// EDIT: product
exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/");
  }

  const prodId = req.params.productId;
  Product
    .findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect("/");
      }
      res.render('./admin/edit-product', {
        pageTitle: 'Chỉnh sửa thông tin sản phẩm',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
        validationErrors: []
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};


exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDescription = req.body.description;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('./admin/edit-product', {
      pageTitle: 'Chỉnh sửa thông tin sản phẩm',
      path: '/admin/edit-product',
      editing: true,
      product: {
        _id: prodId,
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDescription
      },
      hasError: true,
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  Product.findById(prodId)
    .then(product => {
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect("/");
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      if (image) {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }
      product.description = updatedDescription;

      return product.save()
        .then(result => {
          console.log("UPDATED PRODUCT!!");
          res.redirect("/admin/products");
        });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

// GET: product
exports.getProducts = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  let totalItems;
  let queryPath = ''
  const query1 = "title"
  const queryOt1 = req.query.queryOt1 || ""
  // if not use -_id, _id will auto add to result
  Product.find({
      userId: req.user._id
    })
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
    // .select("title price -_id")
    // .populate("userId", "name")
    .then(products => {
      res.render('./admin/products', {
        prods: products,
        pageTitle: 'Quản lý tất cả sản phẩm',
        path: '/admin/products',
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

exports.getOrders = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  let totalItems;
  
  Order.find({})
  .populate()
  .countDocuments()
  .then(num => {
    totalItems = num;
    return Order.find()
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
  })
  .then(orders => {
    orders.forEach(o => {
      let total = 0
      o.products.forEach(p => {
        total += p.quantity * p.product.price;
      })
      o.total = total;
    }) 
    res.render("./admin/orders", {
      pageTitle: "Đơn hàng của bạn",
      path: "/admin/orders",
      orders: orders,
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


exports.getOrder = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId)
    .then(order => {      
      let total = 0
      order.products.forEach(p => {
        total += p.quantity * p.product.price
      })
      order.total = total
      res.render("./admin/order-detail", {
        order: order
        // pageTitle: ,
        // path: "/admin/order"
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
}

// 

// DELETE: product
exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return next(new Error("Sản phẩm không có."));
      }
      fileHelper.deleteFile(product.imageUrl);
      return Product.deleteOne({
        _id: prodId,
        userId: req.user._id
      });
    })
    .then(() => {
      console.log("Destroy product");
      res.status(200).json({
        message: "Thành công!"
      });
    })
    .catch(err => {
      res.status(500).json({
        message: "Xóa sản phẩm thất bại!"
      });
    });
}


exports.changeOrderStatus = (req, res, next) => {
  const orderId = req.body.orderId
  const orderStatus = req.body.orderStatus
  console.log(req.body)
  console.log(orderId, orderStatus)
  
  Order.findById(orderId)
    .then(order => {
      order.status = orderStatus
      return order.save()
    })
    .then(() => {
      sendJsonResponse(res, 200, {
        message: 'Change status successfull'
      })
    })
    .catch(err => {
      sendJsonResponse(res, 500, {
        message: err
      })
    })
}