// ---------------------------------------------------------------------------------------------
// MINNESOTA — DRAFT LOCAL LAYER FOR THE 14 BRANCH CITIES
//
// The live WordPress pages carry the business facts (address, phone, coordinates, meta) but almost
// no city-specific copy: the intro names two neighbourhoods on three pages, the "Serving Nearby
// Areas" list is "Downtown / East / West <city>", and the FAQ questions were stripped by the
// export. The distinctness gate (lib/content/assemble.ts) needs ≥4 neighbourhoods, ≥2 local
// specifics and ≥1 city FAQ before a city page may publish, so this file supplies a DRAFT of that
// layer for the branch cities only. Neighbourhood names are real places; the sentences are copy
// written for review, not facts from the extraction DB. In production this layer is produced by
// the Tier B pipeline and edited in the admin (architecture §7).
//
// Coverage cities are NOT covered here on purpose: their areas and climate lines come from their
// own live pages (scripts/build-mn-seed.mjs), and they stay "in review" until someone writes a FAQ.
// ---------------------------------------------------------------------------------------------

import type { LocalSpecifics } from '@/lib/db/schema';

export type LocalDraft = {
  neighborhoods: string[];
  localSpecifics: Partial<LocalSpecifics>;
  faqs: Array<{ question: string; answer: string }>;
};

const WEATHER = 'heavy snow load, months of sub-zero temperatures and a wet spring thaw';
const SEASON = 'before the first hard freeze';

