// ==========================
// 🔥 CONFIGURAR FIREBASE AQUÍ
// ==========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// 👉 TU CONFIG DE FIREBASE
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

// Verificar si ya inició sesión
if (sessionStorage.getItem("isLoggedIn") === "true") {
  loginScreen.classList.add("hidden");
  appContainer.classList.remove("hidden");
}

loginBtn.addEventListener("click", () => {
  const pass = passwordInput.value.trim().toLowerCase();

  if (pass === "teamo") {
    sessionStorage.setItem("isLoggedIn", "true");
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

// Variables globales para no saturar la base de datos
let globalConfig = {
  priceDozen: 0,
  priceHalf: 0,
  stock: 0
};
let currentClients = {};

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
    
    globalConfig.priceDozen = data.priceDozen;
    globalConfig.priceHalf = data.priceHalf;
    globalConfig.stock = data.stock;
    
    if (Object.keys(currentClients).length > 0) {
        calculateStats(currentClients);
    }
  }
});

// ==========================
// 👥 CLIENTES
// ==========================

const clientForm = document.getElementById("client-form");
const clientsRef = ref(db, "clients");

clientForm.addEventListener("submit", (e) => {
  e.preventDefault();

 const newClient = {
    name: document.getElementById("client-name").value,
    qty: Number(document.getElementById("client-qty").value),
    zone: document.getElementById("client-zone").value, // GUARDAMOS LA ZONA
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
  currentClients = snapshot.val() || {};
  renderClients(currentClients);
  calculateStats(currentClients);
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

    // Le asignamos el barrio al HTML para poder filtrarlo después
    card.setAttribute("data-zone", client.zone || "S/Z");

    card.innerHTML = `
      <div class="client-info">
        <div style="display: flex; align-items: center; gap: 8px;">
            <strong>${client.name}</strong>
            <span style="background-color: var(--warning); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">📍 ${client.zone || 'Sin Zona'}</span>
        </div>
        <span style="color: var(--primary); font-weight: bold; margin-top: 4px;">${client.qty} churros</span>
        ${client.obs ? `<small style="color: #666;">Ref: ${client.obs}</small>` : ""}
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

    // Separación visual
    if (client.delivered) {
      deliveredList.appendChild(card);
    } else {
      pendingList.appendChild(card);
    }
  });
}

function calculateStats(clients) {
  let totalOrders = 0;
  let pendingQty = 0;
  let deliveredQty = 0; 
  let earned = 0;
  let pendingMoney = 0;

  Object.values(clients).forEach(client => {
    totalOrders++;
    const price = calculatePrice(client.qty, globalConfig); 

    if (client.delivered) {
      earned += price;
      deliveredQty += client.qty; 
    } else {
      pendingQty += client.qty;
      pendingMoney += price;
    }
  });

  const totalComprometidos = pendingQty + deliveredQty;
  const stockDisponible = globalConfig.stock - totalComprometidos;

  statStock.textContent = `${stockDisponible} (de ${globalConfig.stock})`;
  statPendingQty.textContent = pendingQty + " uds";
  statTotalOrders.textContent = totalOrders;
  statDozens.textContent = Math.ceil(pendingQty / 12);
  statDulce.textContent = Math.ceil(pendingQty / 6);
  statEarned.textContent = "$" + earned.toLocaleString('es-AR');
  statPendingMoney.textContent = "$" + pendingMoney.toLocaleString('es-AR');
}

function calculatePrice(qty, config) {
  const dozens = Math.floor(qty / 12);
  const remainderAfterDozens = qty % 12;
  
  const halfDozens = Math.floor(remainderAfterDozens / 6);
  const looseChurros = remainderAfterDozens % 6;
  
  const unitPrice = config.priceDozen / 12; 

  return (dozens * config.priceDozen) + 
         (halfDozens * config.priceHalf) + 
         (looseChurros * unitPrice);
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
// ==========================
// 📍 FILTRO DE ZONAS
// ==========================

const filterZone = document.getElementById("filter-zone");

filterZone.addEventListener("change", (e) => {
    const selectedZone = e.target.value;
    const allCards = document.querySelectorAll(".client-card"); // Seleccionamos pendientes y entregados
    
    allCards.forEach(card => {
        // Si dice "Todas" mostramos todo. Si coincide la zona, también lo mostramos.
        if (selectedZone === "Todas" || card.getAttribute("data-zone") === selectedZone) {
            card.style.display = "flex"; // Usamos flex porque las tarjetas usan flexbox
        } else {
            card.style.display = "none";
        }
    });
});
