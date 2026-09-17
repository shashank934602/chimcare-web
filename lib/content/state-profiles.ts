/**
 * What the location hubs show for a state that has no row in `site.states`: its name and a
 * photograph taken in that state. Every photograph is a local file under `public/img/states/`.
 *
 * Sources. Minnesota's is the existing state plate. The others are Chimcare's own WordPress city
 * heroes, one per state, chosen because they show a city in THAT state — the migrated routes reuse a
 * Boston photograph on every Arizona page, so a route's own hero cannot stand for its state. WordPress
 * has no Arizona photograph at all; Arizona's is from Wikimedia Commons and carries its licence credit,
 * which the state card prints.
 */

export type StateProfile = {
  code: string;
  name: string;
  photo: string;
  photoAlt: string;
  /** Required by the photograph's licence where it is not Chimcare's own. */
  photoCredit?: string;
};

const PROFILES: Record<string, StateProfile> = {
  MA: { code: 'MA', name: 'Massachusetts', photo: '/img/states/ma.jpg', photoAlt: 'Downtown Boston, Massachusetts, at dusk' },
  AZ: {
    code: 'AZ',
    name: 'Arizona',
    photo: '/img/states/az.jpg',
    photoAlt: 'Downtown Phoenix, Arizona, with the mountains behind',
    photoCredit: 'Photo: DPPed, Wikimedia Commons, CC BY-SA 3.0',
  },
  IL: { code: 'IL', name: 'Illinois', photo: '/img/states/il.jpg', photoAlt: 'Downtown Naperville, Illinois, along the DuPage River' },
  MN: { code: 'MN', name: 'Minnesota', photo: '/img/states/mn.jpg', photoAlt: 'The Minneapolis skyline over the Mississippi River, Minnesota' },
  OH: { code: 'OH', name: 'Ohio', photo: '/img/states/oh.jpg', photoAlt: 'Playhouse Square in downtown Cleveland, Ohio' },
  GA: { code: 'GA', name: 'Georgia', photo: '/img/states/ga.webp', photoAlt: 'The Midtown Atlanta skyline, Georgia' },
  WI: { code: 'WI', name: 'Wisconsin', photo: '/img/states/wi.jpg', photoAlt: 'Milwaukee, Wisconsin, on the Lake Michigan shore' },
  // Chimcare's own WordPress photographs, each showing a city in that state.
  WA: { code: 'WA', name: 'Washington', photo: '/img/states/wa.jpg', photoAlt: 'The Seattle skyline and Space Needle with Mount Rainier, Washington' },
  OR: { code: 'OR', name: 'Oregon', photo: '/img/states/or.jpg', photoAlt: 'The Portland Oregon Old Town sign at dusk' },
  CA: { code: 'CA', name: 'California', photo: '/img/states/ca.jpg', photoAlt: 'Autumn trees reflected in Bidwell Park, Chico, California' },
  NH: { code: 'NH', name: 'New Hampshire', photo: '/img/states/nh.jpg', photoAlt: 'Downtown Nashua, New Hampshire, from above' },
  RI: { code: 'RI', name: 'Rhode Island', photo: '/img/states/ri.jpg', photoAlt: 'Downtown Providence, Rhode Island, along the river at dusk' },
  // WordPress has no photograph of these states; each is from Wikimedia Commons and carries its licence credit.
  CT: {
    code: 'CT',
    name: 'Connecticut',
    photo: '/img/states/ct.jpg',
    photoAlt: 'The downtown Hartford skyline, Connecticut',
    photoCredit: 'Photo: Quintin Soloviev, Wikimedia Commons, CC BY 4.0',
  },
  CO: {
    code: 'CO',
    name: 'Colorado',
    photo: '/img/states/co.jpg',
    photoAlt: 'The Denver skyline and the Rocky Mountains from City Park, Colorado',
    photoCredit: 'Photo: jsjgeology (Flickr), Wikimedia Commons, CC BY 2.0',
  },
  ID: {
    code: 'ID',
    name: 'Idaho',
    photo: '/img/states/id.jpg',
    photoAlt: 'Downtown Boise at sunset below the foothills, Idaho',
    photoCredit: 'Photo: Jyoni Shuler, Wikimedia Commons, CC BY-SA 4.0',
  },
  IN: {
    code: 'IN',
    name: 'Indiana',
    photo: '/img/states/in.jpg',
    photoAlt: 'The Indianapolis skyline at night, Indiana',
    photoCredit: 'Photo: Chris Bowman, Wikimedia Commons, CC BY 2.0',
  },
  MI: {
    code: 'MI',
    name: 'Michigan',
    photo: '/img/states/mi.jpg',
    photoAlt: 'The Detroit skyline across the river at sunset, Michigan',
    photoCredit: 'Photo: Michael Tighe, Wikimedia Commons, CC0',
  },
  PA: {
    code: 'PA',
    name: 'Pennsylvania',
    photo: '/img/states/pa.jpg',
    photoAlt: 'Downtown Pittsburgh from the Duquesne Incline, Pennsylvania',
    photoCredit: 'Photo: Dllu, Wikimedia Commons, CC BY-SA 4.0',
  },
  TN: {
    code: 'TN',
    name: 'Tennessee',
    photo: '/img/states/tn.jpg',
    photoAlt: 'The Nashville skyline at night over the Cumberland River, Tennessee',
    photoCredit: 'Photo: Kaldari, Wikimedia Commons, public domain',
  },
  UT: {
    code: 'UT',
    name: 'Utah',
    photo: '/img/states/ut.jpg',
    photoAlt: 'Salt Lake City and the Wasatch Range from Ensign Peak, Utah',
    photoCredit: 'Photo: Iansmh98, Wikimedia Commons, CC BY-SA 4.0',
  },
};

/** The fixed map of U.S. state names, for a state that has a route but no profile yet. */
const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts',
  MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
  NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

export function stateName(code: string): string {
  return STATE_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

/** The profile for a two-letter code, or null when the code is not a state this site lists yet. */
export function stateProfile(code: string): StateProfile | null {
  return PROFILES[code.toUpperCase()] ?? null;
}
