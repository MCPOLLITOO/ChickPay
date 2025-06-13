// Variables globales
let debts = JSON.parse(localStorage.getItem('debts')) || [];

const debtForm = document.getElementById('debtForm');
const debtNameInput = document.getElementById('debtName');
const debtImageInput = document.getElementById('debtImage');
const debtList = document.getElementById('debtList');
const debtDayInput = document.getElementById('debtDay');

// Fecha actual para identificar mes y año
const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth(); // 0-11

// Función para obtener la próxima fecha de pago no pagada
function getNextPaymentDate(payments) {
  const fechas = Object.keys(payments).map(key => {
    const [year, month] = key.split('-').map(Number);
    return { year, month, paid: payments[key] };
  });

  // Orden ascendente por año y mes
  fechas.sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));

  // Busca la primera fecha no pagada
  for (const fecha of fechas) {
    if (!fecha.paid) {
      return { year: fecha.year, month: fecha.month };
    }
  }

  // Si todo está pagado, devuelve el mes siguiente al último pago
  if (fechas.length > 0) {
    let last = fechas[fechas.length - 1];
    let nextMonth = last.month + 1;
    let nextYear = last.year;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }
    return { year: nextYear, month: nextMonth };
  }

  // Si no hay pagos, devuelve el mes actual
  const hoy = new Date();
  return { year: hoy.getFullYear(), month: hoy.getMonth() };
}

// Evento para agregar deuda
debtForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = debtNameInput.value.trim();
  const day = parseInt(debtDayInput.value);
  if (!name || !day || day < 1 || day > 31) {
    alert('Por favor ingresa un nombre válido y un día de pago entre 1 y 31.');
    return;
  }
  let image = '';

  if (debtImageInput.files.length > 0) {
    image = await toBase64(debtImageInput.files[0]);
  }

  addDebt(name, day, image);
  debtForm.reset();
});

// Función para convertir imagen a base64 para guardar en localStorage
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Agrega una nueva deuda con día y foto
function addDebt(name, day, image) {
  const newDebt = {
    id: Date.now(),
    name,
    image,
    day,
    payments: {}
  };

  // Inicializa el mes actual como sin pagar
  const key = `${currentYear}-${currentMonth}`;
  newDebt.payments[key] = false;

  debts.push(newDebt);
  saveAndUpdate();
}

// Guardar en localStorage y actualizar UI
function saveAndUpdate() {
  localStorage.setItem('debts', JSON.stringify(debts));
  updateUI();
}

// Función para actualizar la interfaz
function updateUI() {
  const currentKey = `${currentYear}-${currentMonth}`;

  debts.forEach(debt => {
    if (debt.payments[currentKey] === undefined) {
      debt.payments[currentKey] = false;
    }
  });

  debtList.innerHTML = '';

  debts.forEach(debt => {
    const div = document.createElement('div');
    div.className = 'debt';

    const img = document.createElement('img');
    img.src = debt.image || 'https://via.placeholder.com/60';
    img.alt = 'Imagen deuda';

    const name = document.createElement('div');
    name.className = 'debt-info';
    name.innerHTML = `<strong>${debt.name}</strong>`;

    // Historial mensual con botón clickeable
    const history = document.createElement('ul');
    history.style.margin = '10px 0';

    // Ordenar las claves por fecha descendente
    const keys = Object.keys(debt.payments).sort((a, b) => {
      const [ya, ma] = a.split('-').map(Number);
      const [yb, mb] = b.split('-').map(Number);
      return yb * 12 + mb - (ya * 12 + ma);
    });

    keys.forEach(key => {
      const [year, month] = key.split('-').map(Number);
      const monthName = new Date(year, month).toLocaleString('es-ES', { month: 'long' });
      const li = document.createElement('li');
      const paid = debt.payments[key];

      li.textContent = `${monthName} ${year}: ${paid ? '✅ Pagado' : '❌ Sin pagar'}`;
      li.style.cursor = 'pointer';
      li.onclick = () => toggleHistoricalPayment(debt.id, key);
      history.appendChild(li);
    });

    name.appendChild(history);

    // Mostrar próximo pago usando la función corregida
    const nextPayment = getNextPaymentDate(debt.payments);
    const monthText = new Date(nextPayment.year, nextPayment.month).toLocaleString('es-ES', { month: 'long' });

    const nextPaymentText = document.createElement('p');
    nextPaymentText.textContent = `📅 Próximo pago: ${debt.day} de ${monthText} ${nextPayment.year}`;
    nextPaymentText.style.fontSize = '14px';
    nextPaymentText.style.color = '#555';

    name.appendChild(nextPaymentText);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Eliminar';
    removeBtn.onclick = () => deleteDebt(debt.id);

    div.append(img, name, removeBtn);
    debtList.appendChild(div);
  });

  localStorage.setItem('debts', JSON.stringify(debts));
}

// Cambiar estado de pago de un mes histórico
function toggleHistoricalPayment(debtId, key) {
  debts = debts.map(d => {
    if (d.id === debtId) {
      d.payments[key] = !d.payments[key];

      // Si se marcó como pagado, genera el siguiente mes automáticamente
      if (d.payments[key]) {
        const [year, month] = key.split('-').map(Number);
        let nextMonth = month + 1;
        let nextYear = year;
        if (nextMonth > 11) {
          nextMonth = 0;
          nextYear += 1;
        }
        const nextKey = `${nextYear}-${nextMonth}`;
        if (d.payments[nextKey] === undefined) {
          d.payments[nextKey] = false;
        }
      }
    }
    return d;
  });
  saveAndUpdate();
}

// Eliminar deuda
function deleteDebt(id) {
  debts = debts.filter(d => d.id !== id);
  saveAndUpdate();
}

// Inicializar UI al cargar
updateUI();
