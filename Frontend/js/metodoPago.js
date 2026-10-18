const formReserva = document.getElementById("form-reserva");
const reservaLayout = document.querySelector(".reserva-layout");
const panelPago = document.getElementById("panel-pago");
const metodosPago = document.querySelectorAll(".pago-metodo");
const selectorPago = document.getElementById("pago");

formReserva.addEventListener("submit", (event) => {
  event.preventDefault();

  const metodoSeleccionado = selectorPago.value;
  const metodoActivo = [...metodosPago].find((metodo) => metodo.dataset.metodo === metodoSeleccionado);

  if (!metodoActivo) {
    selectorPago.focus();
    return;
  }

  metodosPago.forEach((metodo) => {
    metodo.hidden = metodo !== metodoActivo;
  });
  panelPago.hidden = false;
  reservaLayout.classList.add("mostrar-pago");
  panelPago.setAttribute("aria-label", `Método de pago: ${metodoActivo.querySelector("h2").textContent}`);
});

document.getElementById("volver-reserva").addEventListener("click", () => {
  reservaLayout.classList.remove("mostrar-pago");
  panelPago.hidden = true;
  selectorPago.focus();
});

/* Reservas desde la fecha actual. */
document.getElementById("fecha").min = new Date().toISOString().split("T")[0];
