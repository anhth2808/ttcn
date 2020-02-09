const path = require('path');
const express = require('express');

const adminCtrl = require("../controllers/admin");
const isAuth = require("../middleware/is-auth");
const {body} = require("express-validator/check");

const router = express.Router();

// /admin/products => GET
router.get('/products', isAuth, adminCtrl.getProducts);

// /admin/add-product => GET
router.get('/add-product', isAuth, adminCtrl.getAddProduct);

// /admin/add-product => POST
router.post(
  '/add-product', 
  [
    body("title")
      .isString()
      .isLength({min: 3})
      .trim(),
    body("price")
      .isFloat(),
    body("description")
      .isString()
      .isLength({min: 5, max: 500})
      .trim()            
  ],
  isAuth,
  adminCtrl.postAddProduct
);

router.get("/edit-product/:productId", isAuth, adminCtrl.getEditProduct);

router.post(
  "/edit-product", 
  [
    body("title")
      .isString()
      .isLength({min: 3})
      .trim(),
    body("price")
      .isFloat(),
    body("description")
      .isString()
      .isLength({min: 5, max: 500})
      .trim()              
  ],
  isAuth, 
  adminCtrl.postEditProduct
); 

router.delete("/product/:productId", isAuth, adminCtrl.deleteProduct);

router.get('/orders', isAuth, adminCtrl.getOrders)

router.get('/orders/:orderId', isAuth, adminCtrl.getOrder)

router.put('/orders/status', isAuth, adminCtrl.changeOrderStatus)


module.exports = router;