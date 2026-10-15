/** Dane strukturalne schema.org (SEO). Escapujemy "<", żeby nie dało się zamknąć tagu <script>. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
