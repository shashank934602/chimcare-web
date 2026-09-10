import type { CityLocationPageData } from "@/lib/types";

/**
 * Business/contact details, strictly from local_seo. Missing stays missing.
 *
 * `hours_specification` is a PHP-serialized array. It is decoded for display —
 * rendering it raw printed `a:1:{i:0;a:12:{s:4:"days";…}}` on the page, which
 * production never does, and the unbreakable string also forced 415px of
 * horizontal overflow. If it cannot be decoded, nothing is shown.
 */
export function CityContact({ data }: { data: CityLocationPageData }) {
  const l = data.localSeo;
  if (!l) return null;
  // The stored fields hold Schema Pro mapping tokens, not display values.
  const r = data.resolvedLocalSeo;
  const phone = r.telephone ?? l.contact_phone;
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : null;
  const address =
    l.geo_formatted_address ??
    [l.street, l.locality, l.region, l.postal_code].filter(Boolean).join(", ");

  return (
    <div className="section o1-contact" id="o1-contact">
      <div className="wrap">
        <div className="o1-contact-body">
          <h2 className="sr-only-heading">Location details</h2>

          {address ? <address className="addr">{address}</address> : null}

          {telHref && phone ? (
            <p><a className="link" href={telHref}>{phone}</a></p>
          ) : null}

          {data.openingHours.length > 0 ? (
            <ul className="o1-hours">
              {data.openingHours.map((h, i) => (
                <li key={i}>
                  {h.days.length > 0 ? <span className="days">{h.days.join(", ")}</span> : null}
                  {h.opens && h.closes ? (
                    <span className="time"> {h.opens}–{h.closes}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {r.business_url ? (
            <p className="o1-contact-url">
              <a className="link" href={r.business_url}>{r.business_url}</a>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
