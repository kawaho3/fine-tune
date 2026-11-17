const form = document.querySelector('#builder-form');
const promptInput = document.querySelector('#prompt');
const promptCount = document.querySelector('#prompt-count');
const generateButton = document.querySelector('#generate');
const status = document.querySelector('#status');
const preview = document.querySelector('#preview');
const download = document.querySelector('#download');
const downloadProject = document.querySelector('#download-project');
const templateLabel = document.querySelector('#template-label');
const planElement = document.querySelector('#plan');
let lastProject = null;
let generation = 0;
let generateController;
let exportController;

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
  const currentGeneration = ++generation;
  generateController?.abort();
  exportController?.abort();
  generateController = new AbortController();
  const prompt = promptInput.value;
  generateButton.disabled = true;
  download.disabled = true;
  downloadProject.disabled = true;
  lastProject = null;
  status.textContent = 'Generating a deterministic demo template…';
  status.className = 'status-text';
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: generateController.signal,
    });
    const data = await response.json();
    if (currentGeneration !== generation) return;
    if (!response.ok) throw new Error(data.error || 'Unable to generate preview.');
    const htmlFile = data.files.find((file) => file.path === 'index.html');
    if (!htmlFile || data.status !== 'mock_only') throw new Error('Unexpected mock response.');
    lastProject = { prompt, html: htmlFile.content };
    // sandbox="" disables scripts and same-origin access for untrusted srcdoc content.
    preview.srcdoc = lastProject.html;
    templateLabel.textContent = `${data.title} · ${data.provider}`;
    renderPlan(data.plan);
    download.disabled = false;
    downloadProject.disabled = false;
    status.textContent = 'Mock preview created. No code was executed or saved.';
  } catch (error) {
    if (currentGeneration !== generation) return;
    preview.removeAttribute('srcdoc');
    templateLabel.textContent = 'Preview unavailable';
    planElement.textContent = 'No verified output is available.';
    status.className = 'status-text error';
    status.textContent = error instanceof Error ? error.message : 'Unexpected error.';
  } finally {
    if (currentGeneration === generation) generateButton.disabled = false;
  }
});

function saveDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser time to begin reading the Blob before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

download.addEventListener('click', () => {
  if (!lastProject) return;
  saveDownload(new Blob([lastProject.html], { type: 'text/html;charset=utf-8' }), 'index.html');
});

downloadProject.addEventListener('click', async () => {
  if (!lastProject || downloadProject.disabled) return;
  const project = lastProject;
  const controller = new AbortController();
  exportController = controller;
  downloadProject.disabled = true;
  status.className = 'status-text';
  status.textContent = 'Preparing the complete static source project…';
  try {
    const response = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: project.prompt }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Unable to export project.');
    }
    if (response.headers.get('content-type') !== 'application/zip') throw new Error('Unexpected project export response.');
    const blob = await response.blob();
    if (lastProject !== project || controller.signal.aborted) return;
    saveDownload(blob, 'fine-tune-project.zip');
    status.textContent = 'Static project ZIP downloaded: index.html and README.md.';
  } catch (error) {
    if (lastProject !== project || controller.signal.aborted) return;
    status.className = 'status-text error';
    status.textContent = error instanceof Error ? error.message : 'Unable to export project.';
  } finally {
    if (lastProject === project) downloadProject.disabled = false;
  }
});
