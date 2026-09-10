import type { ContentSection } from "@/lib/types";
import { ServiceCard } from "./ServiceCard";

/**
 * Services list. The count is whatever the source page contains — the design
 * reference showed eight, Massachusetts pages carry roughly twenty.
 */
export function ServicesSection({ section }: { section: ContentSection }) {
  return (
    <div className="section o1-svc" id="o1-services">
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <p className="eyebrow">Services</p>
            {section.heading ? <h2>{section.heading}</h2> : null}
          </div>
        </div>
        <div className="o1-list reveal" id="svc-lib">
          {section.services.map((s, i) => (
            <ServiceCard key={`${s.name}-${i}`} service={s} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
