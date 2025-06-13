// Variables globales
let debts = JSON.parse(localStorage.getItem('debts')) || [];

const debtForm = document.getElementById('debtForm');
const debtNameInput = document.getElementById('debtName');
const debtImageInput = document.getElementById('debtImage');
const debtList = document.getElementById('debtList');
const debtDayInput = document.getElementById('debtDay');

const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth(); // 0-11

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

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function addDebt(name, day, image) {
  const newDebt = {
    id: Date.now(),
    name,
    image,
    day,
    payments: {}
  };

  const key = `${currentYear}-${currentMonth}`;
  newDebt.payments[key] = false;

  debts.push(newDebt);
  saveAndUpdate();
}

function saveAndUpdate() {
  localStorage.setItem('debts', JSON.stringify(debts));
  updateUI();
}

function updateUI() {
  const currentKey = `${currentYear}-${currentMonth}`;

  debts.forEach(debt => {
    if (!debt.payments[currentKey]) {
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

    const history = document.createElement('ul');
    history.style.margin = '10px 0';

    const keys = Object.keys(debt.payments).sort((a, b) => {
      const [ya, ma] = a.split('-').map(Number);
      const [yb, mb] = b.split('-').map(Number);
      return yb * 12 + mb - (ya * 12 + ma);
    });

    keys.forEach((key, index) => {
      const [year, month] = key.split('-').map(Number);
      const monthName = new Date(year, month).toLocaleString('es-ES', { month: 'long' });

      const li = document.createElement('li');
      const paid = debt.payments[key];

      const status = document.createElement('span');
      status.textContent = `${monthName} ${year}: ${paid ? '✅ Pagado' : '❌ Sin pagar'}`;
      status.style.cursor = 'pointer';
      status.onclick = () => toggleHistoricalPayment(debt.id, key);

      const delBtn = document.createElement('button');
      delBtn.textContent = 'Eliminar';
      delBtn.style.marginLeft = '10px';
      delBtn.style.fontSize = '12px';
      delBtn.style.background = 'none';
      delBtn.style.border = 'none';
      delBtn.style.color = 'red';
      delBtn.style.cursor = 'pointer';
      delBtn.title = 'Eliminar este mes y revertir el anterior';
      delBtn.onclick = () => {
        if (confirm(`¿Eliminar ${monthName} ${year} del historial?`)) {
          deleteAndRevert(debt.id, key);
        }
      };

      li.appendChild(status);
      li.appendChild(delBtn);
      history.appendChild(li);
    });

    name.appendChild(history);

    // Mostrar próximo pago: último mes no pagado o el más reciente
    const unpaidKeys = keys.filter(k => debt.payments[k] === false);
    const lastKey = unpaidKeys.length > 0 ? unpaidKeys[0] : keys[0];
    const [lastYear, lastMonth] = lastKey.split('-').map(Number);
    const monthText = new Date(lastYear, lastMonth).toLocaleString('es-ES', { month: 'long' });

    const nextPaymentText = document.createElement('p');
    nextPaymentText.textContent = `📅 Próximo pago: ${debt.day} de ${monthText} ${lastYear}`;
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

function toggleHistoricalPayment(debtId, key) {
  debts = debts.map(d => {
    if (d.id === debtId) {
      d.payments[key] = !d.payments[key];

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

function deleteDebt(id) {
  debts = debts.filter(d => d.id !== id);
  saveAndUpdate();
}

// ✅ Nuevo comportamiento: eliminar mes y revertir anterior a ❌
function deleteAndRevert(debtId, keyToDelete) {
  debts = debts.map(debt => {
    if (debt.id === debtId) {
      const keys = Object.keys(debt.payments).sort((a, b) => {
        const [ya, ma] = a.split('-').map(Number);
        const [yb, mb] = b.split('-').map(Number);
        return yb * 12 + mb - (ya * 12 + ma);
      });

      const index = keys.indexOf(keyToDelete);
      if (index !== -1) {
        // Eliminar el mes
        delete debt.payments[keyToDelete];

        // Revertir el mes anterior (si existe)
        const previousKey = keys[index + 1];
        if (previousKey) {
          debt.payments[previousKey] = false;
        }
      }
    }
    return debt;
  });
  saveAndUpdate();
}

updateUI();
