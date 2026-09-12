// ==========================
// 🔥 CONFIGURAR FIREBASE AQUÍ
// ==========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// 👉 PEGÁ ACÁ TU CONFIG DE FIREBASE
const firebaseConfig = {
   apiKey: "AIzaSyCJWs1cgWmMbjt3cTv3uBo1ZXmjPQJarro",
  authDomain: "churros-967bf.firebaseapp.com",
  databaseURL: "https://churros-967bf-default-rtdb.firebaseio.com",
  projectId: "churros-967bf",
  storageBucket: "churros-967bf.firebasestorage.app",
  messagingSenderId: "41290516860",
  appId: "1:41290516860:web:db4a217728b190ba03fcf9"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==========================
// 🔐 LOGIN
// ==========================

const loginScreen = document.getElementById("login-screen");
const appContainer = document.getElementById("app-container");
const loginBtn = document.getElementById("login-btn");
const passwordInput = document.getElementById("password-input");
const loginError = document.getElementById("login-error");

loginBtn.addEventListener("click", () => {
  const pass = passwordInput.value.trim().toLowerCase();

  if (pass === "teamo") {
    loginScreen.classList.add("hidden");
    appContainer.classList.remove("hidden");
  } else {
    loginError.style.display = "block";
  }
});

// ==========================
// 📋 CONFIGURACIÓN
// ==========================

const configForm = document.getElementById("config-form");
const configLocation = document.getElementById("config-location");
const configPriceDozen = document.getElementById("config-price-dozen");
const configPriceHalf = document.getElementById("config-price-half");
const configStock = document.getElementById("config-stock");

const configRef = ref(db, "config");

configForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const configData = {
    location: configLocation.value,
    priceDozen: Number(configPriceDozen.value),
    priceHalf: Number(configPriceHalf.value),
    stock: Number(configStock.value)
  };

  set(configRef, configData);
});

onValue(configRef, (snapshot) => {
  const data = snapshot.val();
  if (data) {
    configLocation.value = data.location;
    configPriceDozen.value = data.priceDozen;
    configPriceHalf.value = data.priceHalf;
    configStock.value = data.stock;
  }
});

// Formateador de pesos argentinos
const formatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0
});

// ==========================
// 👥 CLIENTES
// ==========================

const clientForm = document.getElementById("client-form");
const clientsList = document.getElementById("clients-list");

const clientsRef = ref(db, "clients");

clientForm.addEventListener("submit", (e) => {
  e.preventDefault();

const newClient = {
  name: document.getElementById("client-name").value,
  qty: Number(document.getElementById("client-qty").value),
  obs: document.getElementById("client-obs").value || "",
  time: document.getElementById("client-time").value || "",
  delivered: false
};

  push(clientsRef, newClient);
  clientForm.reset();
});

// ==========================
// 📊 ESTADÍSTICAS
// ==========================

const statStock = document.getElementById("stat-stock");
const statPendingQty = document.getElementById("stat-pending-qty");
const statTotalOrders = document.getElementById("stat-total-orders");
const statDozens = document.getElementById("stat-dozens");
const statDulce = document.getElementById("stat-dulce");
const statEarned = document.getElementById("stat-earned");
const statPendingMoney = document.getElementById("stat-pending-money");

onValue(clientsRef, (snapshot) => {
  const clients = snapshot.val() || {};
  renderClients(clients);
  calculateStats(clients);
});

// ==========================
// 🧮 FUNCIONES
// ==========================

function renderClients(clients) {

  const pendingList = document.getElementById("pending-list");
  const deliveredList = document.getElementById("delivered-list");

  if (!pendingList || !deliveredList) {
    console.error("No existen los contenedores pending-list o delivered-list");
    return;
  }

  pendingList.innerHTML = "";
  deliveredList.innerHTML = "";

  Object.entries(clients).forEach(([id, client]) => {

    const card = document.createElement("div");
    card.className = "client-card";

    card.innerHTML = `
      <div class="client-info">
        <strong>${client.name}</strong>
        <span>${client.qty} churros</span>
        ${client.obs ? `<small>${client.obs}</small>` : ""}
        ${client.time ? `<small>Hora: ${client.time}</small>` : ""}
      </div>
      <div class="client-actions">
        <button class="btn-deliver">
          ${client.delivered ? "Desmarcar" : "Entregado"}
        </button>
        <button class="btn-delete">Eliminar</button>
      </div>
    `;

    // Botón entregado
    card.querySelector(".btn-deliver").addEventListener("click", () => {
      update(ref(db, "clients/" + id), {
        delivered: !client.delivered
      });
    });

    // Botón eliminar
    card.querySelector(".btn-delete").addEventListener("click", () => {
      remove(ref(db, "clients/" + id));
    });

    // Separación real
    if (client.delivered) {
      deliveredList.appendChild(card);
    } else {
      pendingList.appendChild(card);
    }

  });
}


  if (!delivered) {
    onValue(configRef, (snap) => {
      const config = snap.val();
      const newStock = config.stock - qty;
      update(configRef, { stock: newStock });
    }, { onlyOnce: true });
  }
};

function calculateStats(clients) {
  onValue(configRef, (snap) => {
    const config = snap.val();
    if (!config) return;

    let totalOrders = 0;
    let pendingQty = 0;
    let deliveredQty = 0; // Sumamos los entregados
    let earned = 0;
    let pendingMoney = 0;

    Object.values(clients).forEach(client => {
      totalOrders++;
      const price = calculatePrice(client.qty, config);

      if (client.delivered) {
        earned += price;
        deliveredQty += client.qty; // Contamos los churros ya entregados
      } else {
        pendingQty += client.qty;
        pendingMoney += price;
      }
    });

    // LÓGICA DE STOCK CORREGIDA
    const totalComprometidos = pendingQty + deliveredQty;
    const stockDisponible = config.stock - totalComprometidos;

    // Actualizamos el DOM (Mostramos lo que queda y el total fabricado)
    statStock.textContent = `${stockDisponible} (de ${config.stock})`;
    
    statPendingQty.textContent = pendingQty + " uds";
    statTotalOrders.textContent = totalOrders;
    statDozens.textContent = Math.ceil(pendingQty / 12);
    statDulce.textContent = Math.ceil(pendingQty / 6);
    
    // Formateamos la plata para que se vea más profesional
    statEarned.textContent = "$" + earned.toLocaleString('es-AR');
    statPendingMoney.textContent = "$" + pendingMoney.toLocaleString('es-AR');

  }, { onlyOnce: true });
}
    statStock.textContent = config.stock;
    statPendingQty.textContent = pendingQty + " uds";
    statTotalOrders.textContent = totalOrders;
    statDozens.textContent = Math.ceil(pendingQty / 12);
    statDulce.textContent = Math.ceil(pendingQty / 6);
    statEarned.textContent = "$" + earned;
    statPendingMoney.textContent = "$" + pendingMoney;

  }, { onlyOnce: true });
}

function calculatePrice(qty, config) {
  if (qty === 12) return config.priceDozen;
  if (qty === 6) return config.priceHalf;
  return (config.priceDozen / 12) * qty;
}

// ==========================
// 🔴 TERMINAR DÍA
// ==========================

const endDayBtn = document.getElementById("end-day-btn");

endDayBtn.addEventListener("click", () => {
  const confirmDelete = confirm("¿Seguro que querés terminar el día? Se borrarán todos los pedidos.");
  if (!confirmDelete) return;

  // ¡SOLO BORRAMOS LOS CLIENTES, NO LA CONFIGURACIÓN!
  remove(ref(db, "clients"));
  alert("Día finalizado. Pedidos reiniciados.");
});
