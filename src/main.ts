import { mount } from 'svelte'
import './i18n'
import Calculator from './components/Calculator.svelte'

const app = mount(Calculator, {
  target: document.getElementById('root')!,
})

export default app
