import Link from 'next/link';
import { Logo } from './Nav';
import { Icon } from './Icon';
import { CookieSettingsLink, NewsletterForm } from './FooterBits';
import { SITE } from '@/lib/site';

const SOCIAL = {
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.7 15.1V8.9l5.8 3.1z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 2h-3.4v13.4a3 3 0 1 1-3-3c.3 0 .6 0 .9.1V9a6.4 6.4 0 1 0 5.5 6.3V8.6a8 8 0 0 0 4.7 1.5V6.7a4.7 4.7 0 0 1-4.7-4.7z"/></svg>',
  github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5z"/></svg>',
};

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site">
      <div className="wrap">
        <div className="foot">
          <div>
            <Link href="/" className="logo"><Logo /></Link>
            <p className="muted" style={{ marginTop: 16, maxWidth: '42ch', fontSize: 14 }}>
              Marketplace pluginów, skryptów, map i interiorów dla serwerów Minecraft i FiveM. Kupuj gotowe rozwiązania od Velorie Studio albo sprzedawaj własne.
            </p>
            <NewsletterForm />
            <div className="socials">
              <a href={SITE.discordInvite} target="_blank" rel="noopener noreferrer" aria-label="Discord"><Icon name="discord" /></a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube" dangerouslySetInnerHTML={{ __html: SOCIAL.youtube }} />
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok" dangerouslySetInnerHTML={{ __html: SOCIAL.tiktok }} />
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub" dangerouslySetInnerHTML={{ __html: SOCIAL.github }} />
            </div>
          </div>
          <div><h4>Minecraft</h4><ul>
            <li><Link href="/kategoria/mc-plugin">Pluginy</Link></li>
            <li><Link href="/kategoria/mc-map">Mapy i lobby</Link></li>
            <li><Link href="/kategoria/mc-setup">Gotowe setupy</Link></li>
            <li><Link href="/kategoria/mc-pack">Resource packi</Link></li>
          </ul></div>
          <div><h4>FiveM</h4><ul>
            <li><Link href="/kategoria/fivem-script">Skrypty</Link></li>
            <li><Link href="/kategoria/fivem-mlo">Interiory MLO</Link></li>
            <li><Link href="/kategoria/fivem-map">Mapy YMAP</Link></li>
            <li><Link href="/kategoria/fivem-vehicle">Pojazdy</Link></li>
          </ul></div>
          <div><h4>Twórcy</h4><ul>
            <li><Link href="/sprzedawaj">Sprzedawaj na Velorie</Link></li>
            <li><Link href="/panel/tworca">Panel twórcy</Link></li>
            <li><Link href="/tworca/velorie">Velorie Studio</Link></li>
            <li><Link href="/licencje">System licencji</Link></li>
            <li><Link href="/o-nas">O nas</Link></li>
          </ul></div>
          <div><h4>Pomoc</h4><ul>
            <li><Link href="/licencje">Sprawdź licencję</Link></li>
            <li><Link href="/panel/zakupy">Moje zakupy</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
            <li><Link href="/kontakt">Kontakt</Link></li>
            <li><span className="mono" style={{ fontSize: 12.5 }}>{SITE.company.email}</span></li>
          </ul></div>
        </div>
        <div className="foot-b">
          <div className="pay-row">
            {['BLIK', 'Przelewy24', 'VISA', 'Mastercard', 'Stripe'].map((p) => <span key={p} className="pay">{p}</span>)}
          </div>
          <span>© {year} {SITE.name} · {SITE.company.name}</span>
        </div>
        <div className="foot-b" style={{ borderTop: 0, paddingTop: 0 }}>
          <span>Minecraft jest znakiem towarowym Mojang AB. FiveM jest znakiem Cfx.re. Velorie Market nie jest z nimi powiązany.</span>
          <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/regulamin">Regulamin</Link>·<Link href="/polityka-prywatnosci">Prywatność</Link>·<Link href="/polityka-cookies">Cookies</Link>·<Link href="/zwroty">Zwroty</Link>·<CookieSettingsLink />
          </span>
        </div>
      </div>
    </footer>
  );
}
