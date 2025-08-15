import { CURRENCY_CODES, type CurrencyCode } from './app/types';
import { convertAmount } from './app/api';
import { formatMoney, DomainError } from './app/domain';

// --------------------------- DOM ---------------------------
const baseSelect = document.getElementById('baseCurrency') as HTMLSelectElement | null;
const targetSelect = document.getElementById('targetCurrency') as HTMLSelectElement | null;
const amountInput = document.getElementById('amount') as HTMLInputElement | null;
const convertBtn = document.getElementById('convertBtn') as HTMLButtonElement | null;
const form = document.getElementById('converterForm') as HTMLFormElement | null;
const resultBox = document.getElementById('result') as HTMLDivElement | null;
const statusText = document.getElementById('status') as HTMLParagraphElement | null;

function assertDom<T extends Element>(el: T | null, name: string): T {
  if (!el) throw new Error(`Elemento DOM no encontrado: ${name}`);
  return el;
}
const $base = assertDom(baseSelect, 'baseCurrency');
const $target = assertDom(targetSelect, 'targetCurrency');
const $amount = assertDom(amountInput, 'amount');
const $btn = assertDom(convertBtn, 'convertBtn');
const $form = assertDom(form, 'converterForm');
const $result = assertDom(resultBox, 'result');
const $status = assertDom(statusText, 'status');

function setStatus(msg: string) { $status.textContent = msg; }
function setResult(text: string) { $result.textContent = text; }
function setLoading(loading: boolean) {
  $btn.disabled = loading;
  $btn.textContent = loading ? 'Convirtiendo…' : 'Convertir';
}

// --------------------------- UI base ---------------------------
function populateSelectsIfEmpty(symbols: readonly string[]) {
  const toOption = (code: string) => `<option value="${code}">${code}</option>`;
  if ($base.options.length === 0) {
    $base.innerHTML = symbols.map(toOption).join('');
    $base.value = 'USD';
  }
  if ($target.options.length === 0) {
    $target.innerHTML = symbols.map(toOption).join('');
    $target.value = 'COP';
  }
}

function restoreLastSelection() {
  try {
    const raw = localStorage.getItem('ui:last');
    if (!raw) return;
    const { base, target } = JSON.parse(raw) as { base?: string; target?: string };
    if (base && (CURRENCY_CODES as readonly string[]).includes(base)) $base.value = base;
    if (target && (CURRENCY_CODES as readonly string[]).includes(target)) $target.value = target;
  } catch { /* ignore */ }
}

function persistSelection() {
  try { localStorage.setItem('ui:last', JSON.stringify({ base: $base.value, target: $target.value })); } catch {}
}

function validationError(): string | null {
  const amount = Number($amount.value);
  if (!Number.isFinite(amount) || amount <= 0) return 'Ingresa un monto válido mayor que 0.';
  if ($base.value === $target.value) return 'Base y destino no pueden ser iguales.';
  return null;
}

[$base, $target].forEach(el =>
  el.addEventListener('change', () => {
    persistSelection();
    setStatus(validationError() ?? '');
  }),
);
$amount.addEventListener('input', () => setStatus(validationError() ?? ''));

// --------------------------- Submit: convertir ---------------------------
$form.addEventListener('submit', async (ev) => {
  ev.preventDefault();

  const err = validationError();
  if (err) { setStatus(err); setResult(''); return; }

  const amount = Number($amount.value);
  const base = $base.value as CurrencyCode;
  const target = $target.value as CurrencyCode;

  setLoading(true);
  setStatus('Consultando tasas…');
  setResult('');

  try {
    const out = await convertAmount(base, target, amount);
    console.debug('[convertAmount]', out); // diagnóstico útil

    if (!out.ok) {
      setStatus(`No se pudo convertir (${out.error})`);
      return;
    }

    const { rate, value, source } = out.data;
    persistSelection();

    const note = source === 'fallback-local' ? ' — (tasa estimada)' : '';
    setResult(
      `${formatMoney(amount, base)} = ${formatMoney(value, target)} (tasa ${rate.toFixed(4)}${note})`
    );
    setStatus('Listo.');
  } catch (e) {
    if (e instanceof DomainError) setStatus(`Error de datos: ${e.message}`);
    else setStatus('Ocurrió un error inesperado al convertir.');
  } finally {
    setLoading(false);
  }
});

// --------------------------- Arranque ---------------------------
populateSelectsIfEmpty(CURRENCY_CODES);
restoreLastSelection();
setStatus('Selecciona monedas e ingresa el monto para convertir.');

console.debug('[init] opciones base:', $base.options.length, 'target:', $target.options.length, 'valores:', $base.value, $target.value);
