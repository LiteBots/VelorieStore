// Przykładowe pliki konfiguracyjne i tabela zgodności na stronie produktu (port z projektu źródłowego).
import { catOf } from './catalog';
import type { ProductDTO } from './types';

const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export function cfgFor(p: ProductDTO): [string, string, string | null, string | null] {
  const c=catOf(p.cat),slug=p.id.replace(/-/g,'_');
  if(c.plat==='fivem'&&p.cat==='fivem-script')return ['config.lua',`<span class="c">-- ${esc(p.name)} v${p.version}</span>
Config = {}
Config.Framework   = <span class="s">'auto'</span>      <span class="c">-- esx | qbcore | qbox</span>
Config.Locale      = <span class="s">'pl'</span>
Config.UseOxTarget = <span class="k">true</span>
Config.Debug       = <span class="k">false</span>
Config.Cooldown    = <span class="n">900</span>        <span class="c">-- sekundy</span>`,'server.cfg',`<span class="k">set</span> velorie_key <span class="s">"VLR-XXXX-XXXX-XXXX"</span>
<span class="k">ensure</span> ox_lib
<span class="k">ensure</span> ${slug}`];
  if(c.plat==='fivem')return ['fxmanifest.lua',`fx_version <span class="s">'cerulean'</span>
game <span class="s">'gta5'</span>
this_is_a_map <span class="s">'yes'</span>
<span class="c">-- ${esc(p.name)} · ${esc(p.compat)}</span>`,'server.cfg',`<span class="k">set</span> velorie_key <span class="s">"VLR-XXXX-XXXX-XXXX"</span>
<span class="k">ensure</span> ${slug}`];
  if(p.cat==='mc-plugin')return ['config.yml',`<span class="c"># ${esc(p.name)} v${p.version}</span>
<span class="k">license-key</span>: <span class="s">"VLR-XXXX-XXXX-XXXX"</span>
<span class="k">language</span>: <span class="s">pl</span>
<span class="k">storage</span>:
  <span class="k">type</span>: <span class="s">MYSQL</span>       <span class="c"># MYSQL | MARIADB | SQLITE</span>
  <span class="k">pool-size</span>: <span class="n">10</span>`,'konsola',`<span class="c"># wrzuć .jar do /plugins i uruchom serwer</span>
&gt; ${esc(p.name.split(' ')[0].toLowerCase())} reload
<span class="k">[${esc(p.name.split(' ')[0])}]</span> Licencja aktywna · Standard · 1/1`];
  return ['instalacja.txt',`<span class="c"># ${esc(p.name)}</span>
1. Pobierz paczkę z biblioteki zakupów
2. Rozpakuj do katalogu serwera
3. Klucz VLR-XXXX-XXXX-XXXX odblokowuje aktualizacje`,null,null];
}

export function compatRows(p: ProductDTO): [string, boolean][] {
  const plat = p.plat;
  if (plat === 'fivem') {
    if (p.cat === 'fivem-script') return [['ESX Legacy 1.11', p.tech.includes('ESX')], ['QBCore 1.3', p.tech.includes('QBCore')], ['QBox', p.tech.includes('QBox')], ['Standalone', p.tech.includes('Standalone')], ['OneSync Infinity', true], ['ox_lib 3.x', true]];
    return [['GTA V build 3258', true], ['GTA V build 3095', true], ['GTA V build 2944', p.compat.includes('2944')], ['OneSync', true]];
  }
  if (plat === 'minecraft') return [['Paper 1.21.4', true], ['Folia 1.21', p.tech.includes('Folia')], ['Spigot 1.21', p.cat !== 'mc-map'], ['Purpur 1.21', true], ['Velocity 3.4', p.tech.includes('Velocity')], ['Java 21', true]];
  return [['Node.js 20', true], ['Node.js 22', true], ['Docker', true]];
}
