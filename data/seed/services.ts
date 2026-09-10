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
    "key": "chimney-draft-repair",
    "name": "Chimney Draft Repair",
    "category": "repair",
    "sort": 0,
    "cardCopyTemplate": "Resolve smoky fireplaces and draft issues with expert chimney draft repair in {{city.name}}, {{state.code}}. Our team identifies root causes like blockages or improper sealing and restores proper airflow to your system. Enjoy a safer, more efficient fireplace—schedule your service today."
  },
  {
    "key": "chimney-crown-sealing",
    "name": "Chimney Crown Sealing",
    "category": "repair",
    "sort": 1,
    "cardCopyTemplate": "Protect your chimney from moisture intrusion with professional chimney crown sealing in {{city.name}}, {{state.code}}. By applying durable, weather-resistant coatings, we help prevent water damage and extend your chimney’s lifespan. Keep your home secure with this essential maintenance."
  },
  {
    "key": "chimney-waterproofing",
    "name": "Chimney Waterproofing",
    "category": "repair",
    "sort": 2,
    "cardCopyTemplate": "Guard your masonry against rain, snow, and {{city.name}}’s moisture with chimney waterproofing services. We use high-grade water repellents to preserve structural integrity and prevent cracks or leaks. Protect your chimney year-round with robust waterproofing solutions."
  },
  {
    "key": "chimney-sweep",
    "name": "Chimney Sweep",
    "category": "sweep",
    "sort": 3,
    "cardCopyTemplate": "Keep your chimney clean and safe with professional chimney sweep services in {{city.name}}, {{state.code}}. Regular sweeps remove creosote and debris, reducing the risk of fires and ensuring efficient venting. Let us help you maintain a safer, warmer home."
  },
  {
    "key": "chimney-liner-replacement",
    "name": "Chimney Liner Replacement",
    "category": "repair",
    "sort": 4,
    "cardCopyTemplate": "Upgrade your chimney with precision chimney liner replacement in {{city.name}}, {{state.code}}. A new liner promotes better performance, safety, and compliance with building codes. Our experts ensure your system is protected and fully functional."
  },
  {
    "key": "chimney-blockage-removal",
    "name": "Chimney Blockage Removal",
    "category": "sweep",
    "sort": 5,
    "cardCopyTemplate": "Clear out obstructions with our chimney blockage removal in {{city.name}}, {{state.code}}. From animal nests to soot buildup, blockages can compromise airflow and safety. We restore proper venting to protect both your comfort and indoor air quality."
  },
  {
    "key": "dryer-vent-cleaning",
    "name": "Dryer Vent Cleaning",
    "category": "sweep",
    "sort": 6,
    "cardCopyTemplate": "Ensure optimal dryer performance and safety with professional dryer vent cleaning in {{city.name}}, {{state.code}}. Removing lint buildup helps reduce fire risks, improve drying efficiency, and extend the life of your appliance. Schedule this vital service today."
  },
  {
    "key": "fireplace-restoration",
    "name": "Fireplace Restoration",
    "category": "gas",
    "sort": 7,
    "cardCopyTemplate": "Bring charm and function back to your living space with expert fireplace restoration in {{city.name}}, {{state.code}}. Our team repairs and renovates aging fireplaces to combine beauty with modern safety. Let us revitalize your hearth for years of cozy gatherings."
  },
  {
    "key": "chimney-crown-replacement",
    "name": "Chimney Crown Replacement",
    "category": "repair",
    "sort": 8,
    "cardCopyTemplate": "Restore your chimney’s crown with precision replacement services in {{city.name}}, {{state.code}}. By addressing cracks, deterioration, and gaps, we ensure maximum moisture protection and structural durability. Safeguard your home with a professionally installed crown."
  },
  {
    "key": "fireplace-insert-installation",
    "name": "Fireplace Insert Installation",
    "category": "gas-inserts",
    "sort": 9,
    "cardCopyTemplate": "Upgrade your living space with professional fireplace insert installation in {{city.name}}, {{state.code}}. Whether you’re seeking a gas, wood, or pellet solution, our expert services enhance efficiency and safety while adding warmth to your home. Schedule service today."
  },
  {
    "key": "chimney-inspection",
    "name": "Chimney Inspection",
    "category": "inspection",
    "sort": 10,
    "cardCopyTemplate": "Get peace of mind with a thorough chimney inspection in {{city.name}}, {{state.code}}. Our certified technicians check for structural issues, creosote buildup, and fire hazards, ensuring your home stays safe and compliant. Schedule service today."
  },
  {
    "key": "chimney-siding-repair",
    "name": "Chimney Siding Repair",
    "category": "repair",
    "sort": 11,
    "cardCopyTemplate": "Protect your chimney against the elements with expert chimney siding repair in {{city.name}}, {{state.code}}. Our team addresses damage, ensuring durable, weather-resistant results that stand up to seasonal wear. Schedule service today."
  },
  {
    "key": "chimney-firebox-replacement",
    "name": "Chimney Firebox Replacement",
    "category": "repair",
    "sort": 12,
    "cardCopyTemplate": "Restore safety and efficiency with chimney firebox replacement in {{city.name}}, {{state.code}}. We carefully replace damaged fireboxes to maintain heat containment and protect your structure. Schedule service today."
  },
  {
    "key": "chimney-masonry-restoration",
    "name": "Chimney Masonry Restoration",
    "category": "repair",
    "sort": 13,
    "cardCopyTemplate": "Enhance the beauty and durability of your chimney with expert masonry restoration in {{city.name}}, {{state.code}}. From repairing cracks to full restorations, we ensure your chimney is both functional and charming. Schedule service today."
  },
  {
    "key": "chimney-footing-repair",
    "name": "Chimney Footing Repair",
    "category": "repair",
    "sort": 14,
    "cardCopyTemplate": "Preserve the structural integrity of your chimney with professional footing repair in {{city.name}}, {{state.code}}. We stabilize and reinforce deteriorating bases, protecting your chimney from costly repairs. Schedule service today."
  },
  {
    "key": "chimney-cleaning",
    "name": "Chimney Cleaning",
    "category": "sweep",
    "sort": 15,
    "cardCopyTemplate": "Keep your home safe and your fireplace efficient with thorough chimney cleaning in {{city.name}}, {{state.code}}. We remove soot, creosote, and blockages, ensuring improved airflow and performance. Schedule service today."
  },
  {
    "key": "chimney-stucco-repair",
    "name": "Chimney Stucco Repair",
    "category": "repair",
    "sort": 16,
    "cardCopyTemplate": "Maintain protection and curb appeal with expert chimney stucco repair in {{city.name}}, {{state.code}}. We address cracks, water intrusion, and weather damage to ensure a polished, durable surface. Schedule service today."
  },
  {
    "key": "chimney-ash-pit-cleaning",
    "name": "Chimney Ash Pit Cleaning",
    "category": "sweep",
    "sort": 17,
    "cardCopyTemplate": "Improve fireplace efficiency and safety with detailed chimney ash pit cleaning in {{city.name}}, {{state.code}}. We clean out built-up debris, reducing fire hazards and enhancing system performance. Schedule service today."
  },
  {
    "key": "chimney-spalling-repair",
    "name": "Chimney Spalling Repair",
    "category": "repair",
    "sort": 18,
    "cardCopyTemplate": "Restore and protect your chimney with spalling repair in {{city.name}}, {{state.code}}. We replace crumbling bricks and restore structural integrity, ensuring your chimney remains safe and attractive. Schedule service today."
  },
  {
    "key": "fireplace-repair",
    "name": "Fireplace Repair",
    "category": "gas",
    "sort": 19,
    "cardCopyTemplate": "Address cracks, leaks, and functional issues with expert fireplace repair in {{city.name}}, {{state.code}}. Our experienced team restores your fireplace’s operation and charm, keeping your home cozy. Schedule service today."
  },
  {
    "key": "top-sealing-damper",
    "name": "Top Sealing Damper",
    "category": "caps",
    "sort": 20,
    "cardCopyTemplate": "Increase energy efficiency and protect your chimney with a top sealing damper in {{city.name}}, {{state.code}}. Proper installation keeps drafts out and ensures year-round safety. Schedule service today."
  },
  {
    "key": "chimney-smoke-chamber-repair",
    "name": "Chimney Smoke Chamber Repair",
    "category": "repair",
    "sort": 21,
    "cardCopyTemplate": "Ensure optimal airflow and fire safety with chimney smoke chamber repair in {{city.name}}, {{state.code}}. Our skilled team smooths and restores damaged surfaces for efficiency and compliance. Schedule service today."
  },
  {
    "key": "chimney-concrete-repair",
    "name": "Chimney Concrete Repair",
    "category": "repair",
    "sort": 22,
    "cardCopyTemplate": "Protect your structure with expert chimney concrete repair in {{city.name}}, {{state.code}}. We repair cracks and wear, ensuring long-term stability and safety against moisture intrusion. Schedule service today."
  },
  {
    "key": "chimney-crack-repair",
    "name": "Chimney Crack Repair",
    "category": "repair",
    "sort": 23,
    "cardCopyTemplate": "Prevent further damage with professional chimney crack repair in {{city.name}}, {{state.code}}. Our team addresses leaks and structural concerns, ensuring your chimney remains secure. Schedule service today."
  },
  {
    "key": "fireplace-cleaning",
    "name": "Fireplace Cleaning",
    "category": "sweep",
    "sort": 24,
    "cardCopyTemplate": "Enjoy a clean and efficient hearth with fireplace cleaning in {{city.name}}, {{state.code}}. We remove soot and residue to improve air quality and maintain system performance. Schedule service today."
  },
  {
    "key": "coal-stove-service",
    "name": "Coal Stove Service",
    "category": "gas",
    "sort": 25,
    "cardCopyTemplate": "Keep your home warm and efficient with expert coal stove service in {{city.name}}, {{state.code}}. We clean and maintain your stove to ensure optimal heat output and safety. Schedule service today."
  },
  {
    "key": "chimney-smoke-chamber-cleaning",
    "name": "Chimney Smoke Chamber Cleaning",
    "category": "sweep",
    "sort": 26,
    "cardCopyTemplate": "Improve fireplace safety and efficiency with chimney smoke chamber cleaning in {{city.name}}, {{state.code}}. Our thorough cleanings remove blockages and creosote buildup for safer fires. Schedule service today."
  },
  {
    "key": "chimney-chase-repair",
    "name": "Chimney Chase Repair",
    "category": "repair",
    "sort": 27,
    "cardCopyTemplate": "Protect your chimney against leaks and wear with quality chase repair in {{city.name}}, {{state.code}}. We fix damaged caps, siding, and flashing for long-term durability. Schedule service today."
  },
  {
    "key": "chimney-waterproof-coating",
    "name": "Chimney Waterproof Coating",
    "category": "repair",
    "sort": 28,
    "cardCopyTemplate": "Guard your chimney against moisture damage with professional waterproof coating in {{city.name}}, {{state.code}}. Our solutions protect masonry and extend your chimney’s lifespan. Schedule service today."
  },
  {
    "key": "chimney-cap-installation",
    "name": "Chimney Cap Installation",
    "category": "caps",
    "sort": 29,
    "cardCopyTemplate": "Shield your chimney from rain and debris with professional cap installation in {{city.name}}, {{state.code}}. A secure cap prevents moisture intrusion and nesting animals, ensuring safer operation. Schedule service today."
  },
  {
    "key": "level-3-chimney-inspection",
    "name": "Level 3 Chimney Inspection",
    "category": "inspection",
    "sort": 30,
    "cardCopyTemplate": "For comprehensive assurance, our level 3 chimney inspections in {{city.name}}, {{state.code}} go beyond the surface to examine hidden areas of your chimney system. This advanced service is invaluable when assessing structural integrity, especially after a fire or significant weather damage. Schedule service today for peace of mind."
  },
  {
    "key": "chimney-throat-repair",
    "name": "Chimney Throat Repair",
    "category": "repair",
    "sort": 31,
    "cardCopyTemplate": "Our expert chimney throat repair services in {{city.name}}, {{state.code}} help restore efficient airflow and mitigate heat loss. Addressing wear in this critical area ensures a safer and more energy-efficient chimney. Let us keep your fireplace in peak shape—book your repair now."
  },
  {
    "key": "chimney-sealing-service",
    "name": "Chimney Sealing Service",
    "category": "repair",
    "sort": 32,
    "cardCopyTemplate": "Protect your chimney from {{city.name}}’s seasonal moisture intrusion with our professional chimney sealing service. This preventative measure enhances longevity and prevents costly water damage. Contact us today to shield your chimney from the elements."
  },
  {
    "key": "chimney-exterior-repair",
    "name": "Chimney Exterior Repair",
    "category": "repair",
    "sort": 33,
    "cardCopyTemplate": "From cracks to weathered brickwork, our chimney exterior repair in {{city.name}}, {{state.code}} restores both aesthetics and structural integrity. Keep your chimney safe and appealing, especially in {{city.name}}’s fluctuating climate. Trust us to preserve your home’s value—schedule a repair today."
  },
  {
    "key": "chimney-crown-repair",
    "name": "Chimney Crown Repair",
    "category": "repair",
    "sort": 34,
    "cardCopyTemplate": "Chimney crowns protect against water entry and damage. Our chimney crown repair in {{city.name}}, {{state.code}} ensures optimal protection and prevents leaks that lead to costly repairs. Don’t wait—shield your chimney by scheduling a professional repair now."
  },
  {
    "key": "wood-burning-insert-removal",
    "name": "Wood Burning Insert Removal",
    "category": "wood-inserts",
    "sort": 35,
    "cardCopyTemplate": "If you’re upgrading or repurposing your fireplace, our wood burning insert removal service in {{city.name}}, {{state.code}} can help. This process is handled with care to ensure safe removal and proper disposal of your old unit. Call us today to transform your space efficiently."
  },
  {
    "key": "chimney-throat-replacement",
    "name": "Chimney Throat Replacement",
    "category": "repair",
    "sort": 36,
    "cardCopyTemplate": "Upgrade to a more efficient setup with our chimney throat replacement services in {{city.name}}, {{state.code}}. We provide precise installations to improve airflow and minimize heating inefficiencies. Contact us for a reliable upgrade to your fireplace system."
  },
  {
    "key": "chimney-moisture-control",
    "name": "Chimney Moisture Control",
    "category": "repair",
    "sort": 37,
    "cardCopyTemplate": "Moisture can severely affect your chimney’s safety and durability. Our chimney moisture control solutions in {{city.name}}, {{state.code}} protect against water damage, reducing the risks of spalling and weakening masonry. Take action today to fortify your chimney."
  },
  {
    "key": "chimney-interior-repair",
    "name": "Chimney Interior Repair",
    "category": "repair",
    "sort": 38,
    "cardCopyTemplate": "Our chimney interior repair services in {{city.name}}, {{state.code}} resolve interior problems like flue cracks, residue build-up, and lining issues. Keep your chimney functioning efficiently and safely during {{city.name}}’s colder months. Contact us now for expert care."
  },
  {
    "key": "chimney-flashing-repair",
    "name": "Chimney Flashing Repair",
    "category": "repair",
    "sort": 39,
    "cardCopyTemplate": "Prevent leaks and water intrusion with reliable chimney flashing repair in {{city.name}}, {{state.code}}. We reseal or replace flashing to maintain a watertight bond between your roof and chimney. Early repairs are key to avoiding costly damage—schedule your service today."
  },
  {
    "key": "chimney-liner-repair",
    "name": "Chimney Liner Repair",
    "category": "repair",
    "sort": 40,
    "cardCopyTemplate": "If your chimney liner shows signs of wear, our chimney liner repair in {{city.name}}, {{state.code}} ensures it remains a safe barrier that prevents heat and combustion byproducts from escaping. Upgrade to help keep your home safe—contact us for detailed service."
  },
  {
    "key": "chimney-damper-repair",
    "name": "Chimney Damper Repair",
    "category": "repair",
    "sort": 41,
    "cardCopyTemplate": "A worn or improperly sealing chimney damper can waste energy and reduce efficiency. Our chimney damper repair in {{city.name}}, {{state.code}} restores proper functionality for better temperature regulation. Schedule repairs to keep your system running smoothly."
  },
  {
    "key": "chimney-vent-repair",
    "name": "Chimney Vent Repair",
    "category": "repair",
    "sort": 42,
    "cardCopyTemplate": "Ensure proper venting with our chimney vent repair in {{city.name}}, {{state.code}}. Fixing blockages or damage improves safety by removing harmful gasses more efficiently. Give your chimney the attention it deserves by calling today."
  },
  {
    "key": "chimney-flue-repair",
    "name": "Chimney Flue Repair",
    "category": "repair",
    "sort": 43,
    "cardCopyTemplate": "Small issues in your chimney flue can turn into significant hazards. Our chimney flue repair services in {{city.name}}, {{state.code}} fix cracks, leaks, and other concerns to keep your chimney safe for use. Solve these issues early—book a repair today."
  },
  {
    "key": "masonry-chimney-repair",
    "name": "Masonry Chimney Repair",
    "category": "repair",
    "sort": 44,
    "cardCopyTemplate": "Restore your chimney’s structural integrity with our masonry chimney repair in {{city.name}}, {{state.code}}. Our experts address spalling, crumbling mortar, and other masonry issues to protect your home’s chimney. Schedule your repair today to keep it sturdy and charming."
  },
  {
    "key": "chimney-camera-inspection",
    "name": "Chimney Camera Inspection",
    "category": "inspection",
    "sort": 45,
    "cardCopyTemplate": "Gain an in-depth view of your chimney with our camera inspection services in {{city.name}}, {{state.code}}. This diagnostic tool identifies hidden blockages or damage that may compromise safety or efficiency. Call us to schedule your thorough chimney inspection today."
  },
  {
    "key": "chimney-vent-installation",
    "name": "Chimney Vent Installation",
    "category": "repair",
    "sort": 46,
    "cardCopyTemplate": "Upgrade your venting system with professional chimney vent installation in {{city.name}}, {{state.code}}. Our service ensures proper airflow and venting for both safety and optimal combustion. Trust us for seamless installations—contact today for a consultation."
  },
  {
    "key": "chimney-flue-replacement",
    "name": "Chimney Flue Replacement",
    "category": "repair",
    "sort": 47,
    "cardCopyTemplate": "Replace aging or damaged flue systems with our expert chimney flue replacement in {{city.name}}, {{state.code}}. This service enhances safety and ensures compliance with building codes for modern heating systems. Reach out today to schedule your replacement."
  },
  {
    "key": "fireplace-installation",
    "name": "Fireplace Installation",
    "category": "outdoor",
    "sort": 48,
    "cardCopyTemplate": "Transform your living space with professional fireplace installation in {{city.name}}, {{state.code}}. We deliver both beauty and efficiency with expertly installed options tailored to your home. Contact us today for safe and stylish solutions that enhance warmth and charm."
  },
  {
    "key": "chimney-damper-replacement",
    "name": "Chimney Damper Replacement",
    "category": "repair",
    "sort": 49,
    "cardCopyTemplate": "A new damper can improve fireplace efficiency and user control. With our chimney damper replacement services in {{city.name}}, {{state.code}}, upgrade your system for better temperature management and energy savings. Schedule your replacement today for a smoother winter."
  },
  {
    "key": "fireplace-damper-repair",
    "name": "Fireplace Damper Repair",
    "category": "gas",
    "sort": 50,
    "cardCopyTemplate": "Faulty dampers reduce safety and airflow in your fireplace. Our fireplace damper repair services in {{city.name}}, {{state.code}} restore proper functioning for efficient and safe operation. Contact us for fast, expert repairs that keep your home cozy and protected."
  },
  {
    "key": "chimney-vent-cleaning",
    "name": "Chimney Vent Cleaning",
    "category": "sweep",
    "sort": 51,
    "cardCopyTemplate": "Clogged vents compromise airflow and safety. Our thorough chimney vent cleaning services in {{city.name}}, {{state.code}} remove debris and improve performance. Ensure safe and efficient venting in your home—book professional cleaning with us today."
  },
  {
    "key": "chimney-tile-repair",
    "name": "Chimney Tile Repair",
    "category": "repair",
    "sort": 52,
    "cardCopyTemplate": "Damaged chimney tiles can lead to inefficiencies or potential fire hazards. Our chimney tile repair in {{city.name}}, {{state.code}} restores safety and proper system performance. Call us to repair cracked or missing tiles today for worry-free operation."
  },
  {
    "key": "chimney-liner-maintenance",
    "name": "Chimney Liner Maintenance",
    "category": "sweep",
    "sort": 53,
    "cardCopyTemplate": "Enhancing safety and efficiency, chimney liner maintenance in {{city.name}}, {{state.code}} is vital for homes facing harsh winter conditions. Regular upkeep safeguards against moisture intrusion and ensures your fireplace operates within code compliance. Schedule service today."
  },
  {
    "key": "chimney-fire-damage-repair",
    "name": "Chimney Fire Damage Repair",
    "category": "repair",
    "sort": 54,
    "cardCopyTemplate": "Following chimney fires, residents in {{city.name}}, {{state.code}} rely on thorough repair services to restore safety and structural stability. Addressing heat-related cracks and creosote damage helps prevent future hazards. Get your chimney back to peak condition—reach out now."
  },
  {
    "key": "chimney-repair",
    "name": "Chimney Repair",
    "category": "repair",
    "sort": 55,
    "cardCopyTemplate": "Chimney repair in {{city.name}}, {{state.code}} ensures your masonry withstands seasonal changes and local weather extremes. Promptly addressing issues like leaks or cracks avoids costly repairs down the road. Let us keep your chimney safe and efficient—contact us today."
  },
  {
    "key": "chimney-insulation-installation",
    "name": "Chimney Insulation Installation",
    "category": "repair",
    "sort": 56,
    "cardCopyTemplate": "Proper chimney insulation installation in {{city.name}}, {{state.code}} enhances heat retention and prevents moisture intrusion during the colder months. Stay safer while improving energy efficiency and reducing wear on your system. Trust our team for expert installation today."
  },
  {
    "key": "chimney-flashing-installation",
    "name": "Chimney Flashing Installation",
    "category": "repair",
    "sort": 57,
    "cardCopyTemplate": "Durable chimney flashing installation in {{city.name}}, {{state.code}} protects against water leaks and roofline damage caused by seasonal rains and snow. Maintain your home’s integrity and reduce long-term repair costs with expert services—schedule your appointment today."
  },
  {
    "key": "chimney-tuckpointing",
    "name": "Chimney Tuckpointing",
    "category": "repair",
    "sort": 58,
    "cardCopyTemplate": "Extend the lifespan of your chimney with professional tuckpointing in {{city.name}}, {{state.code}}. By replacing deteriorated mortar, we restore structural integrity and protect against moisture damage. Preserve your home’s value—book your tuckpointing service today."
  },
  {
    "key": "chimney-structural-repair",
    "name": "Chimney Structural Repair",
    "category": "repair",
    "sort": 59,
    "cardCopyTemplate": "Structural chimney repair in {{city.name}}, {{state.code}} addresses cracks, leaning, and other integrity issues caused by age or weather. Restore the stability and safety of your chimney with our specialized masonry team. Call us now for reliable, lasting results."
  },
  {
    "key": "gas-fireplace-repair",
    "name": "Gas Fireplace Repair",
    "category": "gas",
    "sort": 60,
    "cardCopyTemplate": "Gas fireplace repair in {{city.name}}, {{state.code}} keeps your home warm and cozy during the chilly months. From ignition issues to valve checks, we ensure smooth, safe operation. Let us maintain your fireplace’s efficiency—schedule your repair today."
  },
  {
    "key": "chimney-heat-shield-installation",
    "name": "Chimney Heat Shield Installation",
    "category": "repair",
    "sort": 61,
    "cardCopyTemplate": "Chimney heat shield installation in {{city.name}}, {{state.code}} minimizes risks from heat transfer and strengthens your flue’s durability. This upgrade ensures safer, more efficient fireplace use in cold weather. Contact us for expert installation assistance today."
  },
  {
    "key": "chimney-flashing-sealing",
    "name": "Chimney Flashing Sealing",
    "category": "repair",
    "sort": 62,
    "cardCopyTemplate": "Prevent leaks and water damage with professional chimney flashing sealing in {{city.name}}, {{state.code}}. Proper sealing ensures long-term protection against moisture intrusion at the roofline. Don’t wait until the rainy season—schedule sealing services now."
  },
  {
    "key": "chimney-chase-cover",
    "name": "Chimney Chase Cover",
    "category": "caps",
    "sort": 63,
    "cardCopyTemplate": "Protect your chimney from weather and debris with a durable chase cover in {{city.name}}, {{state.code}}. High-quality installations safeguard against rust and water pooling, extending your chimney’s life. Call our experts for a replacement or upgrade today."
  },
  {
    "key": "chimney-brick-replacement",
    "name": "Chimney Brick Replacement",
    "category": "repair",
    "sort": 64,
    "cardCopyTemplate": "Cracked or missing bricks? Our chimney brick replacement services in {{city.name}}, {{state.code}} restore both beauty and strength to your chimney. Addressing brick issues promptly prevents further structural damage. Contact us today to schedule expert repairs."
  },
  {
    "key": "air-duct-cleaning",
    "name": "Air Duct Cleaning",
    "category": "sweep",
    "sort": 65,
    "cardCopyTemplate": "Improve indoor air quality and HVAC efficiency with air duct cleaning in {{city.name}}, {{state.code}}. Removing dust and allergens benefits homes with pets, allergies, or aging systems. Keep your home healthier—schedule air duct cleaning now."
  },
  {
    "key": "chimney-roof-repair",
    "name": "Chimney Roof Repair",
    "category": "repair",
    "sort": 66,
    "cardCopyTemplate": "Protect your chimney and roofline with expert chimney roof repair in {{city.name}}, {{state.code}}. We address leaks, storm damage, and structural issues to restore safety. Preserve your home’s investment—book a repair evaluation today."
  },
  {
    "key": "chimney-firebox-repair",
    "name": "Chimney Firebox Repair",
    "category": "repair",
    "sort": 67,
    "cardCopyTemplate": "Worn or damaged fireboxes can compromise your safety. Professional firebox repair in {{city.name}}, {{state.code}} ensures optimal heat containment and structural integrity. Keep your fireplace safe for use—schedule repairs today."
  },
  {
    "key": "chimney-mortar-repair",
    "name": "Chimney Mortar Repair",
    "category": "repair",
    "sort": 68,
    "cardCopyTemplate": "Extend the life of your chimney with dedicated mortar repair in {{city.name}}, {{state.code}}. We replace cracking or failing mortar joints to restore structural soundness and weather resistance. Protect your chimney—schedule service today."
  },
  {
    "key": "chimney-spark-arrestor-installation",
    "name": "Chimney Spark Arrestor Installation",
    "category": "caps",
    "sort": 69,
    "cardCopyTemplate": "Protect your home in {{city.name}}, {{state.code}} from stray sparks and debris with our professional chimney spark arrestor installation services. This essential upgrade enhances safety, improves efficiency, and meets local building codes, keeping your chimney safe and compliant. Schedule service today."
  },
  {
    "key": "fireplace-inspection",
    "name": "Fireplace Inspection",
    "category": "inspection",
    "sort": 70,
    "cardCopyTemplate": "Ensure the safety and efficiency of your fireplace in {{city.name}}, {{state.code}} with our thorough fireplace inspection services. We identify potential issues like damage, blockages, and safety concerns, keeping your home warm and safe for years to come. Schedule an inspection today."
  },
  {
    "key": "chimney-vent-replacement",
    "name": "Chimney Vent Replacement",
    "category": "repair",
    "sort": 71,
    "cardCopyTemplate": "Optimize the performance of your chimney system with professional chimney vent replacement services in {{city.name}}, {{state.code}}. This service ensures proper airflow, reducing moisture intrusion and enhancing home safety. Contact us today for expert assistance."
  },
  {
    "key": "fireplace-damper-installation",
    "name": "Fireplace Damper Installation",
    "category": "gas",
    "sort": 72,
    "cardCopyTemplate": "Upgrade your fireplace in {{city.name}}, {{state.code}} with a new damper to improve energy efficiency and prevent drafts. Our expert installation helps maintain proper venting while keeping warmth indoors during colder seasons. Schedule your service today."
  },
  {
    "key": "chimney-tile-replacement",
    "name": "Chimney Tile Replacement",
    "category": "repair",
    "sort": 73,
    "cardCopyTemplate": "Restore the integrity of your chimney with our chimney tile replacement services in {{city.name}}, {{state.code}}. Damaged tiles can compromise efficiency and safety, but we ensure your chimney system is strong and functional. Reach out to us for an evaluation today."
  },
  {
    "key": "chimney-leak-repair",
    "name": "Chimney Leak Repair",
    "category": "repair",
    "sort": 74,
    "cardCopyTemplate": "Stop water intrusion and prevent costly damage with professional chimney leak repair in {{city.name}}, {{state.code}}. We quickly address leaks to protect masonry and prevent moisture-related issues. Your chimney’s health is our priority—call today for help."
  },
  {
    "key": "chimney-spark-arrestor-repair",
    "name": "Chimney Spark Arrestor Repair",
    "category": "caps",
    "sort": 75,
    "cardCopyTemplate": "Keep your chimney and home safe with professional chimney spark arrestor repair in {{city.name}}, {{state.code}}. Damaged spark arrestors fail to block sparks effectively, compromising fire prevention and safety. Contact us today for reliable repairs."
  },
  {
    "key": "chimney-flue-sealing",
    "name": "Chimney Flue Sealing",
    "category": "repair",
    "sort": 76,
    "cardCopyTemplate": "Ensure your chimney is airtight and efficient with professional flue sealing services in {{city.name}}, {{state.code}}. By addressing gaps or cracks, we boost efficiency and prevent heat loss while keeping moisture out. Schedule sealing services today."
  },
  {
    "key": "chimney-smoke-problem-repair",
    "name": "Chimney Smoke Problem Repair",
    "category": "repair",
    "sort": 77,
    "cardCopyTemplate": "Eliminate smoky issues disrupting your home in {{city.name}}, {{state.code}} with our expert chimney smoke problem repair services. We identify and resolve draft or creosote issues so your fireplace works safely and efficiently. Call us to fix your chimney today."
  },
  {
    "key": "chimney-liner-cleaning",
    "name": "Chimney Liner Cleaning",
    "category": "sweep",
    "sort": 78,
    "cardCopyTemplate": "Maintain your chimney’s performance with professional chimney liner cleaning services in {{city.name}}, {{state.code}}. Removing creosote buildup enhances airflow, improves safety, and reduces fire risks. Reach out today to schedule regular maintenance."
  },
  {
    "key": "chimney-relining",
    "name": "Chimney Relining",
    "category": "repair",
    "sort": 79,
    "cardCopyTemplate": "Extend the life of your chimney and improve its efficiency with our comprehensive relining services in {{city.name}}, {{state.code}}. We use high-quality materials to ensure structural integrity and safety. Call us today to revitalize your chimney."
  },
  {
    "key": "chimney-spark-arrestor-cleaning",
    "name": "Chimney Spark Arrestor Cleaning",
    "category": "caps",
    "sort": 80,
    "cardCopyTemplate": "Keep your spark arrestor functioning properly with expert cleaning services in {{city.name}}, {{state.code}}. This essential maintenance ensures safety and prevents harmful blockages caused by soot and debris. Contact us today for reliable service."
  },
  {
    "key": "chimney-flue-waterproofing",
    "name": "Chimney Flue Waterproofing",
    "category": "repair",
    "sort": 81,
    "cardCopyTemplate": "Protect your chimney from moisture damage with professional flue waterproofing in {{city.name}}, {{state.code}}. Our service safeguards against leaks and extends the life of your chimney system. Choose long-term protection—schedule today."
  },
  {
    "key": "chimney-odor-removal",
    "name": "Chimney Odor Removal",
    "category": "sweep",
    "sort": 82,
    "cardCopyTemplate": "Eliminate unwanted odors from your chimney with our professional odor removal services in {{city.name}}, {{state.code}}. We address the root cause—be it buildup, moisture, or nesting material—to restore a fresh, clean atmosphere. Schedule your service today."
  },
  {
    "key": "chimney-liner-inspection",
    "name": "Chimney Liner Inspection",
    "category": "inspection",
    "sort": 83,
    "cardCopyTemplate": "Prioritize safety with a comprehensive chimney liner inspection in {{city.name}}, {{state.code}}. We verify your liner’s condition and identify any damage that might impact your home’s safety or efficiency. Schedule a professional inspection today."
  },
  {
    "key": "chimney-liner-installation",
    "name": "Chimney Liner Installation",
    "category": "repair",
    "sort": 84,
    "cardCopyTemplate": "Enhance your chimney’s safety and compliance with expert liner installation in {{city.name}}, {{state.code}}. Whether stainless steel or clay, our liners offer unmatched durability and efficiency. Start your upgrade today by contacting our team."
  },
  {
    "key": "chimney-cap-repair",
    "name": "Chimney Cap Repair",
    "category": "caps",
    "sort": 85,
    "cardCopyTemplate": "Prevent water and debris from compromising your chimney with our reliable chimney cap repair in {{city.name}}, {{state.code}}. A properly maintained cap ensures optimal performance and protects against costly repairs. Schedule your service now."
  },
  {
    "key": "chimney-preventive-maintenance",
    "name": "Chimney Preventive Maintenance",
    "category": "sweep",
    "sort": 86,
    "cardCopyTemplate": "Extend the life of your chimney with regularly scheduled preventive maintenance in {{city.name}}, {{state.code}}. From inspections to cleanings, our services maximize efficiency and safety. Protect your chimney—book maintenance today."
  },
  {
    "key": "chimney-animal-removal",
    "name": "Chimney Animal Removal",
    "category": "sweep",
    "sort": 87,
    "cardCopyTemplate": "Protect your home from unwanted intrusions with humane chimney animal removal services in {{city.name}}, {{state.code}}. Our experts safely remove birds, raccoons, and squirrels while preventing future nesting. Call us today for peace of mind."
  },
  {
    "key": "chimney-rebuild",
    "name": "Chimney Rebuild",
    "category": "repair",
    "sort": 88,
    "cardCopyTemplate": "Restore your chimney’s beauty and strength with comprehensive rebuild services in {{city.name}}, {{state.code}}. We use durable materials to ensure optimal performance and safety for years to come. Contact us today to start your project."
  },
  {
    "key": "chimney-cap-replacement",
    "name": "Chimney Cap Replacement",
    "category": "caps",
    "sort": 89,
    "cardCopyTemplate": "Upgrade your chimney’s protection with chimney cap replacement in {{city.name}}, {{state.code}}. Our custom-fit caps shield your chimney from harsh weather conditions, moisture, and debris. Schedule your replacement today for effective protection."
  },
  {
    "key": "chimney-nest-removal",
    "name": "Chimney Nest Removal",
    "category": "sweep",
    "sort": 90,
    "cardCopyTemplate": "Ensure safe and efficient operation of your chimney with nest removal services in {{city.name}}, {{state.code}}. We remove blockages caused by birds and animals, restoring proper airflow and reducing fire risks. Schedule today for quick, effective service."
  },
  {
    "key": "fireplace-smoke-repair",
    "name": "Fireplace Smoke Repair",
    "category": "gas",
    "sort": 91,
    "cardCopyTemplate": "Stop smoky issues in your {{city.name}}, {{state.code}} fireplace with expert repair services. Whether caused by draft problems or buildup, our team ensures safe, efficient operation. Schedule a repair today for clean, cozy fires."
  }
];
