/**
 * Punto de entrada: aquí solo hacemos el “wiring” de la UI.
 * Más adelante separaremos en módulos: api.ts, domain.ts, storage.ts, ui.ts.
 */

// Tipado explícito de elementos del DOM
const baseSelect = document.getElementById('baseCurrency') as HTMLSelectElement | null;
const targetSelect = document.getElementById('targetCurrency') as HTMLSelectElement | null;
const amountInput = document.getElementById('amount') as HTMLInputElement | null;
const convertBtn = document.getElementById('convertBtn') as HTMLButtonElement | null;
const form = document.getElementById('converterForm') as HTMLFormElement | null;
const resultBox = document.getElementById('result') as HTMLDivElement | null;
const statusText = document.getElementById('status') as HTMLParagraphElement | null;

// Verificación defensiva (útil en TS estricto)
function assertDom<T extends Element>(el: T | null, name: string): T {
  if (!el) throw new Error(`Elemento DOM no encontrado: ${name}`);
  return el;
}

const $base = assertDom(baseSelect, 'baseCurrency');
const $target = assertDom(targetSelect, 'targetCurrency');
const $amount = assertDom(amountInput, 'amount');
const $form = assertDom(form, 'converterForm');
const $result = assertDom(resultBox, 'result');
const $status = assertDom(statusText, 'status');

// Monedas iniciales mínimas (luego las poblará la API)
const DEFAULT_SYMBOLS = ['USD', 'EUR', 'COP', 'JPY', 'GBP'] as const;

// Rellena selects con opciones básicas (placeholder)
function populateSelects(symbols: readonly string[]) {
  const toOption = (code: string) => `<option value="${code}">${code}</option>`;
  $base.innerHTML = symbols.map(toOption).join('');
  $target.innerHTML = symbols.map(toOption).join('');
  // Valores por defecto iniciales
  $base.value = 'USD';
  $target.value = 'COP';
}

function setStatus(msg: string) {
  $status.textContent = msg;
}

function setResult(text: string) {
  $result.textContent = text;
}

// Evento submit (por ahora solo valida entrada)
$form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const amount = Number($amount.value);

  if (!Number.isFinite(amount) || amount <= 0) {
    setStatus('Ingresa un monto válido mayor que 0.');
    setResult('');
    return;
  }

  // En Fase 3 conectaremos con la API y el dominio para convertir.
  setStatus('Listo para convertir (API se integrará en la siguiente fase).');
  setResult(`Convertir ${amount} ${$base.value} → ${$target.value}`);
});

// Inicialización de la UI
populateSelects(DEFAULT_SYMBOLS);
setStatus('Selecciona monedas e ingresa el monto para convertir.');
