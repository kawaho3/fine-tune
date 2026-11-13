const form = document.querySelector('#builder-form');
const promptInput = document.querySelector('#prompt');
const promptCount = document.querySelector('#prompt-count');
const generateButton = document.querySelector('#generate');
const status = document.querySelector('#status');
const preview = document.querySelector('#preview');
const download = document.querySelector('#download');
const templateLabel = document.querySelector('#template-label');
const planElement = document.querySelector('#plan');
let lastHtml = null;

function updateCount() {
  promptCount.textContent = `${promptInput.value.length} / 800`;
}
updateCount();
promptInput.addEventListener('input', updateCount);

for (const example of document.querySelectorAll('[data-prompt]')) {
  example.addEventListener('click', () => {
    promptInput.value = example.dataset.prompt;
    updateCount();
    promptInput.focus();
  });
}

function renderPlan(steps) {
  planElement.replaceChildren();
  for (const entry of steps) {
    const row = document.createElement('div');
    row.className = 'plan-step';
    const icon = document.createElement('span');
    icon.className = entry.status === 'completed' ? 'plan-done' : 'plan-pending';
    icon.textContent = entry.status === 'completed' ? '✓' : '○';
    const text = document.createElement('span');
    text.textContent = entry.step;
    row.append(icon, text);
    planElement.appendChild(row);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  generateButton.disabled = true;
  download.disabled = true;
  lastHtml = null;
  status.textContent = 'Generating a deterministic demo template…';
  status.className = 'status-text';
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptInput.value }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to generate preview.');
    const htmlFile = data.files.find((file) => file.path === 'index.html');
    if (!htmlFile || data.status !== 'mock_only') throw new Error('Unexpected mock response.');
    lastHtml = htmlFile.content;
    // sandbox="" disables scripts and same-origin access for untrusted srcdoc content.
    preview.srcdoc = lastHtml;
    templateLabel.textContent = `${data.title} · ${data.provider}`;
    renderPlan(data.plan);
    download.disabled = false;
    status.textContent = 'Mock preview created. No code was executed or saved.';
  } catch (error) {
    preview.removeAttribute('srcdoc');
    templateLabel.textContent = 'Preview unavailable';
    planElement.textContent = 'No verified output is available.';
    status.className = 'status-text error';
    status.textContent = error instanceof Error ? error.message : 'Unexpected error.';
  } finally {
    generateButton.disabled = false;
  }
});

download.addEventListener('click', () => {
  if (!lastHtml) return;
  const url = URL.createObjectURL(new Blob([lastHtml], { type: 'text/html;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'index.html';
  anchor.click();
  URL.revokeObjectURL(url);
});
