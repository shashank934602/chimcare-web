import type { CityLocationPageData } from "@/lib/types";

/** Booking / call-to-action band. */
export function CityCTA({ data }: { data: CityLocationPageData }) {
  const phone = data.hero.phone;
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : null;
  return (
    <section className="book" id="booking">
      <div className="wrap">
        <h2>Schedule Service</h2>
        <div className="ctas">
          <a className="btn btn-primary" href="https://www.chimcare.com/contact/">
            Request a Quote
          </a>
          {telHref && phone ? (
            <a className="btn btn-outline" href={telHref}>Call {phone}</a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
