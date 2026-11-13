/**
 * Phase-0 deterministic generator used to test an agent-shaped integration.
 * This is NOT an LLM, an autonomous coding agent, or a production code builder.
 * It performs no filesystem writes, shell commands, model calls, or deployments.
 */
export class InputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InputError';
  }
}

const MAX_PROMPT_LENGTH = 800;
const MIN_PROMPT_LENGTH = 10;

export function validatePrompt(value) {
  if (typeof value !== 'string') {
    throw new InputError('Prompt must be a string.');
  }
  const prompt = value.trim();
  if (prompt.length < MIN_PROMPT_LENGTH) {
    throw new InputError(`Prompt must contain at least ${MIN_PROMPT_LENGTH} characters.`);
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new InputError(`Prompt must contain at most ${MAX_PROMPT_LENGTH} characters.`);
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(prompt)) {
    throw new InputError('Prompt contains unsupported control characters.');
  }
  return prompt;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (symbol) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[symbol]);
}

const TEMPLATES = [
  {
    id: 'store',
    re: /\b(shop|store|ecommerce|e-commerce|products?|cart|retail)\b/i,
    name: 'Boutique Store',
    eyebrow: 'Curated essentials',
    headline: 'Thoughtful finds for everyday living.',
    description: 'Discover a considered collection of everyday favorites, designed to make the little things feel special.',
    cta: 'Explore the collection',
    highlights: [['New arrivals', 'A fresh perspective on everyday favorites.'], ['Made with care', 'Useful pieces selected thoughtfully.'], ['Timeless quality', 'Enjoy the details, year after year.']],
  },
  {
    id: 'portfolio',
    re: /\b(portfolio|designer|photograph|freelanc|creative|artist)\b/i,
    name: 'Creative Portfolio',
    eyebrow: 'Selected work · 2026',
    headline: 'Creating experiences worth remembering.',
    description: 'A collection of thoughtful ideas, crafted with imagination and care.',
    cta: 'View selected work',
    highlights: [['Brand identity', 'Expressive visual systems for bold ideas.'], ['Digital products', 'Interfaces that balance form and function.'], ['Creative direction', 'Purposeful, memorable experiences.']],
  },
  {
    id: 'dashboard',
    re: /\b(dashboard|analytics|metrics|reporting|admin|charts?)\b/i,
    name: 'Insights Dashboard',
    eyebrow: 'Your workspace at a glance',
    headline: 'Clarity for every decision.',
    description: 'Bring your most important indicators together in a calm, focused workspace.',
    cta: 'Explore insights',
    highlights: [['Performance', 'Organize what matters most.'], ['Activity', 'See a helpful summary of key updates.'], ['Progress', 'Keep important goals in view.']],
  },
  {
    id: 'restaurant',
    re: /\b(restaurant|cafe|coffee|bakery|bistro|food|menu)\b/i,
    name: 'The Neighborhood Cafe',
    eyebrow: 'Fresh, local, unforgettable',
    headline: 'A welcoming space for good moments.',
    description: 'Savor the simple pleasures: carefully prepared favorites, warm service, and good company.',
    cta: 'See the menu',
    highlights: [['Seasonal menu', 'Fresh ingredients with a creative twist.'], ['Great coffee', 'Your daily ritual, made with care.'], ['Good company', 'A cozy place to stay a little longer.']],
  },
];

const DEFAULT_TEMPLATE = {
  id: 'landing',
  name: 'Modern Landing Page',
  eyebrow: 'Welcome to what comes next',
  headline: 'Make something remarkable.',
  description: 'A simple, confident starting point for a new project, product, or idea.',
  cta: 'Get started',
  highlights: [['Simple by design', 'A focused experience from the first moment.'], ['Made to grow', 'Start small and discover what is possible.'], ['Built for people', 'Keep the things that matter front and center.']],
};

export function selectTemplate(prompt) {
  return TEMPLATES.find((template) => template.re.test(prompt)) ?? DEFAULT_TEMPLATE;
}

