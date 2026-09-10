import type { CityLocationPageData } from "@/lib/types";

/**
 * Hero for a city location page. Every value comes from the validated
 * database; anything missing in the source is simply not rendered.
 */
export function CityHero({ data }: { data: CityLocationPageData }) {
  const { hero, page, localSeo } = data;
  const telHref = hero.phone ? `tel:${hero.phone.replace(/[^\d+]/g, "")}` : null;

  return (
    <div className="hero o1-hero on-dark" id="o1-hero">
      <div className="wrap">
        <div className="enter">
          <nav className="crumbs" style={{ ["--i" as string]: 0 }} aria-label="Breadcrumb">
            <a href="https://www.chimcare.com/">Home</a><span aria-hidden="true">/</span>
            <a href="/locations/">Locations</a><span aria-hidden="true">/</span>
            {page.state_page_url_path && page.state_name ? (
              <>
                <a href={page.state_page_url_path}>{page.state_name}</a>
                <span aria-hidden="true">/</span>
              </>
            ) : null}
            <span aria-current="page">{localSeo?.locality ?? page.slug}</span>
          </nav>

          {hero.eyebrow ? (
            <p className="eyebrow" style={{ ["--i" as string]: 1 }}>{hero.eyebrow}</p>
          ) : null}

          {hero.title ? <h1 style={{ ["--i" as string]: 2 }}>{hero.title}</h1> : null}

          {hero.lede ? (
            <p className="lede" style={{ ["--i" as string]: 3 }}>{hero.lede}</p>
          ) : null}

          <div className="ctas" style={{ ["--i" as string]: 4 }}>
            <a className="btn btn-primary" href="#booking">Schedule Service</a>
            {telHref && hero.phone ? (
              <a className="btn btn-outline" href={telHref}>Call {hero.phone}</a>
            ) : null}
          </div>

          {hero.address ? (
            <p className="addr" style={{ ["--i" as string]: 5 }}>{hero.address}</p>
          ) : null}

          {hero.rating ? (
            <p className="rating" style={{ ["--i" as string]: 6 }}>
              <span className="stars" aria-hidden="true">★★★★★</span> Rated <b>{hero.rating}</b>
              {hero.reviewCount ? <> from {hero.reviewCount} reviews</> : null}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
