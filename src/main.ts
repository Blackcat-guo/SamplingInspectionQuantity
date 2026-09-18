import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

const app = mount(App, { target: document.getElementById('app')! });

if (typeof (window as any).__appMounted === 'function') {
  try { (window as any).__appMounted(); } catch { /* ignore */ }
}

export default app;
