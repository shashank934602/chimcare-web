// The 12 master copy blocks for the city template, extracted from the Spokane design mock.
// Every city-specific word is a {{slot}}; see lib/content/slots.ts for the slot names.
// In production these are site.masters rows edited in the admin; the shape is the contract.

export const masterSeed: Record<string, unknown> = {
  "city_hero": {
    "eyebrow": "{{city.name}}, {{state.name}}",
    "title": "Chimney Sweep & Fireplace Services in {{city.name}}, {{state.code}}",
    "lede": "Experts in chimney sweep & chimney repairs in {{city.name}}, {{state.code}} — professional sweeping, inspection, repair and masonry, dust-free, honestly quoted and done by our own crew.",
    "figCaption": "Since 1989"
  },
  "city_intro": {
    "eyebrow": "Chimcare in {{city.name}}",
    "heading": "Top-Rated Chimney, Fireplace & Vent Solutions for Homes and Businesses Across {{city.name}}",
    "paragraphs": [
      "When it comes to chimney sweep and fireplace services in {{city.name}}, {{state.code}}, Chimcare stands out for quality, professionalism, and experience. Whether you're in a historic home in {{neighborhoods.first}} or a modern build in {{neighborhoods.second}}, our certified team delivers expert-level chimney cleaning, gas fireplace service, and chimney repair across {{city.name}} and the surrounding neighborhoods.",
      "From wood stove repair to gas fireplace installation and dryer vent cleaning, we offer comprehensive, local chimney sweep and cleaning in {{city.name}}, {{state.code}}. Trust Chimcare to keep your home safer, warmer, and more efficient — season after season."
    ],
    "cta": "Get a Quote"
  },
  "reasons": {
    "items": [
      {
        "title": "Fire safety",
        "body": "Creosote builds with every fire. Removed on schedule, it's a non-event."
      },
      {
        "title": "The air you breathe",
        "body": "A clear, sound flue keeps smoke and carbon monoxide going up and out."
      },
      {
        "title": "The structure itself",
        "body": "Maintenance is far cheaper than a rebuild — and keeps the chimney standing straight."
      }
    ]
  },
  "why_trust": {
    "eyebrow": "Why Chimcare",
    "heading": "Why {{city.name}}, {{state.code}} Homeowners Trust Chimcare",
    "paragraph": "For decades, Chimcare has been the trusted choice for chimney and fireplace repair in {{city.name}}, {{state.code}}. We bring deep knowledge of regional building codes, {{city.name}} weather, and historic homes to every project. Our licensed and insured techs use state-of-the-art tools and honest, transparent pricing to deliver reliable results — whether you need a minor fireplace cleaning or a full chimney rebuild."
  },
  "service_rows": {
    "eyebrow": "Services",
    "heading": "Chimney Sweep & Fireplace Services in {{city.name}}, {{state.code}}",
    "lede": "Eight services, each folded into a single line. Open the one you need for the full explanation — nothing has been cut from the page, it simply waits until you ask.",
    "rows": [
      {
        "key": "sweeping",
        "name": "Chimney Sweeping",
        "why": "Creosote is the fuel for chimney fires. Regular sweeping is the single most effective way to prevent one.",
        "imgAlt": "Chimney sweeping in progress — rotary brush and HEPA vacuum",
        "tone": 1,
        "short": "Creosote and soot removed with our dust-free process, so your fireplace vents safely all winter.",
        "paragraphs": [
          "A professional chimney sweep removes the creosote, soot and debris that build up every time you burn. {{local.climate_line}} That buildup is the leading cause of chimney fires. Our technicians use rotary brushes and HEPA-filtered vacuums so nothing ends up on your floors — the dust-free cleaning Chimcare is known for.",
          "Every sweep includes a visual check of the firebox, damper, smoke chamber and flue, and we'll tell you honestly if anything needs attention — and just as honestly if it doesn't."
        ],
        "included": [
          "Firebox and smoke chamber cleaning",
          "Flue brushing from cap to damper",
          "Damper operation check",
          "Visual condition report"
        ],
        "cta": "Schedule a sweep",
        "icon": "broom"
      },
      {
        "key": "inspection",
        "name": "Chimney Inspection",
        "why": "Most chimney damage is invisible from the living room. An inspection finds it before it becomes a repair — or a hazard.",
        "imgAlt": "Technician running a camera inspection of a flue",
        "tone": 2,
        "short": "A certified look at your chimney's condition — from an annual safety check to camera-assisted Level 2 and 3 inspections.",
        "paragraphs": [
          "Our inspections follow the industry's three-level standard. A Level 1 inspection covers the readily accessible parts of the system and is right for annual maintenance. A Level 2 inspection adds a video scan of the flue and is recommended when you buy or sell a home, change fuel type or after any incident.",
          "A Level 3 inspection goes beyond the surface to examine concealed areas when serious damage is suspected — after a chimney fire or a major weather event. You always receive a clear written report with photos and recommendations, not a sales pitch."
        ],
        "included": [
          "Level 1, 2 and 3 inspections",
          "Video camera scan of the flue",
          "Written report with photos",
          "Real-estate transaction inspections"
        ],
        "cta": "Book an inspection",
        "icon": "camera"
      },
      {
        "key": "repair",
        "name": "Chimney Repair",
        "why": "Small failures — a cracked crown, a stuck damper — let in water and lose heat. Fixed early, they stay small.",
        "imgAlt": "Crown and damper repair on a residential chimney",
        "tone": 3,
        "short": "From damaged flues to failing crowns and dampers, we fix the parts that keep your chimney from doing its job.",
        "paragraphs": [
          "Chimney repair in {{city.name}} has to stand up to {{local.weather_stress}}. We repair the components that fail most often — crowns, caps and chase covers, dampers, flue liners, smoke chambers, flashing and firebox surfaces — using materials rated for the job.",
          "Catching a cracked crown or a rusted damper early is what keeps a minor repair from turning into a major rebuild. We show you what we find, explain the options and quote clearly before any work starts."
        ],
        "included": [
          "Crown repair and replacement",
          "Cap and chase cover installation",
          "Damper repair and top-sealing dampers",
          "Flue, smoke chamber and firebox repair"
        ],
        "cta": "Request a repair quote",
        "icon": "wrench"
      },
      {
        "key": "masonry",
        "name": "Masonry Repair",
        "why": "Brick and mortar are the chimney's structure. When they fail, everything above and inside them is at risk.",
        "imgAlt": "Mason rebuilding a spalled brick chimney",
        "tone": 1,
        "short": "Spalling brick, crumbling mortar and structural cracks restored by masons who work on {{city.name}}'s historic homes.",
        "paragraphs": [
          "Masonry chimneys are exposed to more weather than any other part of your home. Water gets into the brick and mortar, freezes, expands and pushes the surface apart — a process called spalling. Our masonry repair restores both structural integrity and appearance.",
          "We replace cracked or missing bricks, rebuild deteriorated sections, repair footing and structural issues, and match brick, mortar color and joint profile so the repair blends in — from a few loose bricks to a full restoration of a century-old chimney in {{neighborhoods.first}}."
        ],
        "included": [
          "Brick replacement and spalling repair",
          "Crack, stucco and concrete repair",
          "Structural and footing repair",
          "Partial and full rebuilds"
        ],
        "cta": "Request a masonry quote",
        "icon": "brick"
      },
      {
        "key": "leak",
        "name": "Chimney Leak Repair",
        "why": "Water is the most common cause of chimney deterioration in {{city.name}}. Stopping it protects the masonry, the roof and the rooms below.",
        "imgAlt": "Flashing and crown sealing at the roofline",
        "tone": 2,
        "short": "We find where water is getting in — crown, flashing, cap or masonry — and stop it for good.",
        "paragraphs": [
          "Water stains on the ceiling near the fireplace, a musty smell after rain, or white mineral deposits on the brick all point to a chimney leak. Because a chimney has several possible entry points, we start with a diagnosis rather than a guess: the crown, the flashing where chimney meets roof, the cap and chase cover, and the masonry itself.",
          "Then we fix the actual source — resealing or replacing flashing, repairing the crown, installing a proper cap and applying breathable waterproofing so the problem doesn't come back next spring."
        ],
        "included": [
          "Leak diagnosis",
          "Flashing repair, sealing and installation",
          "Crown sealing and repair",
          "Waterproofing and moisture control"
        ],
        "cta": "Stop the leak",
        "icon": "drop"
      },
      {
        "key": "creosote",
        "name": "Creosote Removal",
        "why": "Glazed creosote can ignite at normal flue temperatures. Removing it is a safety job, not a cosmetic one.",
        "imgAlt": "Glazed creosote inside a flue before removal",
        "tone": 3,
        "short": "Glazed, tar-like creosote is a fire waiting to happen. We remove it safely — including stage 3 deposits.",
        "paragraphs": [
          "Creosote is the byproduct of burning wood: unburned gases condense on the cool flue walls and harden into a flammable coating. Light, flaky creosote comes off with a standard sweep. The hard, glazed stage-3 creosote found in chimneys that burn slow, smoldering fires or unseasoned wood needs specialized removal.",
          "We use rotary cleaning systems and, where needed, treatments that break the glaze down so it can be removed without damaging the liner — then show you how to burn so it builds more slowly next season."
        ],
        "included": [
          "Stage 1–3 creosote removal",
          "Smoke chamber and liner cleaning",
          "Rotary cleaning for glazed deposits",
          "Burning-habit advice"
        ],
        "cta": "Schedule creosote removal",
        "icon": "flame"
      },
      {
        "key": "flue",
        "name": "Flue Cleaning",
        "why": "A clear flue keeps smoke and carbon monoxide going up and out — not into your home.",
        "imgAlt": "Clearing a blocked flue liner from the cap",
        "tone": 1,
        "short": "Clearing the flue liner, smoke chamber and vents so smoke and gases exit the way they should.",
        "paragraphs": [
          "The flue is the passage that carries smoke and combustion gases out of your home. When it's coated with creosote or blocked by debris, nests or fallen tile, smoke backs up into the room — and carbon monoxide can follow.",
          "We clear the full length of the liner from firebox to cap, clean the smoke chamber, remove blockages and verify draft. We also service flues serving wood stoves, inserts and gas appliances."
        ],
        "included": [
          "Full-length liner cleaning",
          "Smoke chamber cleaning",
          "Blockage and nest removal",
          "Draft verification"
        ],
        "cta": "Schedule flue cleaning",
        "icon": "wind"
      },
      {
        "key": "tuckpointing",
        "name": "Tuckpointing",
        "why": "Mortar is designed to wear first. Repointing on time is how a brick chimney lasts another fifty years.",
        "imgAlt": "Repointing mortar joints on a brick chimney",
        "tone": 2,
        "short": "Deteriorated mortar joints ground out and repacked — the single best way to extend a brick chimney's life.",
        "paragraphs": [
          "Mortar is softer than brick by design, so it wears first. When joints recede, crack or crumble, water gets behind the brick and the freeze-thaw cycle takes over. Tuckpointing — also called repointing — removes the failing mortar to a proper depth and repacks the joints with new mortar matched in color, strength and profile.",
          "Done on time, it prevents brick replacement and rebuilds. Our {{city.name}} masons tuckpoint everything from a few joints near the crown to a full chimney."
        ],
        "included": [
          "Mortar removal and repacking",
          "Color and profile matching",
          "Crown and cap check",
          "Waterproofing after cure"
        ],
        "cta": "Request a tuckpointing quote",
        "icon": "joints"
      }
    ]
  },
  "solutions": {
    "eyebrow": "Full-service",
    "heading": "Our Full-Service Chimney, Fireplace & Vent Solutions in {{city.name}}, {{state.code}}",
    "lede": "Every chimney, fireplace, dryer vent and masonry service our {{city.name}} crew performs — {{services.count}} services, each handled in-house and quoted before work starts. Pick a category below to filter."
  },
  "areas": {
    "eyebrow": "Service area",
    "heading": "Your {{city.name}} Fireplace Experts",
    "lede": "Whether you're in the heart of {{city.name}} or in nearby neighborhoods, Chimcare brings trusted chimney, fireplace, and vent services throughout {{city.name}}, {{state.code}}. {{local.housing_line}} — our certified team ensures warmth, safety, and reliability, season after season.",
    "subHeading": "Serving Nearby Areas",
    "subLede": "We proudly serve {{city.name}}, {{state.code}} and the surrounding communities.",
    "cta": "Get a Quote"
  },
  "process": {
    "eyebrow": "How it works",
    "heading": "From first look to lasting protection.",
    "lede": "One crew from inspection to repair — no hand-offs, no second contractor.",
    "steps": [
      {
        "title": "Inspect",
        "body": "A certified technician examines the firebox, damper, smoke chamber and flue — with a camera when needed."
      },
      {
        "title": "Diagnose",
        "body": "We pinpoint the cause of any leak, crack or draft problem and show you on the photos."
      },
      {
        "title": "Clean or repair",
        "body": "Dust-free sweeping, or masonry, crown, flashing and liner repairs — quoted clearly before work starts."
      },
      {
        "title": "Protect",
        "body": "Caps, waterproofing and a maintenance schedule keep the repair — and your home — safe for the seasons ahead."
      }
    ]
  },
  "cost": {
    "eyebrow": "Pricing",
    "heading": "How much does chimney service cost in {{city.name}}?",
    "paragraph": "A sweep with inspection ({{price.sweep_inspection}}), an inspection on its own ({{price.inspection}}) and a gas fireplace diagnostic ({{price.gas_diagnostic}}) are priced up front in the scheduler. Repairs depend on the condition, access and what the inspection turns up — you'll approve a clear quote before work starts.",
    "factors": [
      "Condition & creosote stage",
      "Roof access",
      "Type of service",
      "Repairs needed"
    ],
    "cta": "Request a repair quote"
  },
  "faq_city": {
    "eyebrow": "FAQ",
    "heading": "Frequently Asked Questions",
    "items": [
      {
        "question": "How do I know if my chimney needs cleaning?",
        "answer": "The industry standard is an annual inspection, with a sweep whenever creosote reaches about 1/8 inch. Signs you're overdue: a strong smoky smell in the house, smoke drifting back into the room, black flakes or tar-like deposits in the firebox, or a fire that's hard to keep going. If you burn regularly through a {{city.name}} winter, plan on at least one sweep a season."
      },
      {
        "question": "What does chimney cleaning cost in {{city.name}}?",
        "answer": "A chimney sweep with inspection is {{price.sweep_inspection}} and a chimney inspection on its own is {{price.inspection}} — both can be booked directly in the scheduler above. Repair pricing depends on the condition, access and what the inspection turns up; we quote clearly before any work starts."
      },
      {
        "question": "What is creosote?",
        "answer": "Creosote is the tar-like residue left when wood smoke cools and condenses inside the flue. It builds in three stages — flaky soot, crunchy tar and hard glaze — and all three are flammable. Burning dry, seasoned wood with a hot fire produces far less creosote than slow, smoldering fires."
      },
      {
        "question": "Can I use chimney cleaning logs instead of a professional?",
        "answer": "Cleaning logs can loosen some creosote, but they don't remove it — and they can't inspect the flue, find cracks or clear blockages. Treat them as a supplement between professional sweeps, not a replacement."
      },
      {
        "question": "What areas do you serve around {{city.name}}, {{state.code}}?",
        "answer": "We serve all of {{city.name}}, {{state.code}} and nearby communities. If you are in or around {{city.name}}, our team can schedule service quickly at your home or business."
      },
      {
        "question": "Do I really need an annual chimney cleaning?",
        "answer": "Yes. In {{city.name}}, {{state.code}}, an annual chimney inspection and cleaning helps prevent creosote buildup, improves draft, reduces smoke/odor issues, and keeps your system operating safely before heating season."
      },
      {
        "question": "Do you service gas fireplaces in {{city.name}}, {{state.code}}?",
        "answer": "Absolutely. We provide gas fireplace inspections, tune-ups, repairs (ignition, pilot, valves), glass cleaning, and insert services throughout {{city.name}}, {{state.code}}."
      }
    ]
  },
  "contact": {
    "eyebrow": "Contact",
    "heading": "Contact Us",
    "paragraph": "Contact us for dust-free cleaning, an inspection or a repair quote. Our {{city.name}} crew answers, schedules and shows up.",
    "whyHeading": "Why Chimcare?",
    "why": [
      "Fast, reliable & professional — certified technicians, dust-free equipment and honest quotes.",
      "24/7 chimney services — including urgent leaks, blockages and draft failures."
    ]
  },
  "final_cta": {
    "eyebrow": "Chimcare · {{city.name}}, {{state.code}}",
    "heading": "Keep your {{city.name}} chimney safe.",
    "paragraph": "Schedule a professional inspection or service with Chimcare. Dust-free cleaning, honest quotes and repairs by our own crew.",
    "cta": "Schedule Service"
  },
  "service_page": {
    "eyebrow": "{{category.name}} · {{city.name}}, {{state.code}}",
    "title": "{{service.name}} in {{city.name}}, {{state.code}}",
    "relatedHeading": "More {{category.name}} services in {{city.name}}",
    "cityLink": "All chimney & fireplace services in {{city.name}}"
  }
};
