import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { CookieSettingsLink } from '@/components/FooterBits';

export const metadata: Metadata = { title: 'Polityka cookies', description: 'Pliki cookie i pamięć lokalna w Velorie Market.', alternates: { canonical: '/polityka-cookies' } };

const ROWS: [string, string, string, string][] = [
  ['next-auth.session-token / __Secure-next-auth.session-token', 'Niezbędne', 'Utrzymanie zalogowania (szyfrowany token JWT, httpOnly)', '30 dni'],
  ['next-auth.csrf-token, next-auth.callback-url', 'Niezbędne', 'Ochrona logowania przed atakami CSRF', 'sesja'],
  ['vlr_consent', 'Niezbędne', 'Zapamiętanie Twojego wyboru dotyczącego cookies', '180 dni'],
  ['velorie_cart, velorie_wish (localStorage)', 'Niezbędne', 'Koszyk i lista ulubionych w tej przeglądarce', 'do usunięcia'],
  ['velorie_ann (localStorage)', 'Funkcjonalne', 'Ukrycie paska z ogłoszeniem', 'do usunięcia'],
];

export default function Cookies() {
  return (
    <LegalPage title="Polityka cookies" toc={[['co', 'Czym są cookies'], ['lista', 'Lista'], ['zarzadzanie', 'Zarządzanie']]}>
      <h2 id="co">Czym są pliki cookie</h2>
      <p>Pliki cookie to małe pliki zapisywane w przeglądarce. Używamy ich oraz pamięci lokalnej (localStorage), żeby logowanie, koszyk i bezpieczeństwo działały poprawnie. Cookies analityczne i marketingowe są ładowane wyłącznie po Twojej zgodzie.</p>
      <h2 id="lista">Lista plików</h2>
      <div className="tbl-wrap" style={{ marginBottom: 16 }}>
        <table>
          <thead><tr><th>Nazwa</th><th>Rodzaj</th><th>Cel</th><th>Czas</th></tr></thead>
          <tbody>{ROWS.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i} style={{ whiteSpace: 'normal' }}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <h2 id="zarzadzanie">Zarządzanie zgodą</h2>
      <p>Zgodę możesz zmienić w każdej chwili: <CookieSettingsLink />. Możesz też usunąć cookies w ustawieniach przeglądarki — wtedy wylogujemy Cię, a koszyk się wyczyści.</p>
    </LegalPage>
  );
}
