import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Product, Seller, License } from '@/models';
import { deleteProduct } from '@/lib/actions/admin';
import { ProductForm } from '@/components/admin/ProductForm';
import { AdminTop } from '@/components/admin/ui';
import Link from 'next/link';

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/.test(id)) notFound();
  await db();
  const [p, sellers] = await Promise.all([Product.findById(id).select('+downloadUrl').lean<any>(), Seller.find().lean<any[]>()]);
  if (!p) notFound();
  const lics = await License.countDocuments({ productSlug: p.slug });
  const plain = JSON.parse(JSON.stringify({ ...p, _id: String(p._id), downloadUrl: undefined }));
  return (
    <>
      <AdminTop title={`Edycja: ${p.name}`}>
        <Link href={`/produkt/${p.slug}`} className="btn btn-ghost btn-sm">Zobacz w sklepie</Link>
        <form action={deleteProduct}><input type="hidden" name="id" value={id} /><button className="btn btn-danger btn-sm">{lics ? 'Wycofaj (ukryj)' : 'Usuń'}</button></form>
      </AdminTop>
      <p className="muted" style={{ marginBottom: 12, fontSize: 13.5 }}>Licencje: {lics} · Plik do pobrania: {p.downloadUrl ? 'ustawiony' : 'brak'}</p>
      <ProductForm p={plain} sellers={sellers.map((s) => ({ slug: s.slug, name: s.name }))} />
    </>
  );
}
