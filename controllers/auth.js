const crypto = require("crypto");

const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const { validationResult } = require("express-validator/check");

const User = require("../models/user");

const transporter = nodemailer.createTransport(sendgridTransport({
  auth: {
    api_key: "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"
  }
}));

exports.getLogin = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("./auth/login", {
    pageTitle: "Đăng nhập hệ thống",
    path: "/login",
    errorMessage: message,
    oldInput: {
      email: "",
      password: ""
    },
    validationErrors: []
  });
}

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422)
      .render("./auth/login", {
        pageTitle: "Đăng nhập hệ thống",
        path: "/login",
        errorMessage: errors.array()[0].msg,
        oldInput: {
          email: email,
          password: password
        },
        validationErrors: errors.array()
      });
  }


  User.findOne({
      email: email
    })
    .then(user => {
      if (!user) {
        return res.status(422)
          .render("./auth/login", {
            pageTitle: "Đăng nhập hệ thống",
            path: "/login",
            errorMessage: "Email hoặc mật khẩu không hợp lệ.",
            oldInput: {
              email: email,
              password: password
            },
            validationErrors: []
          });
      }

      bcrypt.compare(password, user.password)
        .then(doMatch => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.priority = user.priority;
            req.session.user = user;
            return req.session.save((err) => {
              if (err) {
                console.log(err);
              }
              res.redirect("/");
            });
          }
          return res.status(422)
            .render("./auth/login", {
              pageTitle: "Đăng nhập hệ thống",
              path: "/login",
              errorMessage: "Email hoặc mật khẩu không hợp lệ.",
              oldInput: {
                email: email,
                password: password
              },
              validationErrors: []
            });
        })
        .catch(err => {
          console.log(err);
          redirect("/login");
        });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
}
exports.getSignup = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("./auth/signup", {
    pageTitle: "Đăng ký tài khoản",
    path: "/signup",
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationErrors: []
  });
}

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("./auth/signup", {
      pageTitle: "Đăng ký tài khoản",
      path: "/signup",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: req.body.confirmPassword
      },
      validationErrors: errors.array()
    });
  }


  bcrypt
    .hash(password, 12)
    .then(hashedPassword => {
      const user = new User({
        email: email,
        password: hashedPassword,
        cart: {
          items: []
        }
      });
      return user.save();
    })
    .then(result => {
      res.redirect("/login");
      return transporter.sendMail({
        to: email,
        from: "hoanganh@hiephungshop.com",
        subject: "Đăng ký thành công!",
        html: `
              <h3>Bạn đã đăng ký thành công!</h3>
              <p><a href="http://localhost:3333/login">Click</a> đến trang đăng nhập.</p>
              `
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });


}

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect("/");
  })
}

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render("./auth/reset", {
    pageTitle: "Lấy lại mật khẩu",
    path: "/reset",
    errorMessage: message
  })
}

exports.postReset = (req, res, next) => {
  const email = req.body.email;

  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }
    const token = buffer.toString("hex");
    User.findOne({
        email: email
      })
      .then(user => {
        /*
            check user is exist
            add token and token expiration to user
        */
        if (!user) {
          req.flash("error", "Không có tài khoản với email đó được tìm thấy!");
          return res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save()
          .then(result => {
            /*
                send email to reset password
            */
            res.redirect("/");
            transporter.sendMail({
              to: email,
              from: "hoanganh@hiephungshop.com",
              subject: "Khôi phục mật khẩu",
              html: `
                      <p>Bạn yêu cầu đặt lại mật khẩu</p>                        
                      <p>Ấn vào đây <a href="http://localhost:3333/reset/${token}">link</a> để đặt mật khẩu mới.</p>
                    `
            });
          });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({
      resetToken: token,
      resetTokenExpiration: {
        $gt: Date.now()
      }
    })
    .then(user => {
      let message = req.flash("error");
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }

      res.render("./auth/new-password", {
        pageTitle: "Tạo mật khẩu mới",
        path: "/new-password",
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: token
      })
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
}

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;

  let resetUser;

  User.findOne({
      resetToken: passwordToken,
      resetTokenExpiration: {
        $gt: Date.now()
      },
      _id: userId
    })
    .then(user => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then(hashedPassword => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then(resutl => {
      res.redirect("/login");
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
}