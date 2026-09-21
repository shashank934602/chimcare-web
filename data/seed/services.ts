// Generated from the Spokane design mock by scripts in the migration repo; city-specific words are slots.
// In production this comes from site.service_categories / site.services (seeded from the extraction DB).

export const serviceCategorySeed = [
  {
    "key": "sweep",
    "name": "Chimney Sweep",
    "sort": 0,
    "tileImageKey": "img/tile-sweep.jpg",
    "tileImageAlt": "Chimcare technician sweeping a chimney from the roof",
    "rowKey": "sweeping",
    "bookingService": "sweep"
  },
  {
    "key": "inspection",
    "name": "Chimney Inspection",
    "sort": 1,
    "tileImageKey": "img/tile-inspection.jpg",
    "tileImageAlt": "Technician inspecting a fireplace and documenting findings",
    "rowKey": "inspection",
    "bookingService": "inspect"
  },
  {
    "key": "repair",
    "name": "Chimney Repair",
    "sort": 2,
    "tileImageKey": "img/tile-repair.jpg",
    "tileImageAlt": "Mason repairing a masonry chimney on a rooftop",
    "rowKey": "repair",
    "bookingService": "quote"
  },
  {
    "key": "gas",
    "name": "Gas Fireplace Service",
    "sort": 3,
    "tileImageKey": "img/tile-gas.jpg",
    "tileImageAlt": "Serviced gas fireplace burning behind a screen",
    "rowKey": null,
    "bookingService": "gas"
  },
  {
    "key": "gas-inserts",
    "name": "Gas Fireplace Inserts",
    "sort": 4,
    "tileImageKey": "img/tile-gas-inserts.jpg",
    "tileImageAlt": "Gas fireplace insert set into a stone surround",
    "rowKey": null,
    "bookingService": "quote"
  },
  {
    "key": "wood-inserts",
    "name": "Wood Burning Inserts",
    "sort": 5,
    "tileImageKey": "img/tile-wood-inserts.jpg",
    "tileImageAlt": "Wood burning insert with a fire lit in a brick hearth",
    "rowKey": null,
    "bookingService": "quote"
  },
  {
    "key": "caps",
    "name": "Chimney Caps",
    "sort": 6,
    "tileImageKey": "img/tile-caps.jpg",
    "tileImageAlt": "Stainless chimney cap fitted to a masonry flue",
    "rowKey": "leak",
    "bookingService": "quote"
  },
  {
    "key": "outdoor",
    "name": "Outdoor Fireplaces",
    "sort": 7,
    "tileImageKey": "img/tile-outdoor.jpg",
    "tileImageAlt": "Outdoor masonry fireplace built into a patio",
    "rowKey": null,
    "bookingService": "quote"
  }
];

