import type { ContentSection } from "@/lib/types";

/** "Why {City} … Chimcare" block. Rendered from parsed raw_content. */
export function CityTrustSection({ section }: { section: ContentSection }) {
  return (
    <div className="section o1-intro" id="o1-intro">
      <div className="wrap">
        <div className="reveal">
          {section.heading ? <h2>{section.heading}</h2> : null}
          <div
            className="o1-trust-copy"
            dangerouslySetInnerHTML={{ __html: section.html }}
          />
        </div>
      </div>
    </div>
  );
}
