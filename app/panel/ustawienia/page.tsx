import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { User } from '@/models';
import { requestDeletion, saveSettings } from '@/lib/actions/panel';
import { ActionForm, Submit } from '@/components/Forms';
import { Icon } from '@/components/Icon';

export default async function Settings() {
  const user = await requireUser('/panel/ustawienia');
  await db();
  const u = await User.findById(user.id).lean<any>();
  return (
    <>
      <div className="panel-top"><div><span className="eyebrow">Konto</span><h1>Ustawienia</h1></div></div>
      <div className="stack">
        <div className="panel stack">
          <h3 style={{ fontSize: 16 }}>Konto Discord</h3>
          <dl className="kv">
            <dt>Nazwa</dt><dd>{u?.globalName || u?.username}</dd>
            <dt>Discord ID</dt><dd>{u?.discordId}</dd>
            <dt>E-mail</dt><dd>{u?.email || '—'}</dd>
            <dt>Konto od</dt><dd>{u?.createdAt ? new Date(u.createdAt).toLocaleDateString('pl-PL') : '—'}</dd>
          </dl>
        </div>
        <ActionForm action={saveSettings} className="panel stack" resetOnOk={false}>
          <h3 style={{ fontSize: 16 }}>Powiadomienia</h3>
          <label className="toggle" style={{ paddingInline: 0 }}>Newsletter: nowości, promocje i aktualizacje produktów<span className="sw"><input type="checkbox" name="newsletter" defaultChecked={!!u?.newsletter} /><i /></span></label>
          <Submit style={{ width: 'fit-content' }}>Zapisz</Submit>
        </ActionForm>
        <div className="panel stack">
          <h3 style={{ fontSize: 16 }}>Twoje dane (RODO)</h3>
          <p className="muted" style={{ fontSize: 14 }}>Pobierz wszystkie dane, które o Tobie przechowujemy, w formacie JSON.</p>
          <a href="/api/account/export" className="btn btn-ghost" style={{ width: 'fit-content' }}><Icon name="download" />Pobierz moje dane</a>
        </div>
        <ActionForm action={requestDeletion} className="panel stack" style={{ borderColor: 'rgba(251,113,133,.3)' }}>
          <h3 style={{ fontSize: 16, color: 'var(--bad)' }}>Usunięcie konta</h3>
          {u?.deletionRequestedAt ? (
            <div className="alert info">Wniosek złożony {new Date(u.deletionRequestedAt).toLocaleDateString('pl-PL')}. Zrealizujemy go w ciągu 30 dni.</div>
          ) : (
            <>
              <p className="muted" style={{ fontSize: 14 }}>Licencje zostaną unieważnione. Dane zamówień przechowujemy 5 lat ze względu na przepisy podatkowe. Wpisz <b>USUŃ</b>, aby potwierdzić.</p>
              <div className="field" style={{ maxWidth: 260 }}><input name="confirm" placeholder="USUŃ" aria-label="Potwierdzenie" /></div>
              <Submit className="btn btn-danger" style={{ width: 'fit-content' }}>Złóż wniosek o usunięcie</Submit>
            </>
          )}
        </ActionForm>
      </div>
    </>
  );
}
