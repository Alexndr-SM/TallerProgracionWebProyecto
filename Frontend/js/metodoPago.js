const formReserva = document.getElementById("form-reserva");
const reservaLayout = document.querySelector(".reserva-layout");
const panelPago = document.getElementById("panel-pago");
const metodosPago = document.querySelectorAll(".pago-metodo");
const selectorPago = document.getElementById("pago");
const formularioAcceso = document.getElementById("reserva-acceso");
const mensajeReserva = document.getElementById("reserva-mensaje");
const botonConfirmar = document.getElementById("confirmar-reserva");
const usuario = window.Auth.getUser();

if (!window.Auth.getToken() || !usuario?.email) {
  formReserva.hidden = true;
  formularioAcceso.hidden = false;
} else {
  document.getElementById("nombre").value = usuario.nombre || "";
  document.getElementById("email").value = usuario.email;
  document.getElementById("nombre").readOnly = true;
  document.getElementById("email").readOnly = true;
}

formReserva.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!window.Auth.getToken()) {
    formularioAcceso.hidden = false;
    return;
  }

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
  mensajeReserva.hidden = true;
});

botonConfirmar.addEventListener("click", async () => {
  botonConfirmar.disabled = true;
  mensajeReserva.hidden = false;
  mensajeReserva.textContent = "Registrando reserva...";

  try {
    const response = await fetch(`${(window.API_URL || "").replace(/\/$/, "")}/api/reservas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${window.Auth.getToken()}`,
      },
      body: JSON.stringify({
        fecha_tour: document.getElementById("fecha").value,
        asistentes: Number(document.getElementById("personas").value),
        metodo_pago: selectorPago.value,
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      if (response.status === 401) {
        formReserva.hidden = true;
        formularioAcceso.hidden = false;
        panelPago.hidden = true;
        reservaLayout.classList.remove("mostrar-pago");
      }
      throw new Error(result.message || "No se pudo registrar la reserva.");
    }

    mensajeReserva.textContent = `Reserva #${result.reserva.id} registrada correctamente.`;
    document.getElementById("volver-reserva").hidden = true;
  } catch (error) {
    mensajeReserva.textContent = error.message || "No se pudo conectar con el servidor.";
    botonConfirmar.disabled = false;
  }
});

document.getElementById("volver-reserva").addEventListener("click", () => {
  reservaLayout.classList.remove("mostrar-pago");
  panelPago.hidden = true;
  selectorPago.focus();
});

/* Reservas desde la fecha actual. */
document.getElementById("fecha").min = new Date().toISOString().split("T")[0];
