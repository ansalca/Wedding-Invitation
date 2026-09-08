/* A Qur'anic ayah or dua: Arabic, translation, attribution. */
export default function Verse({ ar, tr, src }) {
  return (
    <blockquote className="verse">
      <p className="verse__ar arabic reveal" lang="ar" dir="rtl">{ar}</p>
      <p className="verse__tr reveal reveal-d1">{tr}</p>
      <cite className="verse__src reveal reveal-d2">— {src}</cite>
    </blockquote>
  );
}