export const serviceSeed = [
  {
    "key": "dryer-vent-cleaning",
    "name": "Dryer Vent Cleaning",
    "category": "sweep",
    "sort": 0,
    "cardCopyTemplate": "Ensure optimal dryer performance and safety with professional dryer vent cleaning in {{city.name}}, {{state.code}}. Removing lint buildup helps reduce fire risks, improve drying efficiency, and extend the life of your appliance. Schedule this vital service today."
  },
  {
    "key": "chimney-nest-removal",
    "name": "Chimney Nest Removal",
    "category": "sweep",
    "sort": 1,
    "cardCopyTemplate": "Ensure safe and efficient operation of your chimney with nest removal services in {{city.name}}, {{state.code}}. We remove blockages caused by birds and animals, restoring proper airflow and reducing fire risks. Schedule today for quick, effective service."
  },
  {
    "key": "chimney-cleaning",
    "name": "Chimney Cleaning",
    "category": "sweep",
    "sort": 2,
    "cardCopyTemplate": "Keep your home safe and your fireplace efficient with thorough chimney cleaning in {{city.name}}, {{state.code}}. We remove soot, creosote, and blockages, ensuring improved airflow and performance. Schedule service today."
  },
  {
    "key": "fireplace-cleaning",
    "name": "Fireplace Cleaning",
    "category": "sweep",
    "sort": 3,
    "cardCopyTemplate": "Enjoy a clean and efficient hearth with fireplace cleaning in {{city.name}}, {{state.code}}. We remove soot and residue to improve air quality and maintain system performance. Schedule service today."
  },
  {
    "key": "chimney-animal-removal",
    "name": "Chimney Animal Removal",
    "category": "sweep",
    "sort": 4,
    "cardCopyTemplate": "Protect your home from unwanted intrusions with humane chimney animal removal services in {{city.name}}, {{state.code}}. Our experts safely remove birds, raccoons, and squirrels while preventing future nesting. Call us today for peace of mind."
  },
  {
    "key": "chimney-sweep",
    "name": "Chimney Sweep",
    "category": "sweep",
    "sort": 5,
    "cardCopyTemplate": "Keep your chimney clean and safe with professional chimney sweep services in {{city.name}}, {{state.code}}. Regular sweeps remove creosote and debris, reducing the risk of fires and ensuring efficient venting. Let us help you maintain a safer, warmer home."
  },
  {
    "key": "chimney-ash-pit-cleaning",
    "name": "Chimney Ash Pit Cleaning",
    "category": "sweep",
    "sort": 6,
    "cardCopyTemplate": "Improve fireplace efficiency and safety with detailed chimney ash pit cleaning in {{city.name}}, {{state.code}}. We clean out built-up debris, reducing fire hazards and enhancing system performance. Schedule service today."
  },
  {
    "key": "chimney-smoke-chamber-cleaning",
    "name": "Chimney Smoke Chamber Cleaning",
    "category": "sweep",
    "sort": 7,
    "cardCopyTemplate": "Improve fireplace safety and efficiency with chimney smoke chamber cleaning in {{city.name}}, {{state.code}}. Our thorough cleanings remove blockages and creosote buildup for safer fires. Schedule service today."
  },
  {
    "key": "chimney-blockage-removal",
    "name": "Chimney Blockage Removal",
    "category": "sweep",
    "sort": 8,
    "cardCopyTemplate": "Clear out obstructions with our chimney blockage removal in {{city.name}}, {{state.code}}. From animal nests to soot buildup, blockages can compromise airflow and safety. We restore proper venting to protect both your comfort and indoor air quality."
  },
  {
    "key": "chimney-liner-maintenance",
    "name": "Chimney Liner Maintenance",
    "category": "sweep",
    "sort": 9,
    "cardCopyTemplate": "Enhancing safety and efficiency, chimney liner maintenance in {{city.name}}, {{state.code}} is vital for homes facing harsh winter conditions. Regular upkeep safeguards against moisture intrusion and ensures your fireplace operates within code compliance. Schedule service today."
  },
  {
    "key": "chimney-liner-cleaning",
    "name": "Chimney Liner Cleaning",
    "category": "sweep",
    "sort": 10,
    "cardCopyTemplate": "Maintain your chimney’s performance with professional chimney liner cleaning services in {{city.name}}, {{state.code}}. Removing creosote buildup enhances airflow, improves safety, and reduces fire risks. Reach out today to schedule regular maintenance."
  },
  {
    "key": "chimney-vent-cleaning",
    "name": "Chimney Vent Cleaning",
    "category": "sweep",
    "sort": 11,
    "cardCopyTemplate": "Clogged vents compromise airflow and safety. Our thorough chimney vent cleaning services in {{city.name}}, {{state.code}} remove debris and improve performance. Ensure safe and efficient venting in your home—book professional cleaning with us today."
  },
  {
    "key": "chimney-preventive-maintenance",
    "name": "Chimney Preventive Maintenance",
    "category": "sweep",
    "sort": 12,
    "cardCopyTemplate": "Extend the life of your chimney with regularly scheduled preventive maintenance in {{city.name}}, {{state.code}}. From inspections to cleanings, our services maximize efficiency and safety. Protect your chimney—book maintenance today."
  },
  {
    "key": "chimney-odor-removal",
    "name": "Chimney Odor Removal",
    "category": "sweep",
    "sort": 13,
    "cardCopyTemplate": "Eliminate unwanted odors from your chimney with our professional odor removal services in {{city.name}}, {{state.code}}. We address the root cause—be it buildup, moisture, or nesting material—to restore a fresh, clean atmosphere. Schedule your service today."
  },
  {
    "key": "air-duct-cleaning",
    "name": "Air Duct Cleaning",
    "category": "sweep",
    "sort": 14,
    "cardCopyTemplate": "Improve indoor air quality and HVAC efficiency with air duct cleaning in {{city.name}}, {{state.code}}. Removing dust and allergens benefits homes with pets, allergies, or aging systems. Keep your home healthier—schedule air duct cleaning now."
  },
  {
    "key": "chimney-sweep-repair",
    "name": "Chimney Sweep Repair",
    "category": "sweep",
    "sort": 15,
    "cardCopyTemplate": "When it comes to chimney sweep and fireplace services in {{city.name}}, {{state.code}}, Chimcare stands out for quality, professionalism, and experience."
  },
  {
    "key": "dryer-duct-cleaning",
    "name": "Dryer Duct Cleaning",
    "category": "sweep",
    "sort": 16,
    "cardCopyTemplate": "Dryer duct cleaning is the thorough removal of lint, dust, and debris from the exhaust duct that carries moist air from your clothes dryer to the outdoors. For homeowners in {{city.name}}, {{state.code}}, this service is essential."
  },
  {
    "key": "chimney-cleaning-maintenance-services",
    "name": "Chimney Cleaning Maintenance Services",
    "category": "sweep",
    "sort": 17,
    "cardCopyTemplate": "Chimney systems work hard in {{city.name}}’s four-season climate, channeling smoke, soot, and combustion gases safely out of your home."
  },
  {
    "key": "chimney-sweep-services",
    "name": "Chimney Sweep Services",
    "category": "sweep",
    "sort": 18,
    "cardCopyTemplate": "Ensuring the safety and efficiency of your fireplace starts with professional chimney sweep services in {{city.name}}, {{state.code}}. With the seasonal temperature variations and the popularity of fireplaces in homes across {{city.name}}, maintaining a clean and functional chimney is crucial."
  },
  {
    "key": "duct-cleaning",
    "name": "Duct Cleaning",
    "category": "sweep",
    "sort": 19,
    "cardCopyTemplate": "Clean, well-maintained air ducts are the backbone of a healthy and efficient home. Duct cleaning in {{city.name}}, {{state.code}} removes built-up dust, pollen, pet dander, and construction debris from the supply and return runs that carry heated and cooled air throughout your house."
  },
  {
    "key": "smoke-chamber-cleaning",
    "name": "Smoke Chamber Cleaning",
    "category": "sweep",
    "sort": 20,
    "cardCopyTemplate": "Keeping your fireplace in peak condition often starts with regular maintenance, and smoke chamber cleaning is a vital part of that process. This essential service ensures optimal performance and safety for your chimney system, especially in {{city.name}}, {{state.code}}, where wood-burning fireplaces are a popular feature in many homes."
  },
  {
    "key": "chimney-deep-cleaning-pcr",
    "name": "Chimney Deep Cleaning Pcr",
    "category": "sweep",
    "sort": 21,
    "cardCopyTemplate": "Chimney deep cleaning is an essential service for homeowners in {{city.name}}, {{state.code}}, ensuring the efficiency and safety of your fireplace or wood-burning stove."
  },
  {
    "key": "local-chimney-sweep-and-cleaning",
    "name": "Local Chimney Sweep and Cleaning",
    "category": "sweep",
    "sort": 22,
    "cardCopyTemplate": "A clean and well-maintained chimney is crucial for the safety and efficiency of your home, especially in a climate like {{city.name}}, {{state.code}}, where chilly, damp weather leads many residents to rely on their fireplaces throughout much of the year."
  },
  {
    "key": "chimney-sweep-near-me",
    "name": "Chimney Sweep near Me",
    "category": "sweep",
    "sort": 23,
    "cardCopyTemplate": "Searching for trusted fireplace and flue care? If you’re typing “Chimney Sweep Near Me {{city.name}} MA,” you want a local expert who understands our lakeside climate, older masonry, and seasonal wood-burning habits."
  },
  {
    "key": "cleaning-sweeping",
    "name": "Cleaning Sweeping",
    "category": "sweep",
    "sort": 24,
    "cardCopyTemplate": "Maintaining a clean and functioning home environment starts with professional cleaning and sweeping services. In {{city.name}}, {{state.code}}, these services are essential for homeowners and business owners alike, ensuring that properties are safe, efficient, and presentable."
  },
  {
    "key": "chimney-sweep-fireplace",
    "name": "Chimney Sweep Fireplace",
    "category": "sweep",
    "sort": 25,
    "cardCopyTemplate": "When it comes to chimney sweep and fireplace services in {{city.name}}, {{state.code}}, Chimcare stands out for quality, professionalism, and experience."
  },
  {
    "key": "chimney-flashing-repair",
    "name": "Chimney Flashing Repair",
    "category": "repair",
    "sort": 0,
    "cardCopyTemplate": "Prevent leaks and water intrusion with reliable chimney flashing repair in {{city.name}}, {{state.code}}. We reseal or replace flashing to maintain a watertight bond between your roof and chimney. Early repairs are key to avoiding costly damage—schedule your service today."
  },
  {
    "key": "chimney-flue-repair",
    "name": "Chimney Flue Repair",
    "category": "repair",
    "sort": 1,
    "cardCopyTemplate": "Small issues in your chimney flue can turn into significant hazards. Our chimney flue repair services in {{city.name}}, {{state.code}} fix cracks, leaks, and other concerns to keep your chimney safe for use. Solve these issues early—book a repair today."
  },
  {
    "key": "chimney-siding-repair",
    "name": "Chimney Siding Repair",
    "category": "repair",
    "sort": 2,
    "cardCopyTemplate": "Protect your chimney against the elements with expert chimney siding repair in {{city.name}}, {{state.code}}. Our team addresses damage, ensuring durable, weather-resistant results that stand up to seasonal wear. Schedule service today."
  },
  {
    "key": "chimney-damper-repair",
    "name": "Chimney Damper Repair",
    "category": "repair",
    "sort": 3,
    "cardCopyTemplate": "A worn or improperly sealing chimney damper can waste energy and reduce efficiency. Our chimney damper repair in {{city.name}}, {{state.code}} restores proper functionality for better temperature regulation. Schedule repairs to keep your system running smoothly."
  },
  {
    "key": "chimney-vent-installation",
    "name": "Chimney Vent Installation",
    "category": "repair",
    "sort": 4,
    "cardCopyTemplate": "Upgrade your venting system with professional chimney vent installation in {{city.name}}, {{state.code}}. Our service ensures proper airflow and venting for both safety and optimal combustion. Trust us for seamless installations—contact today for a consultation."
  },
  {
    "key": "chimney-liner-installation",
    "name": "Chimney Liner Installation",
    "category": "repair",
    "sort": 5,
    "cardCopyTemplate": "Enhance your chimney’s safety and compliance with expert liner installation in {{city.name}}, {{state.code}}. Whether stainless steel or clay, our liners offer unmatched durability and efficiency. Start your upgrade today by contacting our team."
  },
  {
    "key": "chimney-liner-repair",
    "name": "Chimney Liner Repair",
    "category": "repair",
    "sort": 6,
    "cardCopyTemplate": "If your chimney liner shows signs of wear, our chimney liner repair in {{city.name}}, {{state.code}} ensures it remains a safe barrier that prevents heat and combustion byproducts from escaping. Upgrade to help keep your home safe—contact us for detailed service."
  },
  {
    "key": "chimney-crown-repair",
    "name": "Chimney Crown Repair",
    "category": "repair",
    "sort": 7,
    "cardCopyTemplate": "Chimney crowns protect against water entry and damage. Our chimney crown repair in {{city.name}}, {{state.code}} ensures optimal protection and prevents leaks that lead to costly repairs. Don’t wait—shield your chimney by scheduling a professional repair now."
  },
  {
    "key": "chimney-relining",
    "name": "Chimney Relining",
    "category": "repair",
    "sort": 8,
    "cardCopyTemplate": "Extend the life of your chimney and improve its efficiency with our comprehensive relining services in {{city.name}}, {{state.code}}. We use high-quality materials to ensure structural integrity and safety. Call us today to revitalize your chimney."
  },
  {
    "key": "chimney-rebuild",
    "name": "Chimney Rebuild",
    "category": "repair",
    "sort": 9,
    "cardCopyTemplate": "Restore your chimney’s beauty and strength with comprehensive rebuild services in {{city.name}}, {{state.code}}. We use durable materials to ensure optimal performance and safety for years to come. Contact us today to start your project."
  },
  {
    "key": "chimney-tuckpointing",
    "name": "Chimney Tuckpointing",
    "category": "repair",
    "sort": 10,
    "cardCopyTemplate": "Extend the lifespan of your chimney with professional tuckpointing in {{city.name}}, {{state.code}}. By replacing deteriorated mortar, we restore structural integrity and protect against moisture damage. Preserve your home’s value—book your tuckpointing service today."
  },
  {
    "key": "chimney-repair",
    "name": "Chimney Repair",
    "category": "repair",
    "sort": 11,
    "cardCopyTemplate": "Chimney repair in {{city.name}}, {{state.code}} ensures your masonry withstands seasonal changes and local weather extremes. Promptly addressing issues like leaks or cracks avoids costly repairs down the road. Let us keep your chimney safe and efficient—contact us today."
  },
  {
    "key": "chimney-chase-repair",
    "name": "Chimney Chase Repair",
    "category": "repair",
    "sort": 12,
    "cardCopyTemplate": "Protect your chimney against leaks and wear with quality chase repair in {{city.name}}, {{state.code}}. We fix damaged caps, siding, and flashing for long-term durability. Schedule service today."
  },
  {
    "key": "chimney-liner-replacement",
    "name": "Chimney Liner Replacement",
    "category": "repair",
    "sort": 13,
    "cardCopyTemplate": "Upgrade your chimney with precision chimney liner replacement in {{city.name}}, {{state.code}}. A new liner promotes better performance, safety, and compliance with building codes. Our experts ensure your system is protected and fully functional."
  },
  {
    "key": "chimney-structural-repair",
    "name": "Chimney Structural Repair",
    "category": "repair",
    "sort": 14,
    "cardCopyTemplate": "Structural chimney repair in {{city.name}}, {{state.code}} addresses cracks, leaning, and other integrity issues caused by age or weather. Restore the stability and safety of your chimney with our specialized masonry team. Call us now for reliable, lasting results."
  },
  {
    "key": "chimney-throat-repair",
    "name": "Chimney Throat Repair",
    "category": "repair",
    "sort": 15,
    "cardCopyTemplate": "Our expert chimney throat repair services in {{city.name}}, {{state.code}} help restore efficient airflow and mitigate heat loss. Addressing wear in this critical area ensures a safer and more energy-efficient chimney. Let us keep your fireplace in peak shape—book your repair now."
  },
  {
    "key": "chimney-draft-repair",
    "name": "Chimney Draft Repair",
    "category": "repair",
    "sort": 16,
    "cardCopyTemplate": "Resolve smoky fireplaces and draft issues with expert chimney draft repair in {{city.name}}, {{state.code}}. Our team identifies root causes like blockages or improper sealing and restores proper airflow to your system. Enjoy a safer, more efficient fireplace—schedule your service today."
  },
  {
    "key": "chimney-crack-repair",
    "name": "Chimney Crack Repair",
    "category": "repair",
    "sort": 17,
    "cardCopyTemplate": "Prevent further damage with professional chimney crack repair in {{city.name}}, {{state.code}}. Our team addresses leaks and structural concerns, ensuring your chimney remains secure. Schedule service today."
  },
  {
    "key": "chimney-vent-repair",
    "name": "Chimney Vent Repair",
    "category": "repair",
    "sort": 18,
    "cardCopyTemplate": "Ensure proper venting with our chimney vent repair in {{city.name}}, {{state.code}}. Fixing blockages or damage improves safety by removing harmful gasses more efficiently. Give your chimney the attention it deserves by calling today."
  },
  {
    "key": "chimney-fire-damage-repair",
    "name": "Chimney Fire Damage Repair",
    "category": "repair",
    "sort": 19,
    "cardCopyTemplate": "Following chimney fires, residents in {{city.name}}, {{state.code}} rely on thorough repair services to restore safety and structural stability. Addressing heat-related cracks and creosote damage helps prevent future hazards. Get your chimney back to peak condition—reach out now."
  },
  {
    "key": "chimney-smoke-chamber-repair",
    "name": "Chimney Smoke Chamber Repair",
    "category": "repair",
    "sort": 20,
    "cardCopyTemplate": "Ensure optimal airflow and fire safety with chimney smoke chamber repair in {{city.name}}, {{state.code}}. Our skilled team smooths and restores damaged surfaces for efficiency and compliance. Schedule service today."
  },
  {
    "key": "chimney-spalling-repair",
    "name": "Chimney Spalling Repair",
    "category": "repair",
    "sort": 21,
    "cardCopyTemplate": "Restore and protect your chimney with spalling repair in {{city.name}}, {{state.code}}. We replace crumbling bricks and restore structural integrity, ensuring your chimney remains safe and attractive. Schedule service today."
  },
  {
    "key": "chimney-crown-sealing",
    "name": "Chimney Crown Sealing",
    "category": "repair",
    "sort": 22,
    "cardCopyTemplate": "Protect your chimney from moisture intrusion with professional chimney crown sealing in {{city.name}}, {{state.code}}. By applying durable, weather-resistant coatings, we help prevent water damage and extend your chimney’s lifespan. Keep your home secure with this essential maintenance."
  },
  {
    "key": "chimney-stucco-repair",
    "name": "Chimney Stucco Repair",
    "category": "repair",
    "sort": 23,
    "cardCopyTemplate": "Maintain protection and curb appeal with expert chimney stucco repair in {{city.name}}, {{state.code}}. We address cracks, water intrusion, and weather damage to ensure a polished, durable surface. Schedule service today."
  },
  {
    "key": "chimney-exterior-repair",
    "name": "Chimney Exterior Repair",
    "category": "repair",
    "sort": 24,
    "cardCopyTemplate": "From cracks to weathered brickwork, our chimney exterior repair in {{city.name}}, {{state.code}} restores both aesthetics and structural integrity. Keep your chimney safe and appealing, especially in {{city.name}}’s fluctuating climate. Trust us to preserve your home’s value—schedule a repair today."
  },
  {
    "key": "chimney-sealing-service",
    "name": "Chimney Sealing Service",
    "category": "repair",
    "sort": 25,
    "cardCopyTemplate": "Protect your chimney from {{city.name}}’s seasonal moisture intrusion with our professional chimney sealing service. This preventative measure enhances longevity and prevents costly water damage. Contact us today to shield your chimney from the elements."
  },
  {
    "key": "chimney-firebox-repair",
    "name": "Chimney Firebox Repair",
    "category": "repair",
    "sort": 26,
    "cardCopyTemplate": "Worn or damaged fireboxes can compromise your safety. Professional firebox repair in {{city.name}}, {{state.code}} ensures optimal heat containment and structural integrity. Keep your fireplace safe for use—schedule repairs today."
  },
  {
    "key": "chimney-flashing-sealing",
    "name": "Chimney Flashing Sealing",
    "category": "repair",
    "sort": 27,
    "cardCopyTemplate": "Prevent leaks and water damage with professional chimney flashing sealing in {{city.name}}, {{state.code}}. Proper sealing ensures long-term protection against moisture intrusion at the roofline. Don’t wait until the rainy season—schedule sealing services now."
  },
  {
    "key": "chimney-heat-shield-installation",
    "name": "Chimney Heat Shield Installation",
    "category": "repair",
    "sort": 28,
    "cardCopyTemplate": "Chimney heat shield installation in {{city.name}}, {{state.code}} minimizes risks from heat transfer and strengthens your flue’s durability. This upgrade ensures safer, more efficient fireplace use in cold weather. Contact us for expert installation assistance today."
  },
  {
    "key": "chimney-insulation-installation",
    "name": "Chimney Insulation Installation",
    "category": "repair",
    "sort": 29,
    "cardCopyTemplate": "Proper chimney insulation installation in {{city.name}}, {{state.code}} enhances heat retention and prevents moisture intrusion during the colder months. Stay safer while improving energy efficiency and reducing wear on your system. Trust our team for expert installation today."
  },
  {
    "key": "chimney-mortar-repair",
    "name": "Chimney Mortar Repair",
    "category": "repair",
    "sort": 30,
    "cardCopyTemplate": "Extend the life of your chimney with dedicated mortar repair in {{city.name}}, {{state.code}}. We replace cracking or failing mortar joints to restore structural soundness and weather resistance. Protect your chimney—schedule service today."
  },
  {
    "key": "chimney-damper-replacement",
    "name": "Chimney Damper Replacement",
    "category": "repair",
    "sort": 31,
    "cardCopyTemplate": "A new damper can improve fireplace efficiency and user control. With our chimney damper replacement services in {{city.name}}, {{state.code}}, upgrade your system for better temperature management and energy savings. Schedule your replacement today for a smoother winter."
  },
  {
    "key": "chimney-interior-repair",
    "name": "Chimney Interior Repair",
    "category": "repair",
    "sort": 32,
    "cardCopyTemplate": "Our chimney interior repair services in {{city.name}}, {{state.code}} resolve interior problems like flue cracks, residue build-up, and lining issues. Keep your chimney functioning efficiently and safely during {{city.name}}’s colder months. Contact us now for expert care."
  },
  {
    "key": "chimney-concrete-repair",
    "name": "Chimney Concrete Repair",
    "category": "repair",
    "sort": 33,
    "cardCopyTemplate": "Protect your structure with expert chimney concrete repair in {{city.name}}, {{state.code}}. We repair cracks and wear, ensuring long-term stability and safety against moisture intrusion. Schedule service today."
  },
  {
    "key": "chimney-flashing-installation",
    "name": "Chimney Flashing Installation",
    "category": "repair",
    "sort": 34,
    "cardCopyTemplate": "Durable chimney flashing installation in {{city.name}}, {{state.code}} protects against water leaks and roofline damage caused by seasonal rains and snow. Maintain your home’s integrity and reduce long-term repair costs with expert services—schedule your appointment today."
  },
  {
    "key": "chimney-flue-replacement",
    "name": "Chimney Flue Replacement",
    "category": "repair",
    "sort": 35,
    "cardCopyTemplate": "Replace aging or damaged flue systems with our expert chimney flue replacement in {{city.name}}, {{state.code}}. This service enhances safety and ensures compliance with building codes for modern heating systems. Reach out today to schedule your replacement."
  },
  {
    "key": "chimney-tile-repair",
    "name": "Chimney Tile Repair",
    "category": "repair",
    "sort": 36,
    "cardCopyTemplate": "Damaged chimney tiles can lead to inefficiencies or potential fire hazards. Our chimney tile repair in {{city.name}}, {{state.code}} restores safety and proper system performance. Call us to repair cracked or missing tiles today for worry-free operation."
  },
  {
    "key": "chimney-masonry-restoration",
    "name": "Chimney Masonry Restoration",
    "category": "repair",
    "sort": 37,
    "cardCopyTemplate": "Enhance the beauty and durability of your chimney with expert masonry restoration in {{city.name}}, {{state.code}}. From repairing cracks to full restorations, we ensure your chimney is both functional and charming. Schedule service today."
  },
  {
    "key": "chimney-roof-repair",
    "name": "Chimney Roof Repair",
    "category": "repair",
    "sort": 38,
    "cardCopyTemplate": "Protect your chimney and roofline with expert chimney roof repair in {{city.name}}, {{state.code}}. We address leaks, storm damage, and structural issues to restore safety. Preserve your home’s investment—book a repair evaluation today."
  },
  {
    "key": "chimney-throat-replacement",
    "name": "Chimney Throat Replacement",
    "category": "repair",
    "sort": 39,
    "cardCopyTemplate": "Upgrade to a more efficient setup with our chimney throat replacement services in {{city.name}}, {{state.code}}. We provide precise installations to improve airflow and minimize heating inefficiencies. Contact us for a reliable upgrade to your fireplace system."
  },
  {
    "key": "chimney-crown-replacement",
    "name": "Chimney Crown Replacement",
    "category": "repair",
    "sort": 40,
    "cardCopyTemplate": "Restore your chimney’s crown with precision replacement services in {{city.name}}, {{state.code}}. By addressing cracks, deterioration, and gaps, we ensure maximum moisture protection and structural durability. Safeguard your home with a professionally installed crown."
  },
  {
    "key": "chimney-tile-replacement",
    "name": "Chimney Tile Replacement",
    "category": "repair",
    "sort": 41,
    "cardCopyTemplate": "Restore the integrity of your chimney with our chimney tile replacement services in {{city.name}}, {{state.code}}. Damaged tiles can compromise efficiency and safety, but we ensure your chimney system is strong and functional. Reach out to us for an evaluation today."
  },
  {
    "key": "chimney-vent-replacement",
    "name": "Chimney Vent Replacement",
    "category": "repair",
    "sort": 42,
    "cardCopyTemplate": "Optimize the performance of your chimney system with professional chimney vent replacement services in {{city.name}}, {{state.code}}. This service ensures proper airflow, reducing moisture intrusion and enhancing home safety. Contact us today for expert assistance."
  },
  {
    "key": "chimney-firebox-replacement",
    "name": "Chimney Firebox Replacement",
    "category": "repair",
    "sort": 43,
    "cardCopyTemplate": "Restore safety and efficiency with chimney firebox replacement in {{city.name}}, {{state.code}}. We carefully replace damaged fireboxes to maintain heat containment and protect your structure. Schedule service today."
  },
  {
    "key": "chimney-brick-replacement",
    "name": "Chimney Brick Replacement",
    "category": "repair",
    "sort": 44,
    "cardCopyTemplate": "Cracked or missing bricks? Our chimney brick replacement services in {{city.name}}, {{state.code}} restore both beauty and strength to your chimney. Addressing brick issues promptly prevents further structural damage. Contact us today to schedule expert repairs."
  },
  {
    "key": "chimney-flue-waterproofing",
    "name": "Chimney Flue Waterproofing",
    "category": "repair",
    "sort": 45,
    "cardCopyTemplate": "Protect your chimney from moisture damage with professional flue waterproofing in {{city.name}}, {{state.code}}. Our service safeguards against leaks and extends the life of your chimney system. Choose long-term protection—schedule today."
  },
  {
    "key": "chimney-smoke-problem-repair",
    "name": "Chimney Smoke Problem Repair",
    "category": "repair",
    "sort": 46,
    "cardCopyTemplate": "Eliminate smoky issues disrupting your home in {{city.name}}, {{state.code}} with our expert chimney smoke problem repair services. We identify and resolve draft or creosote issues so your fireplace works safely and efficiently. Call us to fix your chimney today."
  },
  {
    "key": "chimney-flue-sealing",
    "name": "Chimney Flue Sealing",
    "category": "repair",
    "sort": 47,
    "cardCopyTemplate": "Ensure your chimney is airtight and efficient with professional flue sealing services in {{city.name}}, {{state.code}}. By addressing gaps or cracks, we boost efficiency and prevent heat loss while keeping moisture out. Schedule sealing services today."
  },
  {
    "key": "chimney-waterproof-coating",
    "name": "Chimney Waterproof Coating",
    "category": "repair",
    "sort": 48,
    "cardCopyTemplate": "Guard your chimney against moisture damage with professional waterproof coating in {{city.name}}, {{state.code}}. Our solutions protect masonry and extend your chimney’s lifespan. Schedule service today."
  },
  {
    "key": "masonry-chimney-repair",
    "name": "Masonry Chimney Repair",
    "category": "repair",
    "sort": 49,
    "cardCopyTemplate": "Restore your chimney’s structural integrity with our masonry chimney repair in {{city.name}}, {{state.code}}. Our experts address spalling, crumbling mortar, and other masonry issues to protect your home’s chimney. Schedule your repair today to keep it sturdy and charming."
  },
  {
    "key": "chimney-footing-repair",
    "name": "Chimney Footing Repair",
    "category": "repair",
    "sort": 50,
    "cardCopyTemplate": "Preserve the structural integrity of your chimney with professional footing repair in {{city.name}}, {{state.code}}. We stabilize and reinforce deteriorating bases, protecting your chimney from costly repairs. Schedule service today."
  },
  {
    "key": "chimney-leak-repair",
    "name": "Chimney Leak Repair",
    "category": "repair",
    "sort": 51,
    "cardCopyTemplate": "Stop water intrusion and prevent costly damage with professional chimney leak repair in {{city.name}}, {{state.code}}. We quickly address leaks to protect masonry and prevent moisture-related issues. Your chimney’s health is our priority—call today for help."
  },
  {
    "key": "chimney-moisture-control",
    "name": "Chimney Moisture Control",
    "category": "repair",
    "sort": 52,
    "cardCopyTemplate": "Moisture can severely affect your chimney’s safety and durability. Our chimney moisture control solutions in {{city.name}}, {{state.code}} protect against water damage, reducing the risks of spalling and weakening masonry. Take action today to fortify your chimney."
  },
  {
    "key": "chimney-waterproofing",
    "name": "Chimney Waterproofing",
    "category": "repair",
    "sort": 53,
    "cardCopyTemplate": "Guard your masonry against rain, snow, and {{city.name}}’s moisture with chimney waterproofing services. We use high-grade water repellents to preserve structural integrity and prevent cracks or leaks. Protect your chimney year-round with robust waterproofing solutions."
  },
  {
    "key": "chimney-masonry-repair",
    "name": "Chimney Masonry Repair",
    "category": "repair",
    "sort": 54,
    "cardCopyTemplate": "Keeping your chimney in pristine condition is essential for the safety and efficiency of your home in {{city.name}}, {{state.code}}. Over time, wear and tear caused by exposure to the elements, such as rain, wind, and freezing temperatures, can damage your chimney's masonry."
  },
  {
    "key": "fireplace-panels-repair",
    "name": "Fireplace Panels Repair",
    "category": "repair",
    "sort": 55,
    "cardCopyTemplate": "Fireplace panels repair in {{city.name}}, {{state.code}} is an essential service for homeowners looking to maintain both the functionality and safety of their fireplaces."
  },
  {
    "key": "fireplace-panels-replace",
    "name": "Fireplace Panels Replacement",
    "category": "repair",
    "sort": 56,
    "cardCopyTemplate": "When your firebox’s refractory panels crack, chip, or bow, your fireplace can lose vital heat protection. Our Fireplace Panels Replace service in {{city.name}}, {{state.code}} restores the firebox with durable, code-compliant refractory panels designed to withstand high heat and protect nearby framing."
  },
  {
    "key": "chimney-cricket-installation",
    "name": "Chimney Cricket Installation",
    "category": "repair",
    "sort": 57,
    "cardCopyTemplate": "Protecting your home and enhancing the functionality of your chimney begins with a well-installed chimney cricket. In {{city.name}}, {{state.code}}, where rain, humidity, and seasonal storms are common, the proper installation of a chimney cricket can help prevent water damage and ensure the longevity of your property."
  },
  {
    "key": "electric-fireplace-installation",
    "name": "Electric Fireplace Installation",
    "category": "repair",
    "sort": 58,
    "cardCopyTemplate": "Installing an electric fireplace can transform the ambiance of your {{city.name}}, {{state.code}} home, offering warmth, comfort, and a modern touch to your space. Whether you're upgrading your living room or adding a cozy feel to a bedroom, electric fireplaces provide a safe, convenient, and stylish option for homeowners."
  },
  {
    "key": "chimney-repair-reconstruction",
    "name": "Chimney Repair Reconstruction",
    "category": "repair",
    "sort": 59,
    "cardCopyTemplate": "When masonry, mortar, and liners start to fail, your fireplace and heating system can’t perform safely or efficiently. Chimney Repair & Reconstruction in {{city.name}}, {{state.code}} addresses everything from cracked crowns and spalling brick to full or partial rebuilds that restore structural integrity and weather resistance."
  },
  {
    "key": "electric-fireplace-repair",
    "name": "Electric Fireplace Repair",
    "category": "repair",
    "sort": 60,
    "cardCopyTemplate": "Electric fireplace repair is essential for maintaining the comfort, ambiance, and efficiency of your home in {{city.name}}, {{state.code}}. Whether you rely on your fireplace for cozy evenings, as a supplementary heat source, or simply for its aesthetic charm, keeping it in optimal condition is crucial for both safety and performance."
  },
  {
    "key": "fireplace-remote-control-troubleshooting",
    "name": "Fireplace Remote Control Troubleshooting",
    "category": "repair",
    "sort": 61,
    "cardCopyTemplate": "When your gas fireplace won’t respond to its remote, cozy nights in {{city.name}} can turn chilly fast."
  },
  {
    "key": "smoke-chamber-repair",
    "name": "Smoke Chamber Repair",
    "category": "repair",
    "sort": 62,
    "cardCopyTemplate": "If you’re a homeowner in {{city.name}}, {{state.code}}, and rely on a fireplace to keep your home cozy during the cooler months, ensuring your smoke chamber is in excellent condition is critical. Smoke chamber repair involves restoring the area above your fireplace firebox where smoke transitions to the chimney flue."
  },
  {
    "key": "fireplace-remodeling",
    "name": "Fireplace Remodeling",
    "category": "repair",
    "sort": 63,
    "cardCopyTemplate": "Fireplace remodeling blends safety, efficiency, and style—transforming an aging hearth into the warm, efficient centerpiece your home deserves. In {{city.name}}, {{state.code}}, where winters are long and nights get cold, a well-designed fireplace does more than look good; it works hard."
  },
  {
    "key": "masonry-repair-construction",
    "name": "Masonry Repair Construction",
    "category": "repair",
    "sort": 64,
    "cardCopyTemplate": "Masonry repair & construction is essential for maintaining the structural integrity and beauty of homes and commercial properties in {{city.name}}, {{state.code}}."
  },
  {
    "key": "chimney-fireplace-repair",
    "name": "Chimney Fireplace Repair",
    "category": "repair",
    "sort": 65,
    "cardCopyTemplate": "A well-maintained chimney and fireplace are essential for the safety, efficiency, and comfort of your home in {{city.name}}, {{state.code}}. Over time, damage from weather, regular use, and aging can compromise the integrity of your fireplace or chimney, leading to potential hazards such as smoke leakage or structural instability."
  },
  {
    "key": "leaking-chimney-repair",
    "name": "Leaking Chimney Repair",
    "category": "repair",
    "sort": 66,
    "cardCopyTemplate": "A leaky chimney can quietly damage your home from the roofline down. In {{city.name}}, {{state.code}}, freeze–thaw cycles, driving nor’easter rains, and humid summers put extra stress on masonry, flashing, and crowns—making prompt Leaking Chimney Repair {{city.name}} MA services essential."
  },
  {
    "key": "chimney-bricks-repair",
    "name": "Chimney Bricks Repair",
    "category": "repair",
    "sort": 67,
    "cardCopyTemplate": "Maintaining a sturdy and safe chimney is essential for homeowners in {{city.name}}, {{state.code}}. Over time, chimney bricks can suffer from wear and tear due to the region's climatic conditions, leading to cracks, water intrusion, and structural instability."
  },
  {
    "key": "chimney-rebuilding",
    "name": "Chimney Rebuilding",
    "category": "repair",
    "sort": 68,
    "cardCopyTemplate": "Chimney rebuilding is an essential service for homeowners in {{city.name}}, {{state.code}}. As a vital component of your home's safety and efficiency, a well-maintained chimney ensures proper ventilation for your fireplace while protecting your family from harmful gases and potential fire hazards."
  },
  {
    "key": "exterior-wood-replacement",
    "name": "Exterior Wood Replacement",
    "category": "repair",
    "sort": 69,
    "cardCopyTemplate": "Maintaining the exterior of your home is crucial to preserving its beauty, safety, and structural integrity. Exterior wood replacement in {{city.name}}, {{state.code}} goes beyond improving aesthetics; it ensures that your property remains resistant to harsh weather conditions and natural wear over time."
  },
  {
    "key": "flexible-chimney-liner-installation",
    "name": "Flexible Chimney Liner Installation",
    "category": "repair",
    "sort": 70,
    "cardCopyTemplate": "A properly sized, code-compliant chimney liner is the backbone of a safe and efficient hearth or heating system. In {{city.name}}, {{state.code}}, where winters are long and freeze–thaw cycles are tough on masonry, Flexible Chimney Liner Installation ensures your flue contains heat, vents gases reliably, and protects surrounding materials."
  },
  {
    "key": "chimney-fan-installation",
    "name": "Chimney Fan Installation",
    "category": "repair",
    "sort": 71,
    "cardCopyTemplate": "Proper ventilation is essential for ensuring a safe and efficient fireplace or wood stove system, and that's where professional chimney fan installation comes into play. In {{city.name}}, {{state.code}}, residents understand the importance of protecting their homes and loved ones from the dangers of poor air circulation and potential smoke back drafting."
  },
  {
    "key": "fireplace-masonry-repair",
    "name": "Fireplace Masonry Repair",
    "category": "repair",
    "sort": 72,
    "cardCopyTemplate": "Fireplace masonry repair in {{city.name}}, {{state.code}} is a crucial service for homeowners seeking to maintain both the safety and the historic beauty of their hearths."
  },
  {
    "key": "chimney-framing-rebuild",
    "name": "Chimney Framing Rebuild",
    "category": "repair",
    "sort": 73,
    "cardCopyTemplate": "Maintaining the safety and efficiency of your chimney is a crucial aspect of homeownership, especially in a city like {{city.name}}, {{state.code}}, where cold winters demand heavy use of fireplaces."
  },
  {
    "key": "apartment-chimney-services",
    "name": "Apartment Chimney Services",
    "category": "repair",
    "sort": 74,
    "cardCopyTemplate": "Keeping the chimneys in apartment complexes well-maintained and safe is critical, especially in {{city.name}}, {{state.code}}, where seasonal weather patterns demand extra precautions. Apartment chimney services include everything from inspections to cleaning and repairs, ensuring tenants’ safety and the efficiency of heating systems."
  },
  {
    "key": "chimney-flue-installation",
    "name": "Chimney Flue Installation",
    "category": "repair",
    "sort": 75,
    "cardCopyTemplate": "Proper chimney flue installation is essential for the functionality and safety of your fireplace or stove. In {{city.name}}, {{state.code}}, where winter temperatures can drop significantly, a well-installed chimney flue ensures efficient ventilation, prevents harmful gases from entering your home, and enhances energy efficiency."
  },
  {
    "key": "smoke-chamber-rebuild",
    "name": "Smoke Chamber Rebuild",
    "category": "repair",
    "sort": 76,
    "cardCopyTemplate": "Ensuring the integrity of your smoke chamber is critical for safe and efficient fireplace operation in {{city.name}}, {{state.code}}. Over time, this vital component of your chimney can degrade, leading to potential safety hazards and reduced performance."
  },
  {
    "key": "chimney-restoration",
    "name": "Chimney Restoration",
    "category": "repair",
    "sort": 77,
    "cardCopyTemplate": "Chimney restoration is an essential service for ensuring the safety, functionality, and heritage of homes in {{city.name}}, {{state.code}}. Over time, chimneys can deteriorate due to weather exposure, aging materials, and general wear and tear."
  },
  {
    "key": "stainless-steel-liners",
    "name": "Stainless Steel Liners",
    "category": "repair",
    "sort": 78,
    "cardCopyTemplate": "Stainless steel liners are an essential component for enhancing the safety and efficiency of chimneys in homes and businesses. In {{city.name}}, {{state.code}}, where the climate includes wet winters and cooler conditions, a durable and weather-resistant chimney liner can protect your property from moisture and structural damage."
  },
  {
    "key": "chimney-framing-repair",
    "name": "Chimney Framing Repair",
    "category": "repair",
    "sort": 79,
    "cardCopyTemplate": "Maintaining the structural integrity of your chimney is essential for the safety and efficiency of any home in {{city.name}}, {{state.code}}. Chimney framing repair addresses damage to the framework that supports your chimney, helping to avoid costly consequences such as water intrusion, weakened masonry, or even structural collapse."
  },
  {
    "key": "fireplace-flue-installation",
    "name": "Fireplace Flue Installation",
    "category": "repair",
    "sort": 80,
    "cardCopyTemplate": "Your fireplace flue plays a critical role in ensuring the safe and efficient operation of your fireplace. At Chimcare, we specialize in expert fireplace flue installation in {{city.name}}, {{state.code}}. A properly installed flue helps direct smoke and harmful gases out of your home while improving the efficiency of your fireplace."
  },
  {
    "key": "fireplace-refacing-mantel-replacement",
    "name": "Fireplace Refacing Mantel Replacement",
    "category": "repair",
    "sort": 81,
    "cardCopyTemplate": "Fireplace refacing & mantel replacement is an efficient way to refresh the heart of your home without undergoing a full-scale renovation. In {{city.name}}, {{state.code}}, where homes range from charming vintage cottages to contemporary dwellings, updating your fireplace can make a dramatic difference in style, energy efficiency, and comfort."
  },
  {
    "key": "downdraft-repair",
    "name": "Downdraft Repair",
    "category": "repair",
    "sort": 82,
    "cardCopyTemplate": "Downdraft repair is an essential service for homeowners in {{city.name}}, {{state.code}}, who rely on proper ventilation for their kitchen and home. Dysfunctional downdrafts can result in poor air quality, lingering odors, and inefficient appliance performance, making repairs a critical component of maintaining a safe and comfortable environment."
  },
  {
    "key": "fireplace-brick-repair",
    "name": "Fireplace Brick Repair",
    "category": "repair",
    "sort": 83,
    "cardCopyTemplate": "Fireplace brick repair in {{city.name}}, {{state.code}}, is a crucial service designed to restore both the function and beauty of your fireplace. Over time, exposure to heat, moisture, and general wear and tear can lead to cracked, loose, or deteriorating bricks, creating safety concerns and diminishing the fireplace's aesthetic appeal."
  },
  {
    "key": "masonry-repair",
    "name": "Masonry Repair",
    "category": "repair",
    "sort": 84,
    "cardCopyTemplate": "Masonry repair in {{city.name}}, {{state.code}} is an essential service for property owners who want to maintain the structural integrity, appearance, and long-term value of their homes or commercial spaces."
  },
  {
    "key": "chimney-maintenance",
    "name": "Chimney Maintenance",
    "category": "repair",
    "sort": 85,
    "cardCopyTemplate": "Chimney maintenance is a crucial service for homeowners and property managers in {{city.name}}, {{state.code}}. With the region’s mix of chilly winters and damp conditions, having a well-maintained chimney ensures safe and efficient heating for your home."
  },
  {
    "key": "chimney-construction",
    "name": "Chimney Construction",
    "category": "repair",
    "sort": 86,
    "cardCopyTemplate": "If you're seeking expert chimney construction in {{city.name}}, {{state.code}}, you've come to the right place. Chimney construction is a critical service for homeowners, ensuring that your property has a safe, functional, and aesthetically pleasing feature to handle your heating needs."
  },
  {
    "key": "firebox-repair",
    "name": "Firebox Repair",
    "category": "repair",
    "sort": 87,
    "cardCopyTemplate": "A well-functioning firebox is essential for a safe and effective fireplace system in any home. Firebox repair in {{city.name}}, {{state.code}}, ensures that your fireplace remains in top condition, particularly during the colder months when it is most needed."
  },
  {
    "key": "fireplace-doors",
    "name": "Fireplace Doors",
    "category": "repair",
    "sort": 88,
    "cardCopyTemplate": "Fireplace doors are a crucial addition to any home in {{city.name}}, {{state.code}}, offering safety, efficiency, and style. These doors not only complement the look and feel of your fireplace but also enhance its functionality."
  },
  {
    "key": "electric-fireplaces",
    "name": "Electric Fireplaces",
    "category": "repair",
    "sort": 89,
    "cardCopyTemplate": "Electric fireplaces are an innovative and stylish solution for heating your home efficiently while enhancing its aesthetic appeal. In {{city.name}}, {{state.code}}, where winters can be harsh and chilly, having a reliable and visually appealing heating option is essential."
  },
  {
    "key": "wood-fireplaces",
    "name": "Wood Fireplaces",
    "category": "repair",
    "sort": 90,
    "cardCopyTemplate": "Experience the charm and warmth of a classic wood-burning fireplace in {{city.name}}, {{state.code}}. Wood fireplaces not only add ambiance to your home but also provide a reliable heating source during cooler months."
  },
  {
    "key": "chimney-leaks-repair",
    "name": "Chimney Leaks Repair",
    "category": "repair",
    "sort": 91,
    "cardCopyTemplate": "When it comes to the safety and comfort of your home, addressing chimney leaks plays a critical role. In an area like {{city.name}}, {{state.code}}, known for its historic homes and variable weather conditions, chimney leaks can lead to significant damage if left untreated."
  },
  {
    "key": "damaged-chimneys-repair",
    "name": "Damaged Chimneys Repair",
    "category": "repair",
    "sort": 92,
    "cardCopyTemplate": "If your chimney is damaged or in disrepair, addressing the problem promptly is essential for the safety and efficiency of your home. In a historic and picturesque town like {{city.name}}, {{state.code}}, where many homes are decades or even centuries old, chimney maintenance is a vital aspect of homeownership."
  },
  {
    "key": "restoration-relining",
    "name": "Restoration Relining",
    "category": "repair",
    "sort": 93,
    "cardCopyTemplate": "Restoration and relining are essential services for maintaining and reviving chimneys and fireplaces in homes across {{city.name}}, {{state.code}}. Whether your property features a classic stone hearth or a more contemporary fireplace, professional restoration and relining ensure safety, performance, and longevity."
  },
  {
    "key": "smelly-chimneys-repair",
    "name": "Smelly Chimneys Repair",
    "category": "repair",
    "sort": 94,
    "cardCopyTemplate": "Are you dealing with a smelly chimney in {{city.name}}, {{state.code}}? A chimney that emits unpleasant odors can quickly turn a cozy home into an uncomfortable environment."
  },
  {
    "key": "glass-door-fireplace",
    "name": "Glass Door Fireplace",
    "category": "repair",
    "sort": 95,
    "cardCopyTemplate": "A glass door fireplace enhances the safety, efficiency, and beauty of any home in {{city.name}}, {{state.code}}. These specialized doors serve as a barrier between your living space and the open flames, adding an extra layer of protection while maintaining the cozy ambiance you love."
  },
  {
    "key": "smoky-chimneys-repair",
    "name": "Smoky Chimneys Repair",
    "category": "repair",
    "sort": 96,
    "cardCopyTemplate": "Dealing with smoky chimneys in your {{city.name}}, {{state.code}} home can be more than just an inconvenience—it can be a serious safety hazard. A smoky chimney typically indicates improper drafting or obstructions, which may lead to smoke infiltrating your home or even dangerous carbon monoxide exposure."
  },
  {
    "key": "heatshield-repair",
    "name": "Heatshield Repair",
    "category": "repair",
    "sort": 97,
    "cardCopyTemplate": "Maintaining the safety and efficiency of your chimney is essential for homeowners in {{city.name}}, {{state.code}}, making professional Heatshield services a critical necessity. Heatshield is a proven, advanced solution designed to restore, repair, and protect the integrity of your chimney liner."
  },
  {
    "key": "smelly-chimneys",
    "name": "Smelly Chimneys",
    "category": "repair",
    "sort": 98,
    "cardCopyTemplate": "Dealing with a smelly chimney in {{city.name}}, {{state.code}}, can be more than just a nuisance—it can be a sign of underlying issues that require immediate attention."
  },
  {
    "key": "chimney-leaks",
    "name": "Chimney Leaks",
    "category": "repair",
    "sort": 99,
    "cardCopyTemplate": "Chimney leaks can be a frustrating and potentially damaging issue for homeowners in {{city.name}}, {{state.code}}. With the city's climate, characterized by consistent rainfall throughout much of the year, chimneys are especially susceptible to water intrusion."
  },
  {
    "key": "glass-door-fireplace-repair",
    "name": "Glass Door Fireplace Repair",
    "category": "repair",
    "sort": 100,
    "cardCopyTemplate": "Glass door fireplaces offer an attractive and efficient way to update your hearth while enhancing safety in your home. In {{city.name}}, {{state.code}}, where temperatures drop in the cool months and fireplaces remain a central gathering point, installing glass doors on your fireplace can make a major difference."
  },
  {
    "key": "damaged-chimneys",
    "name": "Damaged Chimneys",
    "category": "repair",
    "sort": 101,
    "cardCopyTemplate": "If you’re dealing with damaged chimneys in {{city.name}}, {{state.code}}, you’ve come to the right place. Chimneys are a crucial component of any home with a fireplace, ensuring safe and efficient operation by directing smoke and gases out of the living space. When a chimney becomes damaged, it can compromise the safety and comfort of your home."
  },
  {
    "key": "smoky-chimneys",
    "name": "Smoky Chimneys",
    "category": "repair",
    "sort": 102,
    "cardCopyTemplate": "Dealing with a smoky chimney in {{city.name}}, {{state.code}}, can be frustrating and even hazardous. A smoky chimney can result from a variety of issues, including poor ventilation, creosote buildup, or structural damage."
  },
  {
    "key": "liners",
    "name": "Liners",
    "category": "repair",
    "sort": 103,
    "cardCopyTemplate": "Ensuring the safety and efficiency of your chimney is crucial for homeowners in {{city.name}}, {{state.code}}. One of the most important components to maintaining a functional and safe chimney is the liner."
  },
  {
    "key": "electric-fireplaces-repair",
    "name": "Electric Fireplaces Repair",
    "category": "repair",
    "sort": 104,
    "cardCopyTemplate": "Electric fireplaces offer a modern, energy-efficient solution to adding warmth and ambiance to your home. In {{city.name}}, {{state.code}}, where winters can be brutal and summers unpredictable, electric fireplaces have become an increasingly popular choice for homeowners seeking convenient heating options."
  },
  {
    "key": "wood-fireplaces-repair",
    "name": "Wood Fireplaces Repair",
    "category": "repair",
    "sort": 105,
    "cardCopyTemplate": "Wood fireplaces are a timeless addition to homes, offering warmth, ambiance, and a cozy space for families to gather. In {{city.name}}, {{state.code}}, where seasonal changes bring chilly winters, a wood fireplace is not just a luxury—it's a practical heating solution that adds charm to your living space."
  },
  {
    "key": "heatshield",
    "name": "Heatshield",
    "category": "repair",
    "sort": 106,
    "cardCopyTemplate": "Heatshield is a revolutionary solution designed to repair and restore the structural integrity of chimney flues, ensuring they function safely and efficiently. In {{city.name}}, {{state.code}}, where homes often contend with colder seasons and frequent wood-burning usage, a reliable chimney system is essential for homeowners' comfort and safety."
  },
  {
    "key": "chimney-tuckpointing-chimney-tuckpointing-chimney-mortar-repair-tuckpointing-chimney-near-me-chimney-joint-repair",
    "name": "Chimney Tuckpointing Chimney Tuckpointing Chimney Mortar Repair Tuckpointing Chimney near me Chimney Joint Repair",
    "category": "repair",
    "sort": 107,
    "cardCopyTemplate": "If you're a homeowner in {{city.name}}, {{state.code}}, ensuring your chimney remains in optimal condition is essential for both safety and efficiency. Over time, weather and natural aging can cause the mortar between the bricks of your chimney to deteriorate, leading to structural issues or water intrusion."
  },
  {
    "key": "fireplace-doors-repair",
    "name": "Fireplace Doors Repair",
    "category": "repair",
    "sort": 108,
    "cardCopyTemplate": "A cozy fireplace can be the heart of any home, but without well-crafted fireplace doors, both safety and energy efficiency can be compromised. Installing or upgrading fireplace doors in {{city.name}}, {{state.code}}, is essential for homeowners looking to enhance their fireplace's functionality and aesthetic appeal."
  },
  {
    "key": "chimney-inspection",
    "name": "Chimney Inspection",
    "category": "inspection",
    "sort": 0,
    "cardCopyTemplate": "Get peace of mind with a thorough chimney inspection in {{city.name}}, {{state.code}}. Our certified technicians check for structural issues, creosote buildup, and fire hazards, ensuring your home stays safe and compliant. Schedule service today."
  },
  {
    "key": "chimney-liner-inspection",
    "name": "Chimney Liner Inspection",
    "category": "inspection",
    "sort": 1,
    "cardCopyTemplate": "Prioritize safety with a comprehensive chimney liner inspection in {{city.name}}, {{state.code}}. We verify your liner’s condition and identify any damage that might impact your home’s safety or efficiency. Schedule a professional inspection today."
  },
  {
    "key": "fireplace-inspection",
    "name": "Fireplace Inspection",
    "category": "inspection",
    "sort": 2,
    "cardCopyTemplate": "Ensure the safety and efficiency of your fireplace in {{city.name}}, {{state.code}} with our thorough fireplace inspection services. We identify potential issues like damage, blockages, and safety concerns, keeping your home warm and safe for years to come. Schedule an inspection today."
  },
  {
    "key": "chimney-camera-inspection",
    "name": "Chimney Camera Inspection",
    "category": "inspection",
    "sort": 3,
    "cardCopyTemplate": "Gain an in-depth view of your chimney with our camera inspection services in {{city.name}}, {{state.code}}. This diagnostic tool identifies hidden blockages or damage that may compromise safety or efficiency. Call us to schedule your thorough chimney inspection today."
  },
  {
    "key": "level-3-chimney-inspection",
    "name": "Level 3 Chimney Inspection",
    "category": "inspection",
    "sort": 4,
    "cardCopyTemplate": "For comprehensive assurance, our level 3 chimney inspections in {{city.name}}, {{state.code}} go beyond the surface to examine hidden areas of your chimney system. This advanced service is invaluable when assessing structural integrity, especially after a fire or significant weather damage. Schedule service today for peace of mind."
  },
  {
    "key": "chimney-inspections",
    "name": "Chimney Inspections",
    "category": "inspection",
    "sort": 5,
    "cardCopyTemplate": "Chimney inspections are a vital service for homeowners in {{city.name}}, {{state.code}}, providing essential peace of mind by ensuring fireplaces and flue systems operate safely and efficiently. In a community known for its picturesque historic homes and charming tree-lined streets, regular chimney maintenance is crucial."
  },
  {
    "key": "pellet-stove-inspection",
    "name": "Pellet Stove Inspection",
    "category": "inspection",
    "sort": 6,
    "cardCopyTemplate": "Pellet stove inspection is an essential home maintenance service for residents in {{city.name}}, {{state.code}}. Ensuring that your pellet stove is operating efficiently and safely is particularly important here, where damp, chilly winters make heating reliability a must."
  },
  {
    "key": "chimney-inspection-level-1",
    "name": "Chimney Inspection Level 1",
    "category": "inspection",
    "sort": 7,
    "cardCopyTemplate": "Owning a home on {{city.name}} offers a unique blend of serenity, natural beauty, and the quiet charm of South Puget Sound living. Whether you reside here year-round near the Riviera Community Club or own a seasonal vacation cabin near Otso Point, maintaining your heating system is crucial for safety and comfort."
  },
  {
    "key": "chimney-inspection-level-2",
    "name": "Chimney Inspection Level 2",
    "category": "inspection",
    "sort": 8,
    "cardCopyTemplate": "Ensuring the structural integrity and operational safety of your chimney system is a critical responsibility for homeowners on {{city.name}}, {{state.code}}."
  },
  {
    "key": "chimney-inspection-level-3",
    "name": "Chimney Inspection Level 3",
    "category": "inspection",
    "sort": 9,
    "cardCopyTemplate": "Chimney inspection level 3 in {{city.name}}, {{state.code}}, is a comprehensive evaluation designed for situations where significant chimney damage or safety concerns are suspected. This advanced inspection involves all aspects of levels 1 and 2, plus the removal of components (such as walls or chimney parts) as necessary to fully access hidden areas."
  },
  {
    "key": "chimney-inspection-level1",
    "name": "Chimney Inspection Level1",
    "category": "inspection",
    "sort": 10,
    "cardCopyTemplate": "A Chimney Inspection Level 1 is the foundational safety check every active chimney in {{city.name}} should receive each year. Per NFPA 211, it’s a visual inspection of all readily accessible parts of your chimney and connected heating appliance without the use of special tools or demolition."
  },
  {
    "key": "chimney-inspection-level2",
    "name": "Chimney Inspection Level2",
    "category": "inspection",
    "sort": 11,
    "cardCopyTemplate": "A Chimney Inspection Level 2 in {{city.name}}, {{state.code}} is a comprehensive evaluation of your chimney’s safety, structure, and code compliance, tailored to the specific needs of local homes and climate. {{city.name}}’s seasonal cycles—frigid winters, hot summers, and humidity—mean masonry and venting systems in our town need special attention."
  },
  {
    "key": "chimney-inspection-level3",
    "name": "Chimney Inspection Level3",
    "category": "inspection",
    "sort": 12,
    "cardCopyTemplate": "A Chimney Inspection Level 3 in {{city.name}}, {{state.code}}, is a comprehensive assessment designed to investigate hidden hazards in your chimney and venting system."
  },
  {
    "key": "gas-fireplace-repair",
    "name": "Gas Fireplace Repair",
    "category": "gas",
    "sort": 0,
    "cardCopyTemplate": "Gas fireplace repair in {{city.name}}, {{state.code}} keeps your home warm and cozy during the chilly months. From ignition issues to valve checks, we ensure smooth, safe operation. Let us maintain your fireplace’s efficiency—schedule your repair today."
  },
  {
    "key": "fireplace-repair",
    "name": "Fireplace Repair",
    "category": "gas",
    "sort": 1,
    "cardCopyTemplate": "Address cracks, leaks, and functional issues with expert fireplace repair in {{city.name}}, {{state.code}}. Our experienced team restores your fireplace’s operation and charm, keeping your home cozy. Schedule service today."
  },
  {
    "key": "fireplace-damper-repair",
    "name": "Fireplace Damper Repair",
    "category": "gas",
    "sort": 2,
    "cardCopyTemplate": "Faulty dampers reduce safety and airflow in your fireplace. Our fireplace damper repair services in {{city.name}}, {{state.code}} restore proper functioning for efficient and safe operation. Contact us for fast, expert repairs that keep your home cozy and protected."
  },
  {
    "key": "fireplace-damper-installation",
    "name": "Fireplace Damper Installation",
    "category": "gas",
    "sort": 3,
    "cardCopyTemplate": "Upgrade your fireplace in {{city.name}}, {{state.code}} with a new damper to improve energy efficiency and prevent drafts. Our expert installation helps maintain proper venting while keeping warmth indoors during colder seasons. Schedule your service today."
  },
  {
    "key": "fireplace-smoke-repair",
    "name": "Fireplace Smoke Repair",
    "category": "gas",
    "sort": 4,
    "cardCopyTemplate": "Stop smoky issues in your {{city.name}}, {{state.code}} fireplace with expert repair services. Whether caused by draft problems or buildup, our team ensures safe, efficient operation. Schedule a repair today for clean, cozy fires."
  },
  {
    "key": "fireplace-restoration",
    "name": "Fireplace Restoration",
    "category": "gas",
    "sort": 5,
    "cardCopyTemplate": "Bring charm and function back to your living space with expert fireplace restoration in {{city.name}}, {{state.code}}. Our team repairs and renovates aging fireplaces to combine beauty with modern safety. Let us revitalize your hearth for years of cozy gatherings."
  },
  {
    "key": "coal-stove-service",
    "name": "Coal Stove Service",
    "category": "gas",
    "sort": 6,
    "cardCopyTemplate": "Keep your home warm and efficient with expert coal stove service in {{city.name}}, {{state.code}}. We clean and maintain your stove to ensure optimal heat output and safety. Schedule service today."
  },
  {
    "key": "fireplace-gas-valve-replace",
    "name": "Fireplace Gas Valve Replacement",
    "category": "gas",
    "sort": 7,
    "cardCopyTemplate": "Maintaining the safety and functionality of your fireplace is essential, especially in {{city.name}}, {{state.code}}, where chilly winter nights make efficient heating a priority. Fireplace gas valve replacement ensures that your fireplace operates correctly, delivering reliable warmth and peace of mind to your home."
  },
  {
    "key": "gas-fireplace-repair-service",
    "name": "Gas Fireplace Repair Service",
    "category": "gas",
    "sort": 8,
    "cardCopyTemplate": "Gas fireplaces offer warmth, ambiance, and a modern touch to homes throughout {{city.name}}, {{state.code}}. However, over time, even the most reliable systems need professional attention to ensure safe and efficient operation."
  },
  {
    "key": "gas-fireplace-installation",
    "name": "Gas Fireplace Installation",
    "category": "gas",
    "sort": 9,
    "cardCopyTemplate": "Transform the comfort and style of your home with expert gas fireplace installation in {{city.name}}, {{state.code}}. A gas fireplace offers efficient, reliable heat and modern convenience, making it a standout feature in local homes."
  },
  {
    "key": "gas-fireplace-maintenance-cleaning",
    "name": "Gas Fireplace Maintenance Cleaning",
    "category": "gas",
    "sort": 10,
    "cardCopyTemplate": "Gas fireplaces are a popular feature in homes throughout {{city.name}}, {{state.code}}, offering cozy warmth and ambiance with the simple flick of a switch. However, just like any other appliance in your home, gas fireplaces require routine maintenance and cleaning to ensure optimal performance and safety."
  },
  {
    "key": "gas-fireplace-service",
    "name": "Gas Fireplace Service",
    "category": "gas",
    "sort": 11,
    "cardCopyTemplate": "A gas fireplace brings warm ambience and reliable heat to homes in {{city.name}}, {{state.code}}. To ensure your unit operates efficiently and safely, regular professional gas fireplace service is essential."
  },
  {
    "key": "fireplace-gas-valve-repair",
    "name": "Fireplace Gas Valve Repair",
    "category": "gas",
    "sort": 12,
    "cardCopyTemplate": "Fireplace gas valve repair is an essential service for homeowners in {{city.name}}, {{state.code}}, especially given the region’s chilly winters and the high demand for reliable indoor heating solutions."
  },
  {
    "key": "gas-fireplace-cleaning",
    "name": "Gas Fireplace Cleaning",
    "category": "gas",
    "sort": 13,
    "cardCopyTemplate": "Gas fireplace cleaning keeps your unit burning cleanly, safely, and efficiently. In {{city.name}}, {{state.code}}, where winters are long and crisp and shoulder seasons still call for cozy heat, a well-maintained gas fireplace is more than a luxury—it’s a smart, safe, and energy-conscious choice."
  },
  {
    "key": "vented-gas-logs-installation",
    "name": "Vented Gas Logs Installation",
    "category": "gas",
    "sort": 14,
    "cardCopyTemplate": "Vented gas logs installation brings the warm, realistic look of a wood fire to your home while using the existing chimney to safely vent combustion byproducts. In {{city.name}}, {{state.code}}—where long, snowy winters, shoulder-season chills, and aging chimneys are common—professional installation ensures your fireplace performs beautifully and safely."
  },
  {
    "key": "ventless-gas-logs-installation",
    "name": "Ventless Gas Logs Installation",
    "category": "gas",
    "sort": 15,
    "cardCopyTemplate": "Ventless gas logs installation in {{city.name}}, {{state.code}} is a smart way to enjoy the ambiance and warmth of a traditional fireplace—without the mess, hassle, or chimney."
  },
  {
    "key": "pilot-assembly-replacement",
    "name": "Pilot Assembly Replacement",
    "category": "gas",
    "sort": 16,
    "cardCopyTemplate": "When it comes to ensuring the safety and efficiency of your gas appliances, professional pilot assembly replacement in {{city.name}}, {{state.code}} , is a critical service. The pilot assembly is a small but essential component of many appliances, from water heaters to gas furnaces, responsible for igniting the main burner."
  },
  {
    "key": "remote-control-for-a-pilot-light",
    "name": "Remote Control for a Pilot Light",
    "category": "gas",
    "sort": 17,
    "cardCopyTemplate": "Enhance the comfort and convenience of your home in {{city.name}}, {{state.code}}, with our expert installation of remote controls for pilot lights. This service allows you to easily ignite, adjust, or extinguish your pilot light with the simple press of a button."
  },
  {
    "key": "pilot-light-installation",
    "name": "Pilot Light Installation",
    "category": "gas",
    "sort": 18,
    "cardCopyTemplate": "Pilot light installation is a crucial service for homeowners and businesses in {{city.name}}, {{state.code}} who need reliable ignition for furnaces, water heaters, fireplaces, and other gas appliances."
  },
  {
    "key": "fireplace-gas-burner-installation",
    "name": "Fireplace Gas Burner Installation",
    "category": "gas",
    "sort": 19,
    "cardCopyTemplate": "Transforming your home’s fireplace with professional fireplace gas burner installation in {{city.name}}, {{state.code}} is an excellent way to add warmth, ambiance, and energy efficiency to your living space. Gas burners offer a clean, low-maintenance alternative to traditional wood-burning fireplaces."
  },
  {
    "key": "vented-gas-logs",
    "name": "Vented Gas Logs",
    "category": "gas",
    "sort": 20,
    "cardCopyTemplate": "Vented gas logs are an excellent solution for homeowners in {{city.name}}, {{state.code}}, looking to enjoy the warm ambiance of a traditional fireplace without the upkeep of burning real wood. These logs are designed to mimic the appearance of natural wood while providing cleaner and more efficient heating."
  },
  {
    "key": "vent-free-gas-logs",
    "name": "Vent Free Gas Logs",
    "category": "gas",
    "sort": 21,
    "cardCopyTemplate": "If you're considering upgrading your home's heating options, vent free gas logs in {{city.name}}, {{state.code}} might just be the perfect solution. These efficient, clean-burning alternatives bring warmth and ambiance without the need for a traditional chimney or venting system."
  },
  {
    "key": "gas-line-installation-service",
    "name": "Gas Line Installation Service",
    "category": "gas",
    "sort": 22,
    "cardCopyTemplate": "Gas line installation service in {{city.name}}, {{state.code}} is essential for both new home projects and properties upgrading their fuel systems. Properly installed gas lines provide a safe, efficient way to power appliances like stoves, fireplaces, furnaces, and outdoor grills."
  },
  {
    "key": "gas-log-sets",
    "name": "Gas Log Sets",
    "category": "gas",
    "sort": 23,
    "cardCopyTemplate": "Gas log sets provide a safe, efficient, and attractive alternative to traditional wood-burning fireplaces. In {{city.name}}, {{state.code}}, homeowners value both the cozy warmth and low-maintenance benefits of a well-installed gas log system."
  },
  {
    "key": "gas-fireplaces",
    "name": "Gas Fireplaces",
    "category": "gas",
    "sort": 24,
    "cardCopyTemplate": "Gas fireplaces blend the warmth and ambiance of a traditional hearth with the convenience of clean energy, making them a popular choice for homeowners in {{city.name}}, {{state.code}}."
  },
  {
    "key": "gas-fireplaces-repair",
    "name": "Gas Fireplaces Repair",
    "category": "gas",
    "sort": 25,
    "cardCopyTemplate": "Gas fireplaces have become an increasingly popular choice for homeowners in {{city.name}}, {{state.code}}, providing both warmth and ambiance at the push of a button. In a region where chilly winters are the norm and comfort is prized, having a reliable gas fireplace adds inviting charm to any living space."
  },
  {
    "key": "fireplace-installation",
    "name": "Fireplace Installation",
    "category": "outdoor",
    "sort": 0,
    "cardCopyTemplate": "Transform your living space with professional fireplace installation in {{city.name}}, {{state.code}}. We deliver both beauty and efficiency with expertly installed options tailored to your home. Contact us today for safe and stylish solutions that enhance warmth and charm."
  },
  {
    "key": "outdoor-fireplace-building",
    "name": "Outdoor Fireplace Building",
    "category": "outdoor",
    "sort": 1,
    "cardCopyTemplate": "Outdoor fireplace building in {{city.name}}, {{state.code}} brings warmth, style, and year-round enjoyment to your backyard or patio. As Minnesotans know well, our long winters and brief warm seasons mean outdoor spaces should be inviting and functional for as long as possible."
  },
  {
    "key": "commercial-bbq-smoker-cleaning-service",
    "name": "Commercial BBQ Smoker Cleaning Service",
    "category": "outdoor",
    "sort": 2,
    "cardCopyTemplate": "Maintaining a clean and efficient commercial BBQ smoker is crucial for business owners in {{city.name}}, {{state.code}}. Regular cleaning not only ensures the longevity and performance of your smoker but also promotes food safety and compliance with health codes."
  },
  {
    "key": "commercial-pizza-oven-cleaning-service",
    "name": "Commercial Pizza Oven Cleaning Service",
    "category": "outdoor",
    "sort": 3,
    "cardCopyTemplate": "Maintaining a clean and well-functioning pizza oven is crucial for businesses in the thriving food scene of {{city.name}}, {{state.code}}. A reliable commercial pizza oven cleaning service ensures that your equipment operates efficiently, produces delicious results, and complies with health and safety standards."
  },
  {
    "key": "outdoor-fireplaces",
    "name": "Outdoor Fireplaces",
    "category": "outdoor",
    "sort": 4,
    "cardCopyTemplate": "Transform your backyard into a warm and inviting space with an expertly designed and installed outdoor fireplace in {{city.name}}, {{state.code}}. Whether you're looking to create a cozy retreat for family evenings or a focal point for gatherings with friends, an outdoor fireplace brings both style and functionality to any outdoor living space."
  },
  {
    "key": "outdoor-fireplaces-repair",
    "name": "Outdoor Fireplaces Repair",
    "category": "outdoor",
    "sort": 5,
    "cardCopyTemplate": "Outdoor fireplaces are a definitive way to enhance the charm, comfort, and usability of your backyard in {{city.name}}, {{state.code}}. Whether you are looking to enjoy chilly fall evenings around a crackling fire or create a centerpiece for gatherings with friends and family, an outdoor fireplace adds immense value and appeal to your property."
  },
  {
    "key": "chimney-cap-installation",
    "name": "Chimney Cap Installation",
    "category": "caps",
    "sort": 0,
    "cardCopyTemplate": "Shield your chimney from rain and debris with professional cap installation in {{city.name}}, {{state.code}}. A secure cap prevents moisture intrusion and nesting animals, ensuring safer operation. Schedule service today."
  },
  {
    "key": "chimney-cap-repair",
    "name": "Chimney Cap Repair",
    "category": "caps",
    "sort": 1,
    "cardCopyTemplate": "Prevent water and debris from compromising your chimney with our reliable chimney cap repair in {{city.name}}, {{state.code}}. A properly maintained cap ensures optimal performance and protects against costly repairs. Schedule your service now."
  },
  {
    "key": "chimney-spark-arrestor-repair",
    "name": "Chimney Spark Arrestor Repair",
    "category": "caps",
    "sort": 2,
    "cardCopyTemplate": "Keep your chimney and home safe with professional chimney spark arrestor repair in {{city.name}}, {{state.code}}. Damaged spark arrestors fail to block sparks effectively, compromising fire prevention and safety. Contact us today for reliable repairs."
  },
  {
    "key": "chimney-spark-arrestor-cleaning",
    "name": "Chimney Spark Arrestor Cleaning",
    "category": "caps",
    "sort": 3,
    "cardCopyTemplate": "Keep your spark arrestor functioning properly with expert cleaning services in {{city.name}}, {{state.code}}. This essential maintenance ensures safety and prevents harmful blockages caused by soot and debris. Contact us today for reliable service."
  },
  {
    "key": "chimney-spark-arrestor-installation",
    "name": "Chimney Spark Arrestor Installation",
    "category": "caps",
    "sort": 4,
    "cardCopyTemplate": "Protect your home in {{city.name}}, {{state.code}} from stray sparks and debris with our professional chimney spark arrestor installation services. This essential upgrade enhances safety, improves efficiency, and meets local building codes, keeping your chimney safe and compliant. Schedule service today."
  },
  {
    "key": "chimney-cap-replacement",
    "name": "Chimney Cap Replacement",
    "category": "caps",
    "sort": 5,
    "cardCopyTemplate": "Upgrade your chimney’s protection with chimney cap replacement in {{city.name}}, {{state.code}}. Our custom-fit caps shield your chimney from harsh weather conditions, moisture, and debris. Schedule your replacement today for effective protection."
  },
  {
    "key": "top-sealing-damper",
    "name": "Top Sealing Damper",
    "category": "caps",
    "sort": 6,
    "cardCopyTemplate": "Increase energy efficiency and protect your chimney with a top sealing damper in {{city.name}}, {{state.code}}. Proper installation keeps drafts out and ensures year-round safety. Schedule service today."
  },
  {
    "key": "chimney-chase-cover",
    "name": "Chimney Chase Cover",
    "category": "caps",
    "sort": 7,
    "cardCopyTemplate": "Protect your chimney from weather and debris with a durable chase cover in {{city.name}}, {{state.code}}. High-quality installations safeguard against rust and water pooling, extending your chimney’s life. Call our experts for a replacement or upgrade today."
  },
  {
    "key": "chimney-caps",
    "name": "Chimney Caps",
    "category": "caps",
    "sort": 8,
    "cardCopyTemplate": "Protecting your chimney is essential for maintaining your home's safety and efficiency, and installing a high-quality chimney cap is one of the best ways to do so. If you're in {{city.name}}, {{state.code}}, where seasonal weather shifts and occasional wildlife intrusions are common, chimney caps are a crucial investment."
  },
  {
    "key": "spark-arrestor-installation",
    "name": "Spark Arrestor Installation",
    "category": "caps",
    "sort": 9,
    "cardCopyTemplate": "When it comes to protecting your home and family from potential fire hazards, spark arrestor installation in {{city.name}}, {{state.code}} , is essential. A spark arrestor prevents embers from escaping your chimney, ensuring a safer and more efficient fireplace or wood stove operation."
  },
  {
    "key": "chimney-siding-replace",
    "name": "Chimney Siding Replacement",
    "category": "caps",
    "sort": 10,
    "cardCopyTemplate": "Maintaining your chimney’s health is an essential part of keeping your home safe and well-maintained, especially in {{city.name}}, {{state.code}}, where weather conditions can take a toll on your home’s exterior."
  },
  {
    "key": "chimney-chase-covering",
    "name": "Chimney Chase Covering",
    "category": "caps",
    "sort": 11,
    "cardCopyTemplate": "Proper chimney chase covering is essential for protecting your home in {{city.name}}, {{state.code}}, from damage caused by weather, debris, and pests. A chimney chase cover acts as a safeguard for prefabricated or factory-built chimneys, providing a durable shield against rain, snow, and moisture intrusion."
  },
  {
    "key": "chimney-chase-restoration",
    "name": "Chimney Chase Restoration",
    "category": "caps",
    "sort": 12,
    "cardCopyTemplate": "Chimney chase restoration in {{city.name}}, {{state.code}}, is a critical service for homeowners who rely on their fireplaces for warmth and comfort. A well-maintained chimney not only ensures efficient heating but also protects your home from potential water damage, structural deterioration, and safety hazards."
  },
  {
    "key": "top-mount-dampers",
    "name": "Top Mount Dampers",
    "category": "caps",
    "sort": 13,
    "cardCopyTemplate": "Top mount dampers are essential for maintaining the efficiency and integrity of your chimney system. In {{city.name}}, {{state.code}}, where winters are harsh and summers bring humid conditions, having a reliable chimney damper helps regulate airflow while keeping debris, water, and pests out of your chimney."
  },
  {
    "key": "waterproofing-bricks",
    "name": "Waterproofing Bricks",
    "category": "caps",
    "sort": 14,
    "cardCopyTemplate": "Waterproofing bricks is an essential service for protecting your property's structural integrity and aesthetic appeal. In {{city.name}}, {{state.code}}, where the weather brings a mix of rain, snow, and humidity, ensuring your bricks are waterproof can prevent costly damage caused by water infiltration and freeze-thaw cycles."
  },
  {
    "key": "custom-chimney-caps",
    "name": "Custom Chimney Caps",
    "category": "caps",
    "sort": 15,
    "cardCopyTemplate": "Protecting your chimney from weather, pests, and debris is essential, and custom chimney caps in {{city.name}}, {{state.code}} , are the perfect solution. Chimney caps serve not only as a safeguard but also improve your home's aesthetic appeal while extending your chimney's lifespan."
  },
  {
    "key": "caps-rain-pans",
    "name": "Caps Rain Pans",
    "category": "caps",
    "sort": 16,
    "cardCopyTemplate": "Protecting your chimney and ensuring its longevity involves more than just regular cleaning—it requires the right accessories, including caps and rain pans in {{city.name}}, {{state.code}} . These essential components guard against water damage, animal intrusion, and debris buildup, keeping your chimney system efficient and safe."
  },
  {
    "key": "chimney-crowns",
    "name": "Chimney Crowns",
    "category": "caps",
    "sort": 17,
    "cardCopyTemplate": "Properly installing and maintaining chimney crowns is essential for protecting your chimney and home from the elements. In {{city.name}}, {{state.code}}, where the climate features cold winters and occasional heavy precipitation, chimney crowns act as the first line of defense against water damage and structural deterioration."
  },
  {
    "key": "chimney-crowns-repair",
    "name": "Chimney Crowns Repair",
    "category": "caps",
    "sort": 18,
    "cardCopyTemplate": "Chimney crowns are an essential feature of any well-maintained chimney, acting as the first line of defense against water damage and weather-related wear and tear. In {{city.name}}, {{state.code}}, where seasonal weather extremes are a regular occurrence, ensuring your chimney crown is in excellent condition is vital to your home's longevity."
  },
  {
    "key": "chimney-flashing",
    "name": "Chimney Flashing",
    "category": "caps",
    "sort": 19,
    "cardCopyTemplate": "Chimney flashing is an essential component of a watertight roofing system, ensuring your home remains protected from water damage. In {{city.name}}, {{state.code}}, with its mix of rainy winters and mild summers, maintaining your chimney flashing is critical to protecting your home from leaks and structural damage."
  },
  {
    "key": "chimney-caps-repair",
    "name": "Chimney Caps Repair",
    "category": "caps",
    "sort": 20,
    "cardCopyTemplate": "Protecting your chimney with a properly installed chimney cap is an essential investment for homeowners in {{city.name}}, {{state.code}}. Chimney caps not only safeguard your home’s chimney from debris, animals, and weather-related damage but also enhance overall efficiency and safety."
  },
  {
    "key": "caps-and-rain-pans",
    "name": "Caps and Rain Pans",
    "category": "caps",
    "sort": 21,
    "cardCopyTemplate": "Caps and rain pans are essential components for maintaining the functionality and longevity of your chimney system in {{city.name}}, {{state.code}}. These protective features safeguard your chimney against weather-related damage, prevent debris from clogging the flue, and help deter animals from entering your system."
  },
  {
    "key": "top-sealing-damper-top-sealing-damper-installation-chimney-damper-replacement-chimney-damper-upgrade-top-mount-damper",
    "name": "Top Sealing Damper Top Sealing Damper Installation Chimney Damper Replacement Chimney Damper Upgrade Top Mount Damper",
    "category": "caps",
    "sort": 22,
    "cardCopyTemplate": "Looking for expert services for your chimney's top sealing damper in {{city.name}}, {{state.code}}? You've come to the right place. At Chimcare , we specialize in helping homeowners maintain their chimneys with high-quality solutions."
  },
  {
    "key": "wood-burning-insert-removal",
    "name": "Wood Burning Insert Removal",
    "category": "wood-inserts",
    "sort": 0,
    "cardCopyTemplate": "If you’re upgrading or repurposing your fireplace, our wood burning insert removal service in {{city.name}}, {{state.code}} can help. This process is handled with care to ensure safe removal and proper disposal of your old unit. Call us today to transform your space efficiently."
  },
  {
    "key": "wood-burning-stove-installation",
    "name": "Wood Burning Stove Installation",
    "category": "wood-inserts",
    "sort": 1,
    "cardCopyTemplate": "Wood-burning stove installation in {{city.name}}, {{state.code}}, is a valuable service for homeowners looking to enhance their heating efficiency while adding a touch of rustic charm to their homes. With {{city.name}}'s temperate climate and cooler winters, a well-installed wood-burning stove can transform your living space into a warm and cozy haven."
  },
  {
    "key": "pellet-stove-repair",
    "name": "Pellet Stove Repair",
    "category": "wood-inserts",
    "sort": 2,
    "cardCopyTemplate": "Pellet stove repair in {{city.name}}, {{state.code}} is an essential home service, ensuring reliable heat and efficient operation through the region’s sometimes harsh and chilly climate. {{city.name}}, nestled along the South Shore, is known for its scenic coastal weather, which often brings cold, damp winters and brisk winds off the Atlantic."
  },
  {
    "key": "wood-burning-fireplace-installation",
    "name": "Wood Burning Fireplace Installation",
    "category": "wood-inserts",
    "sort": 3,
    "cardCopyTemplate": "Wood-burning fireplaces serve as a timeless centerpiece in homes, providing both warmth and charm. In {{city.name}}, {{state.code}}, where winter months can bring chilly temperatures and cozy evenings, a wood-burning fireplace is more than just an architectural feature—it’s a lifestyle upgrade."
  },
  {
    "key": "wood-burning-fireplace-inserts",
    "name": "Wood Burning Fireplace Inserts",
    "category": "wood-inserts",
    "sort": 4,
    "cardCopyTemplate": "Wood burning fireplace inserts are a practical and elegant solution for homeowners in {{city.name}}, {{state.code}}, looking to improve the efficiency and warmth of their fireplaces."
  },
  {
    "key": "pellet-stove-service",
    "name": "Pellet Stove Service",
    "category": "wood-inserts",
    "sort": 5,
    "cardCopyTemplate": "Pellet stove service is a comprehensive maintenance and repair process designed to keep your pellet stove operating safely and efficiently. In {{city.name}}, {{state.code}}, where winter temperatures can be harsh and heating systems see heavy seasonal use, prompt pellet stove service is essential for ensuring reliable warmth throughout the colder months."
  },
  {
    "key": "fireplace-inserts",
    "name": "Fireplace Inserts",
    "category": "wood-inserts",
    "sort": 6,
    "cardCopyTemplate": "Fireplace inserts offer homeowners in {{city.name}}, {{state.code}} an efficient, stylish way to upgrade existing fireplaces while enhancing safety and energy performance. These inserts are specially designed units that slide directly into your current masonry or prefab fireplace, transforming it into a low-maintenance, cost-efficient heat source."
  },
  {
    "key": "wood-burning-inserts",
    "name": "Wood Burning Inserts",
    "category": "wood-inserts",
    "sort": 7,
    "cardCopyTemplate": "Wood burning inserts are an excellent way to enhance the efficiency, warmth, and charm of your living space, particularly in {{city.name}}, {{state.code}}. Designed to be installed within an existing masonry fireplace, these inserts transform underperforming fireplaces into high-efficiency heating units."
  },
  {
    "key": "wood-inserts",
    "name": "Wood Inserts",
    "category": "wood-inserts",
    "sort": 8,
    "cardCopyTemplate": "Wood inserts are a stylish and efficient way to enhance the functionality and aesthetic of your fireplace in {{city.name}}, {{state.code}}. As an alternative to traditional fireplaces, wood inserts offer excellent heat output while creating a cozy ambiance within your living space."
  },
  {
    "key": "gas-stoves-repair",
    "name": "Gas Stoves Repair",
    "category": "wood-inserts",
    "sort": 9,
    "cardCopyTemplate": "Gas stoves have become an increasingly popular choice among homeowners in {{city.name}}, {{state.code}}, offering a reliable and efficient heating source well-suited to our region’s chilly winters and fluctuating seasonal temperatures."
  },
  {
    "key": "wood-stoves-repair",
    "name": "Wood Stoves Repair",
    "category": "wood-inserts",
    "sort": 10,
    "cardCopyTemplate": "Wood stoves offer homeowners in {{city.name}}, {{state.code}}, an efficient and cozy way to heat their homes during the colder months. Known for their timeless aesthetics and high heat output, wood stoves are a perfect solution for those seeking a sustainable and reliable source of warmth."
  },
  {
    "key": "pellet-stoves",
    "name": "Pellet Stoves",
    "category": "wood-inserts",
    "sort": 11,
    "cardCopyTemplate": "Pellet stoves offer a highly efficient, environmentally friendly, and cost-effective way to heat homes in {{city.name}}, {{state.code}}. These innovative heating systems use compressed wood or biomass pellets as fuel, providing steady warmth with customizable controls and minimal emissions."
  },
  {
    "key": "freestanding-stoves-repair",
    "name": "Freestanding Stoves Repair",
    "category": "wood-inserts",
    "sort": 12,
    "cardCopyTemplate": "Freestanding stoves are a fantastic heating solution for homeowners in {{city.name}}, {{state.code}}, combining efficiency, aesthetics, and functionality. Whether you're looking for a wood, pellet, or gas stove, these self-contained units can provide supplemental heat while enhancing the ambiance of your living space."
  },
  {
    "key": "freestanding-stoves",
    "name": "Freestanding Stoves",
    "category": "wood-inserts",
    "sort": 13,
    "cardCopyTemplate": "Freestanding stoves are an excellent addition to homes, providing warmth, ambiance, and a timeless aesthetic. In {{city.name}}, {{state.code}}, where the climate can dip into chilly temperatures during the winter months, a freestanding stove is not only a luxury but also a practical investment."
  },
  {
    "key": "pellet-stoves-repair",
    "name": "Pellet Stoves Repair",
    "category": "wood-inserts",
    "sort": 14,
    "cardCopyTemplate": "Pellet stoves are a smart, efficient, and environmentally friendly heating solution, perfect for homes in {{city.name}}, {{state.code}}. These stoves burn compressed wood or biomass pellets, offering a reliable and cost-effective alternative to traditional fireplaces or wood stoves."
  },
  {
    "key": "wood-stoves",
    "name": "Wood Stoves",
    "category": "wood-inserts",
    "sort": 15,
    "cardCopyTemplate": "Wood stoves provide a timeless, efficient, and environmentally friendly way to heat your home while creating a cozy ambiance. In {{city.name}}, {{state.code}}, where chilly winters are a regular occurrence, a reliable wood stove can be a tremendous asset."
  },
  {
    "key": "gas-stoves",
    "name": "Gas Stoves",
    "category": "wood-inserts",
    "sort": 16,
    "cardCopyTemplate": "Gas stoves are an efficient, attractive way to heat homes in {{city.name}}, {{state.code}}. With fluctuating temperatures, frequent wet weather, and a variety of home styles—from cozy cabins to modern cottages—residents count on gas stoves for consistent warmth, convenience, and ambience."
  },
  {
    "key": "fireplace-insert-installation",
    "name": "Fireplace Insert Installation",
    "category": "gas-inserts",
    "sort": 0,
    "cardCopyTemplate": "Upgrade your living space with professional fireplace insert installation in {{city.name}}, {{state.code}}. Whether you’re seeking a gas, wood, or pellet solution, our expert services enhance efficiency and safety while adding warmth to your home. Schedule service today."
  },
  {
    "key": "gas-fireplace-inserts",
    "name": "Gas Fireplace Inserts",
    "category": "gas-inserts",
    "sort": 1,
    "cardCopyTemplate": "When winter settles over {{city.name}}, {{state.code}}, a gas fireplace insert delivers clean, reliable heat with the flick of a switch. A gas insert converts your existing wood-burning fireplace or dated prefab box into a sealed, high-efficiency heater that looks beautiful and performs even better."
  },
  {
    "key": "gas-fireplace-insert",
    "name": "Gas Fireplace Insert",
    "category": "gas-inserts",
    "sort": 2,
    "cardCopyTemplate": "Thinking about adding comfort and value to your {{city.name}} home? A gas fireplace insert is an efficient, stylish solution for enhancing warmth while maintaining low maintenance requirements. This modern upgrade not only brings cozy ambiance indoors, but also delivers reliable heat during the damp, chilly months common in {{city.name}}, {{state.code}}."
  }
];
