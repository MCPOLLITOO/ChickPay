// Variables globales
let debts = JSON.parse(localStorage.getItem('debts')) || [];

const debtForm = document.getElementById('debtForm');
const debtNameInput = document.getElementById('debtName');
const debtImageInput = document.getElementById('debtImage');
const photoNameDisplay = document.getElementById('photoName');
const debtList = document.getElementById('debtList');
const debtDayInput = document.getElementById('debtDay');

const backupInput = document.getElementById('backupInput');
const backupFileNameDisplay = document.getElementById('backupFileName');
const downloadBackupBtn = document.getElementById('downloadBackupBtn');

const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth(); // 0-11

// Mostrar nombre archivo al seleccionar foto
debtImageInput.addEventListener('change', () => {
  if (debtImageInput.files.length > 0) {
    photoNameDisplay.textContent = debtImageInput.files[0].name;
  } else {
    photoNameDisplay.textContent = '';
  }
});

// Mostrar nombre archivo al seleccionar backup
backupInput.addEventListener('change', () => {
  if (backupInput.files.length > 0) {
    const file = backupInput.files[0];
    backupFileNameDisplay.textContent = `Archivo: ${file.name}`;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data)) {
          debts = data;
          saveAndUpdate();
          alert('Backup cargado con éxito.');
        } else {
          alert('Archivo inválido.');
        }
      } catch {
        alert('Error al leer el archivo.');
      }
      backupInput.value = ''; // reset input
      backupFileNameDisplay.textContent = '';
    };
    reader.readAsText(file);
  } else {
    backupFileNameDisplay.textContent = '';
  }
});

// Descargar backup con botón verde y texto negro
downloadBackupBtn.addEventListener('click', () => {
  const dataStr = JSON.stringify(debts, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_organizador_pagos_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Formulario para agregar deuda
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
  photoNameDisplay.textContent = '';
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
    img.src = debt.image || 'https://via.placeholder.com/60?text=No+Img';
    img.alt = 'Imagen deuda';

    const name = document.createElement('div');
    name.className = 'debt-info';
    name.style.textAlign = 'center';

    name.innerHTML = `<strong>${debt.name}</strong>`;

    const history = document.createElement('ul');
    history.style.listStyle = 'none';
    history.style.padding = '0';

    const keys = Object.keys(debt.payments).sort((a, b) => {
      const [ya, ma] = a.split('-').map(Number);
      const [yb, mb] = b.split('-').map(Number);
      return yb * 12 + mb - (ya * 12 + ma);
    });

    keys.forEach(key => {
      const [year, month] = key.split('-').map(Number);
      const monthName = new Date(year, month).toLocaleString('es-ES', { month: 'long' });

      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.style.margin = '4px 0';

      const paid = debt.payments[key];

      const status = document.createElement('span');
      status.textContent = `${monthName} ${year}: ${paid ? '✅ Pagado' : '❌ Sin pagar'}`;
      status.style.cursor = 'pointer';
      status.style.flexGrow = '1';
      status.style.textAlign = 'center';
      status.onclick = () => toggleHistoricalPayment(debt.id, key);

      const delBtn = document.createElement('button');
      delBtn.textContent = 'Eliminar';
      delBtn.title = 'Eliminar este mes y revertir el anterior';
      delBtn.style.color = '#f44336'; // rojo para eliminar
      delBtn.style.background = 'transparent';
      delBtn.style.border = 'none';
      delBtn.style.cursor = 'pointer';
      delBtn.style.fontWeight = 'bold';
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

    // Próximo pago: último mes no pagado o el más reciente
    const unpaidKeys = keys.filter(k => debt.payments[k] === false);
    const lastKey = unpaidKeys.length > 0 ? unpaidKeys[0] : keys[0];
    const [lastYear, lastMonth] = lastKey.split('-').map(Number);
    const monthText = new Date(lastYear, lastMonth).toLocaleString('es-ES', { month: 'long' });

    const nextPaymentText = document.createElement('p');
    nextPaymentText.textContent = `📅 Próximo pago: ${debt.day} de ${monthText} ${lastYear}`;
    nextPaymentText.style.fontSize = '14px';
    nextPaymentText.style.color = '#bbb';
    nextPaymentText.style.textAlign = 'center';

    name.appendChild(nextPaymentText);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Eliminar';
    removeBtn.title = 'Eliminar deuda';
    removeBtn.style.color = '#f44336'; // rojo eliminar
    removeBtn.style.background = 'transparent';
    removeBtn.style.border = 'none';
    removeBtn.style.cursor = 'pointer';
    removeBtn.style.fontWeight = 'bold';
    removeBtn.style.display = 'block';
    removeBtn.style.margin = '0 auto 10px auto';
    removeBtn.onclick = () => {
      if (confirm(`¿Eliminar la deuda "${debt.name}"?`)) {
        deleteDebt(debt.id);
      }
    };

    div.style.textAlign = 'center';

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

function deleteAndRevert(debtId, key) {
  debts = debts.map(d => {
    if (d.id === debtId) {
      delete d.payments[key];

      // Revert previous month to unpaid if exists
      const [year, month] = key.split('-').map(Number);
      let prevMonth = month - 1;
      let prevYear = year;
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear -= 1;
      }
      const prevKey = `${prevYear}-${prevMonth}`;
      if (d.payments[prevKey] !== undefined) {
        d.payments[prevKey] = false;
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

// Inicializar UI
updateUI();
