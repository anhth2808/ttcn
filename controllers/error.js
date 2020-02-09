exports.get404 = (req, res, next) => {
  res.status(404).render('404', {
    pageTitle: 'Không tìm thấy trang',
    path: "/404"
  });
}

exports.get500 = (req, res, next) => {
  res.status(500).render('500', {
    pageTitle: 'Lỗi',
    path: "/500"
  });
}