import { addInteraction, generateProposal, parseRequirements } from './sales-engine.mjs';

export const integrationRegistry = [
  { id: 'crm', label: 'CRM', mode: 'Browser-local adapter', connected: false },
  { id: 'catalog', label: 'Product catalog', mode: 'Illustrative industrial catalog', connected: false },
  { id: 'inventory', label: 'Data sources and delivery planning', mode: 'Example readiness adapter', connected: false },
  { id: 'email', label: 'Email', mode: 'Not connected', connected: false },
  { id: 'whatsapp', label: 'Business WhatsApp', mode: 'Not connected', connected: false },
  { id: 'language-model', label: 'Language model', mode: 'Local extraction rules', connected: false },
  { id: 'proposal-service', label: 'Gamma or proposal provider', mode: 'Local HTML template', connected: false },
  { id: 'workflow-automation', label: 'n8n workflows', mode: 'Not connected', connected: false }
];

export function createDemoAdapters(readState) {
  const current = () => typeof readState === 'function' ? readState() : readState;
  return {
    interpretation: {
      name: 'Local extraction rules',
      connected: false,
      run(text, options) {
        const state = current();
        return parseRequirements(text, {
          accounts: state.accounts,
          products: state.products,
          today: (options && options.today)
        });
      }
    },
    catalog: {
      name: 'Illustrative industrial catalog',
      connected: false,
      lookup(productId) {
        return current().products.find(item => item.id === productId) || null;
      },
      matchText(text) {
        const state = current();
        const parsed = parseRequirements(text, { accounts: state.accounts, products: state.products });
        return parsed.productId ? state.products.find(item => item.id === parsed.productId) || null : null;
      }
    },
    inventory: {
      name: 'Site readiness and delivery capacity example',
      connected: false,
      availability(productId) {
        const product = current().products.find(item => item.id === productId) || null;
        if (!product) return { status: 'Unknown', confirmed: false, source: null };
        if (product.stock) return { ...product.stock, confirmed: false };
        if (product.capacity) return { ...product.capacity, confirmed: false };
        return { status: 'Not applicable', confirmed: false, source: product.pricingSource };
      },
    },
    crm: {
      name: 'Browser-local CRM records',
      connected: false,
      recordInteraction(accountId, summary, options) {
        return addInteraction(current(), accountId, summary, options);
      },
      recordEvent(event) {
        const state = current();
        state.events.unshift({ id: 'EV-' + String(state.events.length + 1).padStart(5, '0'), at: event.at || new Date().toISOString(), actor: event.actor || 'CRM Operations Agent', ...event });
        return state.events[0];
      }
    },
    proposal: {
      name: 'Local HTML proposal template',
      connected: false,
      generate(quoteId, options) {
        return generateProposal(current(), quoteId, options);
      }
    },
    external: {
      email: { connected: false, send() { throw new Error('Email is not connected. Record a draft or follow-up in the local workspace.'); } },
      whatsapp: { connected: false, send() { throw new Error('Business WhatsApp is not connected. No message was sent.'); } },
      erp: { connected: false, lookup() { throw new Error('Industrial data sources and delivery systems are represented by example records.'); } },
      languageModel: { connected: false, run() { throw new Error('No external language model provider is configured.'); } },
      gamma: { connected: false, generate() { throw new Error('No external proposal provider is configured.'); } },
      n8n: { connected: false, run() { throw new Error('No external workflow automation connection is configured.'); } }
    }
  };
}
