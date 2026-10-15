import { db } from '@/lib/db';
import { Seller } from '@/models';
import { ProductForm } from '@/components/admin/ProductForm';
import { AdminTop } from '@/components/admin/ui';

export default async function NewProduct() {
  await db();
  const sellers = await Seller.find().sort({ official: -1, name: 1 }).lean<any[]>();
  return (
    <>
      <AdminTop title="Nowy produkt" />
      {sellers.length ? <ProductForm sellers={sellers.map((s) => ({ slug: s.slug, name: s.name }))} /> : <div className="alert err">Najpierw dodaj twórcę (zaakceptuj zgłoszenie) albo wgraj dane demonstracyjne z pulpitu.</div>}
    </>
  );
}
