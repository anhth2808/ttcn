const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");

const errorCtrl = require("./controllers/error");
const shopCtrl = require("./controllers/shop");

const isAuth = require("./middleware/is-auth");
const User = require("./models/user");

const MONGODB_URI = "mongodb+srv://lockedheart98:gatigun1@cluster0-y9saz.mongodb.net/shop"

const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "session"
});
const csrfProtection = csrf({});

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/png" || file.mimetype === "image/jpg" || file.mimetype === "image/jpeg") {
    cb(null, true);
  } else { 
    cb(null, false);
  }
};

app.set('view engine', 'pug');
app.set('views', 'views');

const adminData = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require("./routes/auth");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single("image"));
app.use(express.static(path.join(__dirname, 'public')));
app.use("/images", express.static(path.join(__dirname, 'images')));
app.use(
  session({ secret: "a long string", resave: false, saveUninitialized: false, store: store })
);

app.use(flash());

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }

  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
          return next();
      }
      req.user = user;
      next();
    })  
    .catch(err => {
      next(new Error(err));
    });
});

app.post("/create-order", isAuth, shopCtrl.postOrder);

// check csrf
app.use(csrfProtection);

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.priority = req.session.priority;
  res.locals.csrfToken = req.csrfToken();
  next();
});


app.use('/admin', adminData);
app.use(shopRoutes);
app.use(authRoutes);

app.get("/500", errorCtrl.get500);

app.use(errorCtrl.get404);

app.use((error, req, res, next) => {
  // res.redirect("/500");
  console.log(error);
  res.status(500).render('500', { 
      pageTitle: 'Error',
      path: "/500"
  });
})

mongoose
  .connect(MONGODB_URI)
  .then(result => {
    app.listen(3333)
  })
  .catch(err => {
    console.log(err); 
  });