export const localDrafts: Record<string, LocalDraft> = {
  'chimney-sweep-fireplace-in-minneapolis-mn': {
    neighborhoods: ['Uptown', 'Northeast Minneapolis', 'Linden Hills', 'Longfellow', 'North Loop', 'Powderhorn'],
    localSpecifics: {
      climate_line: 'In Minneapolis, fireplaces run hard from November through March, and sub-zero stretches mean slow, smoldering fires that leave creosote behind.',
      weather_stress: WEATHER,
      housing_line: 'From 1900s brick foursquares in Longfellow to new builds in the North Loop',
      season_line: SEASON,
    },
    faqs: [
      {
        question: 'Do you repair chimney damage caused by ice dams in Minneapolis?',
        answer: 'Yes. Ice dams force meltwater under the flashing and into the masonry, and it is one of the most common repairs we see in Minneapolis after a heavy winter. We repair the flashing and crown, replace spalled brick and recommend a cricket where the roofline needs one.',
      },
      {
        question: 'How early should I book a sweep before the Minneapolis heating season?',
        answer: 'Late summer or early fall. Once the first cold snap hits, the schedule fills quickly across the Twin Cities, and you want the flue cleared before the first fire, not after.',
      },
    ],
  },
  'chimney-sweep-fireplace-in-north-minneapolis-mn': {
    neighborhoods: ['Camden', 'Webber-Camden', 'Victory', 'Folwell', 'Jordan', 'Near North'],
    localSpecifics: {
      climate_line: 'In North Minneapolis, fireplaces and wood stoves carry many homes from November through March, and the long slow burns of a cold snap build creosote quickly.',
      weather_stress: WEATHER,
      housing_line: 'From 1920s bungalows in Victory and Webber-Camden to rehabbed two-storeys in Jordan',
      season_line: SEASON,
    },
    faqs: [
      {
        question: 'Where is the North Minneapolis crew based?',
        answer: 'Our North Minneapolis team works out of the Brooklyn Center office on Summit Drive North, a few minutes up Highway 100 from the Camden and Victory neighbourhoods.',
      },
    ],
  },
  'chimney-sweep-fireplace-in-south-minneapolis-mn': {
    neighborhoods: ['Nokomis', 'Kingfield', 'Tangletown', 'Standish', 'Hale', 'Diamond Lake'],
    localSpecifics: {
      climate_line: 'In South Minneapolis, fireplaces run from November through March, and the older masonry chimneys around Lake Nokomis feel every freeze-thaw cycle.',
      weather_stress: WEATHER,
      housing_line: 'From Tudor revivals in Tangletown to post-war ramblers around Lake Nokomis',
      season_line: SEASON,
    },
    faqs: [
      {
        question: 'My South Minneapolis chimney is original to a 1920s house. Can it still be used?',
        answer: 'Usually, after a Level 2 camera inspection. Many 1920s flues are unlined or have cracked clay tiles; a stainless liner restores a safe, code-compliant flue without rebuilding the chimney.',
      },
    ],
  },
  'chimney-sweep-fireplace-in-west-minneapolis-mn': {
    neighborhoods: ['Bryn Mawr', 'Cedar-Isles-Dean', 'Kenwood', 'Lowry Hill', 'East Isles', 'West Maka Ska'],
    localSpecifics: {
      climate_line: 'In West Minneapolis, fireplaces run from November through March, and the wind off the Chain of Lakes makes drafting problems show up fast.',
      weather_stress: WEATHER,
      housing_line: "From Kenwood's turn-of-the-century masonry to mid-century homes in Bryn Mawr and Cedar-Isles-Dean",
      season_line: SEASON,
    },
    faqs: [
      {
        question: 'Where is the West Minneapolis crew based?',
        answer: 'The West Minneapolis team works from our St. Louis Park office on West End Boulevard, just off Highway 100 and I-394, which keeps the Lakes neighbourhoods within a short drive.',
      },
    ],
  },
  'chimney-sweep-fireplace-in-st-paul-mn': {
    neighborhoods: ['Highland Park', 'Mac-Groveland', 'Como', 'Summit Hill', 'Lowertown', 'Frogtown'],
    localSpecifics: {
      climate_line: 'In St. Paul, fireplaces run from November through March, and long sub-zero stretches leave creosote behind with every slow-burning fire.',
      weather_stress: WEATHER,
      housing_line: 'From Victorian brick on Summit Hill to post-war ramblers in Highland Park',
      season_line: SEASON,
    },
    faqs: [
      {
        question: 'Do you work on the historic homes on Summit Hill and Cathedral Hill?',
        answer: 'Yes. Much of our St. Paul masonry work is on pre-1920 chimneys: matching brick and mortar colour, rebuilding crowns and relining flues so the original chimney stays in service.',
      },
    ],
  },
  'chimney-sweep-fireplace-in-edina-mn': {
    neighborhoods: ['Morningside', 'Country Club', 'Cahill', 'Indian Hills', 'Interlachen Park', 'Southdale'],
    localSpecifics: {
      climate_line: 'In Edina, fireplaces run from November through March, and the many gas inserts in the newer neighbourhoods tend to be ignored until the first cold night they will not light.',
      weather_stress: WEATHER,
      housing_line: 'From Country Club District colonials to 1960s ramblers near Southdale',
      season_line: SEASON,
    },
    faqs: [
      {
        question: 'Is the Edina office a walk-in location?',
        answer: 'Our Edina crew is based on Eden Avenue near Highway 100, but service is scheduled by phone or online; the office is a dispatch point rather than a showroom.',
      },
    ],
  },
  'chimney-sweep-fireplace-in-eden-prairie-mn': {
    neighborhoods: ['The Preserve', 'Bearpath', 'Staring Lake', 'Round Lake', 'Purgatory Creek', 'Bryant Lake'],
    localSpecifics: {
      climate_line: 'In Eden Prairie, fireplaces run from November through March, and the prefabricated chimneys common in 1980s and 1990s homes need their chase covers checked every spring.',
      weather_stress: WEATHER,
      housing_line: 'From 1970s split-levels in The Preserve to newer builds around Staring Lake',
      season_line: SEASON,
    },
    faqs: [
      {
        question: 'My Eden Prairie home has a factory-built fireplace, not masonry. Do you service those?',
        answer: 'Yes. Factory-built (prefab) fireplaces and their metal chimneys are common across Eden Prairie; we sweep and inspect them, replace rusted chase covers and caps, and repair or replace refractory panels.',
      },
    ],
  },
  'chimney-sweep-fireplace-in-maple-grove-mn': {
    neighborhoods: ['Arbor Lakes', 'Rush Creek', 'Rice Lake', 'Fish Lake', 'Weaver Lake', 'Elm Creek'],
    localSpecifics: {
      climate_line: 'In Maple Grove, fireplaces run from November through March, and the open lots north of the city take the full force of winter wind on caps and chase covers.',
      weather_stress: WEATHER,
      housing_line: 'From 1980s two-storeys near Weaver Lake to new construction around Arbor Lakes',
      season_line: SEASON,
    },
    faqs: [
      {
        question: 'Do you serve the newer developments north of Maple Grove?',
        answer: 'Yes. The Maple Grove crew on Fountains Drive covers the city and the communities north and west of it, including Rogers, Dayton, Osseo and Champlin.',
      },
    ],
  },
  'chimney-sweep-fireplace-in-lakeville-mn': {
    neighborhoods: ['Downtown Lakeville', 'Crystal Lake', 'Orchard Lake', 'Lake Marion', 'Airlake', 'Spirit of Brandtjen Farm'],
    localSpecifics: {
      climate_line: 'In Lakeville, fireplaces run from November through March, and the exposed lots on the south edge of the metro see some of the coldest nights in the Twin Cities.',
      weather_stress: WEATHER,
      housing_line: 'From 1990s two-storeys near Crystal Lake to new builds at Spirit of Brandtjen Farm',
      season_line: SEASON,
    },
    faqs: [
      {
        question: 'How far south of Lakeville do you travel?',
        answer: 'The Lakeville crew on Holyoke Avenue covers Farmington, Elko New Market, New Prague and the rural properties between them, as well as Apple Valley and Burnsville to the north.',
      },
    ],
  },
  'chimney-sweep-fireplace-in-apple-valley-mn': {
    neighborhoods: ['Cobblestone Lake', 'Diamond Path', 'Alimagnet', 'Cedar Knolls', 'Central Village', 'Farquar Lake'],
    localSpecifics: {
      climate_line: 'In Apple Valley, fireplaces run from November through March, and the 1970s and 1980s homes around Alimagnet often have their original flue liners.',
      weather_stress: WEATHER,
      housing_line: 'From 1970s split-levels near Alimagnet to newer homes around Cobblestone Lake',
      season_line: SEASON,
    },
    faqs: [
      {
        question: 'Where is the Apple Valley crew based?',
        answer: 'On Granada Avenue in the Central Village area, close to Cedar Avenue and County Road 42, which puts Rosemount, Burnsville and Eagan within a short drive.',
      },
    ],
  },
  'chimney-sweep-fireplace-in-eagan-mn': {
    neighborhoods: ['Cedar Grove', 'Blackhawk', 'Wescott', 'Thomas Lake', 'Lexington-Diffley', 'Town Centre'],
    localSpecifics: {
      climate_line: 'In Eagan, fireplaces run from November through March, and the many gas inserts installed in the 1990s are now at the age where valves and igniters fail.',
      weather_stress: WEATHER,
      housing_line: 'From 1970s Cedar Grove ramblers to 1990s two-storeys around Thomas Lake',
      season_line: SEASON,
    },
    faqs: [
      {
        question: 'Is the Eagan office near the airport?',
        answer: 'Yes. The Eagan crew is on Blue Gentian Road near the I-494 and Highway 55 interchange, which also makes Mendota Heights, Inver Grove Heights and West St. Paul quick to reach.',
      },
    ],
  },
  'chimney-sweep-fireplace-in-lake-elmo-mn': {
    neighborhoods: ['Old Village', 'Inwood', 'Wildflower', 'Eagle Point', 'Lake Jane', 'Lake Olson'],
    localSpecifics: {
      climate_line: 'In Lake Elmo, fireplaces and wood stoves run from November through March, and the larger rural lots mean more homes heating with wood than anywhere else in the east metro.',
      weather_stress: WEATHER,
      housing_line: 'From farmhouses in the Old Village to new construction in Inwood and Wildflower',
      season_line: SEASON,
    },
    faqs: [
      {
        question: 'Do you service wood stoves on the acreage properties around Lake Elmo?',
        answer: 'Yes. Wood stoves and inserts are a large share of the Lake Elmo work: sweeping stovepipe and flue, checking clearances and replacing liners for high-output stoves.',
      },
    ],
  },
  'chimney-sweep-fireplace-in-maplewood-mn': {
    neighborhoods: ['Gladstone', 'Beaver Lake', 'Battle Creek', 'Hazelwood', 'Parkside', 'Maplewood Heights'],
    localSpecifics: {
      climate_line: 'In Maplewood, fireplaces run from November through March, and the 1950s and 1960s ramblers that make up much of the city often have chimneys that have never been relined.',
      weather_stress: WEATHER,
      housing_line: 'From 1950s ramblers in Gladstone to newer homes on the Battle Creek side',
      season_line: SEASON,
    },
    faqs: [
      {
        question: 'Where is the Maplewood office?',
        answer: 'On White Bear Avenue near Maplewood Mall, which puts North St. Paul, Oakdale, White Bear Lake and the east side of St. Paul all within a few minutes.',
      },
    ],
  },
  'chimney-sweep-fireplace-in-wayzata-mn': {
    neighborhoods: ['Lake Street', 'Highcroft', 'Ferndale', 'Wayzata Bay', 'Bushaway', 'Locust Hills'],
    localSpecifics: {
      climate_line: 'In Wayzata, fireplaces run from November through March, and the wind across Lake Minnetonka is hard on caps, crowns and flashing on lakeshore homes.',
      weather_stress: WEATHER,
      housing_line: 'From lakeshore estates along Wayzata Bay to 1950s ramblers up the hill from Lake Street',
      season_line: SEASON,
    },
    faqs: [
      {
        question: 'Do you cover the other Lake Minnetonka communities from Wayzata?',
        answer: 'Yes. The Wayzata crew on Wayzata Boulevard East serves Orono, Long Lake, Minnetonka Beach, Deephaven, Excelsior and the rest of the lake communities.',
      },
    ],
  },
};
