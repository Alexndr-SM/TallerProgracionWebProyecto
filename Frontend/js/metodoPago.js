document
  .getElementById("form-reserva")
  .addEventListener("submit", function (event) {
    // Evita el envío tradicional del formulario
    event.preventDefault();

    // Obtiene el valor del método de pago seleccionado
    const metodoSeleccionado = document.getElementById("pago").value;

    // Redirige según la opción
    switch (metodoSeleccionado) {
      case "tarjeta":
        window.location.href = "metodosPago/pagoTarjeta.html";
        break;
      case "paypal":
        window.location.href = "metodosPago/pagoPaypal.html";
        break;
      case "yape":
        window.location.href = "metodosPago/pagoYape.html";
        break;
      default:
        alert("Por favor, selecciona un método de pago válido.");
    }
  });
