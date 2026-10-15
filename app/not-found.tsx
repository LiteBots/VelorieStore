import Link from 'next/link';
import { Icon } from '@/components/Icon';

export default function NotFound() {
  return (
    <div className="err-page wrap">
      <span className="code-big grad">404</span>
      <h1 style={{ fontSize: 28 }}>Tej strony nie ma na mapie</h1>
      <p className="muted">Link mógł wygasnąć albo produkt został wycofany.</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <Link href="/" className="btn btn-ghost">Strona główna</Link>
        <Link href="/sklep" className="btn btn-primary">Przejdź do sklepu <Icon name="arrow" /></Link>
      </div>
    </div>
  );
}
