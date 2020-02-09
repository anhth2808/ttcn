const deleteProduct = (btn) => {
  const prodId = btn.parentNode.querySelector("[name=productId]").value;
  const csrf = btn.parentNode.querySelector("[name=_csrf]").value;

  const productElement = btn.closest("article");

  fetch("/admin/product/" + prodId, {
    method: "DELETE",
    headers: {
      "csrf-token": csrf
    }
  })
  .then(result => {
    return result;
  })
  .then(data => {
    productElement.parentNode.removeChild(productElement);
  })
  .catch(err => {
    console.log(err);
  });
}

const changeOrderStatus = () => {
  const selectField = $('#status')

  selectField.change(() => {
    const csrf = $("[name=_csrf]").val()  
    const orderId = $('#orderId').val()  
    const orderStatus = selectField.val()
    let data = {
      orderId: orderId,
      orderStatus: orderStatus
    }
    console.log(orderId, orderStatus)
    console.log(JSON.stringify(data))
    fetch('/admin/orders/status', {
      method: "PUT",
      headers: {
        'Content-Type': 'application/json',
        'csrf-token': csrf
      },
      body: JSON.stringify(data)
    })
    .then(result => {
      return result
    })
    .then(data => console.log(data))
    .catch(err => {
      console.log(err);
    })
  })

}

changeOrderStatus()