function buildHtml(prompt, template) {
  // Only escaped user-supplied content is inserted into the generated document.
  const request = escapeHtml(prompt);
  const cards = template.highlights.map(([heading, description], index) => `
        <article class="feature-card">
          <div class="feature-index">0${index + 1}</div>
          <h3>${escapeHtml(heading)}</h3>
          <p>${escapeHtml(description)}</p>
        </article>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(template.name)} — Static demo</title>
  <style>
    :root { color-scheme:light; font-family: system-ui, -apple-system, sans-serif; }
    * { box-sizing:border-box; }
    body { margin:0; background:#faf8f5; color:#222a2b; }
    .layout { max-width:1120px; margin:auto; padding:0 28px; }
    header { display:flex; align-items:center; justify-content:space-between; padding:34px 0; border-bottom:1px solid #dad9d3; }
    .brand { font-weight:750; font-size:19px; letter-spacing:-.05em; }
    .nav { font-size:13px; color:#59615e; }
    .pill { display:inline-block; padding:10px 18px; border:1px solid #ced7d1; border-radius:80px; font-weight:600; }
    main { padding:100px 0 72px; }
    .eyebrow { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.18em; color:#597266; }
    h1 { font-size:clamp(43px,7.8vw,84px); max-width:840px; letter-spacing:-.065em; line-height:1.03; margin:26px 0; }
    .intro { max-width:590px; font-size:19px; line-height:1.65; color:#66716c; }
    .cta { display:inline-block; margin-top:24px; padding:17px 25px; border-radius:11px; background:#204e42; color:white; font-weight:700; text-decoration:none; }
    .features { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; padding:24px 0 80px; }
    .feature-card { padding:28px; background:white; border:1px solid #e6e9e3; border-radius:18px; min-height:220px; }
    .feature-index { color:#7f9f91; font-size:13px; }
    .feature-card h3 { margin-top:42px; font-size:23px; letter-spacing:-.04em; }
    .feature-card p { font-size:14px; line-height:1.6; color:#66716c; }
    footer { border-top:1px solid #dad9d3; padding:32px 0 50px; font-size:12px; color:#66716c; }
    .notice { font-size:12px; color:#66716c; overflow-wrap:anywhere; }
    @media (max-width:720px) { .layout{padding:0 20px;} main{padding:65px 0 30px;} .features{grid-template-columns:1fr; padding-bottom:40px;} .feature-card{min-height:auto;} .feature-card h3{margin-top:24px;} }
  </style>
</head>
<body>
  <div class="layout">
    <header><div class="brand">${escapeHtml(template.name)}</div><div class="nav"><span class="pill">Demo concept</span></div></header>
    <main><div class="eyebrow">${escapeHtml(template.eyebrow)}</div><h1>${escapeHtml(template.headline)}</h1><p class="intro">${escapeHtml(template.description)}</p><a class="cta" href="#features">${escapeHtml(template.cta)}</a></main>
    <section id="features" class="features" aria-label="Highlights">${cards}
    </section>
    <footer><p>Static mock preview — no authentication, checkout, database, or backend functionality.</p><p class="notice">Original request: ${request}</p></footer>
  </div>
</body>
</html>\n`;
}

export function generateMockProject(value) {
  const prompt = validatePrompt(value);
  const template = selectTemplate(prompt);
  const html = buildHtml(prompt, template);
  return {
    status: 'mock_only',
    provider: 'deterministic-local-fixture',
    category: template.id,
    title: template.name,
    plan: [
      { step: 'Recognize a template from prompt keywords', status: 'completed' },
      { step: 'Render accessible, responsive static HTML', status: 'completed' },
      { step: 'Build, test, and connect backend services', status: 'not_implemented' },
    ],
    verification: { build: 'not_run', browser_tests: 'not_run', sandbox: 'not_configured' },
    files: [
      { path: 'index.html', content: html },
      {
        path: 'README.md',
        content: `# ${template.name}\n\nGenerated by the fine-tune **offline deterministic mock**.\n\nThis is a static demonstration template only, not a functional full-stack application or LLM result.\n\n## Run\n\nOpen index.html in a browser. No dependencies, services, or build commands are required.\n\n## Original request\n\n${prompt.replace(/\r/g, '')}\n`,
      },
    ],
  };
}
