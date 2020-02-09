const price = document.querySelectorAll('.product__price');

const formatter = new Intl.NumberFormat('vi', {
  style: 'currency',
  currency: 'VND'
});

price.forEach((e) => {
  const formatPrice = formatter.format(e.textContent);
  e.innerHTML = formatPrice;
});