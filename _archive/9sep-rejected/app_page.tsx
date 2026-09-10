import { getCitySlugs } from "@/lib/queries";

/** Pilot index — lists whatever the validated database contains. */
export const dynamic = "force-dynamic";

export default async function Home() {
  const slugs = await getCitySlugs();
  return (
    <main id="main">
      <div className="wrap" style={{ padding: "4rem 0" }}>
        <h1>Chimcare — Massachusetts pilot</h1>
        <p>{slugs.length} validated city location pages.</p>
        <ul>
          {slugs.map((s) => (
            <li key={s}><a className="link" href={`/location/${s}/`}>/location/{s}/</a></li>
          ))}
        </ul>
      </div>
    </main>
  );
}
