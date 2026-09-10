import type { ServiceItem } from "@/lib/types";

/** One service. Name and body come straight from the source content. */
export function ServiceCard({ service, index }: { service: ServiceItem; index: number }) {
  return (
    <article className="o1-row" data-service={service.name}>
      <div className="o1-row-btn">
        <span className="num">{String(index + 1).padStart(2, "0")}</span>
        <span>
          <h3 className="svc-name">{service.name}</h3>
        </span>
      </div>
      <div className="acc-panel is-open">
        <div>
          <div className="body">
            <div
              className="svc-body svc-main"
              dangerouslySetInnerHTML={{ __html: service.html }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
