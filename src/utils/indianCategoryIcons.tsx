import React from 'react';
import {
	ShoppingBag,
	ShoppingCart,
	Utensils,
	Coffee,
	Car,
	Train,
	Plane,
	Fuel,
	HeartPulse,
	Film,
	Receipt,
	Zap,
	Smartphone,
	Home,
	Sparkles,
	Flame,
	BookOpen,
	Gift,
	Landmark,
	Wrench,
	PawPrint,
	Wine,
	Tag,
	Users,
	ArrowDownLeft,
} from 'lucide-react';

export interface CategoryVisual {
	icon: React.ReactNode;
	bg: string;
	category: string;
	iconName: string;
}

interface GetCategoryVisualOptions {
	category?: string;
	description?: string;
	isIncome?: boolean;
	isSplit?: boolean;
	iconSize?: number;
	strokeWidth?: number;
}

/**
 * Maps input text (description + category) to appropriate visual cues (icon, background tint, category)
 * with dedicated support for Indian words, foods, transit, utilities, slang, and brands.
 */
export function getCategoryVisual(
	categoryOrOptions?: string | GetCategoryVisualOptions,
	rawDescription = '',
	rawIsIncome = false,
	rawIsSplit = false
): CategoryVisual {
	let category = '';
	let description = '';
	let isIncome = false;
	let isSplit = false;
	let size = 18;
	let stroke = 1.75;

	if (typeof categoryOrOptions === 'object' && categoryOrOptions !== null) {
		category = categoryOrOptions.category || '';
		description = categoryOrOptions.description || '';
		isIncome = Boolean(categoryOrOptions.isIncome);
		isSplit = Boolean(categoryOrOptions.isSplit);
		if (categoryOrOptions.iconSize) size = categoryOrOptions.iconSize;
		if (categoryOrOptions.strokeWidth) stroke = categoryOrOptions.strokeWidth;
	} else {
		category = categoryOrOptions || '';
		description = rawDescription || '';
		isIncome = rawIsIncome;
		isSplit = rawIsSplit;
	}

	// 1. Explicit income handling
	if (isIncome) {
		return {
			icon: <ArrowDownLeft size={size} strokeWidth={2} />,
			bg: 'bg-mint/40 text-mint-deep',
			category: 'Income',
			iconName: 'ArrowDownLeft',
		};
	}

	const text = `${category} ${description}`.trim().toLowerCase();

	// If no description or category provided and it's a split expense
	if (!text && isSplit) {
		return {
			icon: <Users size={size} strokeWidth={stroke} />,
			bg: 'bg-lavender/40 text-lavender-deep',
			category: 'Split',
			iconName: 'Users',
		};
	}

	// 2. Chai, Tea, Coffee & Indian Traditional Beverages
	if (
		/\b(chai|chaha|chaai|chaye|tapri|kulhad|cutting|kadak|tea|tea stall|coffee|filter coffee|kaapi|latte|cappuccino|starbucks|ccd|cafe coffee day|blue tokai|third wave|barista|lassi|chaas|mattha|buttermilk|shikanji|nimbu pani|nimbu soda|sharbat|thandai|nariyal pani|coconut water|ganne ka ras|sugarcane juice|frooti|maaza|slice|badam milk|jaljeera|roohafza|bournvita|horlicks)\b/i.test(
			text
		)
	) {
		return {
			icon: <Coffee size={size} strokeWidth={stroke} />,
			bg: 'bg-amber-100 text-amber-800',
			category: 'Food',
			iconName: 'Coffee',
		};
	}

	// 3. Indian Sweets & Mithai
	if (
		/\b(mithai|halwa|gajar halwa|gulab jamun|rasgulla|rasmalai|kaju katli|jalebi|rabdi|kulfi|peda|barfi|milk cake|laddu|ladoo|motichoor|besan laddu|kheer|payasam|modak|sandesh|mysore pak|soan papdi|kalakand|imarti)\b/i.test(
			text
		)
	) {
		return {
			icon: <Utensils size={size} strokeWidth={stroke} />,
			bg: 'bg-amber-100 text-amber-800',
			category: 'Food',
			iconName: 'Utensils',
		};
	}

	// 4. Street Food, Snacks & Indian Delicacies
	if (
		/\b(samosa|samose|singara|kachori|pakora|pakoda|bhaji|bhajiya|vada|batata vada|vada pav|vadapav|pav bhaji|pavbhaji|misal pav|dabeli|poha|upma|sheera|idli|dosa|masala dosa|medu vada|uttapam|appam|paniyaram|paratha|parantha|aloo paratha|paneer paratha|gobi paratha|thepla|chole bhature|bhatura|bhature|kulcha|chole kulche|kathi roll|frankie|roll|shawarma|momo|momos|maggi|noodles|chowmein|manchurian|spring roll|chaat|panipuri|pani puri|golgappa|golgappe|puchka|gupchup|batasha|bhel|bhelpuri|sev puri|dahi puri|papdi chaat|aloo tikki|tikki|sandwich|burger|pizza|snack|snacks|nashta)\b/i.test(
			text
		)
	) {
		return {
			icon: <Utensils size={size} strokeWidth={stroke} />,
			bg: 'bg-orange-100 text-orange-800',
			category: 'Food',
			iconName: 'Utensils',
		};
	}

	// 5. Meals, Curries, Dhabas, Dining & Food Delivery
	if (
		/\b(food|lunch|dinner|breakfast|brunch|supper|meal|meals|biryani|biriyani|dum biryani|hyderabadi biryani|pulao|fried rice|khichdi|thali|rajma|rajma chawal|chole|chole chawal|kadhi|dal|daal|dal makhani|dal tadka|dal fry|paneer|shahi paneer|matar paneer|palak paneer|paneer butter masala|paneer tikka|butter chicken|chicken curry|chicken tikka|mutton|fish curry|prawn|egg curry|anda curry|bhurji|anda bhurji|paneer bhurji|roti|chapati|phulka|naan|tandoori|parotta|malabar parotta|tiffin|dabba|mess|bhojan|bhojnalaya|khana|dhaba|restaurant|hotel|udupi|darshini|canteen|food court|zomato|swiggy|eatclub|magicpin|dineout|behrouz|faasos|ovenstory|mcdonalds|kfc|dominos|subway|haldiram|bikanervala|saravana bhavan)\b/i.test(
			text
		)
	) {
		return {
			icon: <Utensils size={size} strokeWidth={stroke} />,
			bg: 'bg-orange-100 text-orange-800',
			category: 'Food',
			iconName: 'Utensils',
		};
	}

	// 6. Quick Commerce, Groceries, Kirana, Mandi, Daily Dairy & Provisions
	if (
		/\b(grocery|groceries|kirana|rashan|ration|dukaan|dukan|supermarket|dmart|d-mart|reliance fresh|reliance smart|nature's basket|spencer|zepto|blinkit|instamart|bigbasket|bb daily|bbinstant|otipy|country delight|dunzo|milk|doodh|curd|dahi|paneer|butter|maska|amul|mother dairy|nandini|verka|bread|pav|bun|eggs|anda|sabzi|sabji|tarkari|bhaji|mandi|subzi mandi|fruits|vegetables|phal|aloo|pyaz|tamatar|kanda|batata|onion|tomato|potato|adrak|lehsun|ginger|garlic|mirchi|chilli|dhaniya|coriander|palak|spinach|nimbu|lemon|kela|banana|aam|mango|seb|apple|atta|flour|aashirvaad|maida|besan|sooji|rava|chawal|rice|basmati|pulses|toor dal|moong|chana|tel|cooking oil|mustard oil|sarson tel|sunflower oil|ghee|desi ghee|masala|spices|haldi|turmeric|jeera|namak|salt|tata salt|sugar|cheeni|shakkar|gur|jaggery|chai patti|tea powder|namkeen|bhujia|sev|biscuit|biscuits|parle-g|toast|rusk)\b/i.test(
			text
		)
	) {
		return {
			icon: <ShoppingCart size={size} strokeWidth={stroke} />,
			bg: 'bg-emerald-100 text-emerald-800',
			category: 'Groceries',
			iconName: 'ShoppingCart',
		};
	}

	// 7. Auto, Cabs & Ride Hailing
	if (
		/\b(auto|rickshaw|auto rickshaw|auto fare|share auto|tuk tuk|e-rickshaw|erickshaw|toto|tempo|cab|cabs|taxi|kaali peeli|ola|uber|rapido|blu-smart|blusmart|indrive|yaatri|yatri|zoomcar|drivezy|revv)\b/i.test(
			text
		)
	) {
		return {
			icon: <Car size={size} strokeWidth={stroke} />,
			bg: 'bg-sky-100 text-sky-800',
			category: 'Travel',
			iconName: 'Car',
		};
	}

	// 8. Public Transit: Metro, Trains & Buses
	if (
		/\b(metro|delhi metro|namma metro|local train|local|train|trains|irctc|tatkal|railway|railways|rail|platform ticket|bus|buses|bus pass|redbus|abhibus|chalo|dtc|best|bmtc|msrtc|ksrtc|apsrtc|tsrtc|utc|volvo bus|sleeper bus)\b/i.test(
			text
		)
	) {
		return {
			icon: <Train size={size} strokeWidth={stroke} />,
			bg: 'bg-blue-100 text-blue-800',
			category: 'Travel',
			iconName: 'Train',
		};
	}

	// 9. Flights & Long Distance Travel
	if (
		/\b(flight|flights|plane|airplane|airfare|airport|indigo|air india|vistara|spicejet|akasa|akasa air|makemytrip|mmt|easemytrip|ixigo|cleartrip)\b/i.test(
			text
		)
	) {
		return {
			icon: <Plane size={size} strokeWidth={stroke} />,
			bg: 'bg-sky-100 text-sky-800',
			category: 'Travel',
			iconName: 'Plane',
		};
	}

	// 10. Fuel (Petrol, Diesel, CNG)
	if (
		/\b(petrol|diesel|cng|fuel|petrol pump|fuel pump|gas station|indian oil|iocl|bharat petroleum|bpcl|hpcl|hp petrol|shell petrol|nayara|fuel refill)\b/i.test(
			text
		)
	) {
		return {
			icon: <Fuel size={size} strokeWidth={stroke} />,
			bg: 'bg-amber-100 text-amber-800',
			category: 'Travel',
			iconName: 'Fuel',
		};
	}

	// 11. Vehicle Toll, Parking & Maintenance
	if (
		/\b(toll|fastag|fast tag|parking|parking fee|challan|traffic fine|puncture|puncher|hawa|tyre|tire|car wash|bike wash|car service|bike service|service center|engine oil|mobil oil|mechanic|garage)\b/i.test(
			text
		)
	) {
		return {
			icon: <Wrench size={size} strokeWidth={stroke} />,
			bg: 'bg-stone-100 text-stone-800',
			category: 'Travel',
			iconName: 'Wrench',
		};
	}

	// 12. General Travel fallback
	if (/\b(travel|trip|commute|tour)\b/i.test(text)) {
		return {
			icon: <Car size={size} strokeWidth={stroke} />,
			bg: 'bg-sky-100 text-sky-800',
			category: 'Travel',
			iconName: 'Car',
		};
	}

	// 13. Medicine, Pharmacy, Clinics & Healthcare
	if (
		/\b(medicine|medicines|dawa|dawai|dawaim|dawaiyaan|medical|chemist|pharmacy|medical store|apollo pharmacy|apollo|1mg|tata 1mg|pharmeasy|netmeds|medplus|generic medicine|jan aushadhi|paracetamol|dolo|dolo 650|crocin|calpol|combiflam|saridon|disprin|aspirin|vicks|cough syrup|benadryl|strepsils|otrivin|band-aid|bandage|dettol|savlon|betadine|soframycin|burnol|ors|electral|pudin hara|hajmola|digene|gelusil|eno|zandu balm|moov|iodex|volini|citrazin|cetirizine|montair lc|allegra|becosules|supradyn|neurobion|vitamin|zincovit|chyawanprash|doctor|dr|clinic|dispensary|hospital|doctor fee|consultation|opd|prescription|injection|saline|drip|stitches|pathology|blood test|urine test|lab test|lal pathlabs|thyrocare|metropolis|x-ray|xray|ultrasound|mri|ct scan|dentist|dental|teeth|tooth|rct|specs|spectacles|chashma|lenskart|titan eyeplus|health|pill|tablet)\b/i.test(
			text
		)
	) {
		return {
			icon: <HeartPulse size={size} strokeWidth={stroke} />,
			bg: 'bg-rose-100 text-rose-800',
			category: 'Health',
			iconName: 'HeartPulse',
		};
	}

	// 14. Electricity & Cooking Gas (Bijli & Gas)
	if (
		/\b(bijli|electricity|bijli bill|power bill|light bill|inverter|bses|uppcl|mseb|mahavitaran|bescom|cesc|tneb|tata power|torrent power|adani electricity|gas cylinder|cylinder|lpg|indane|bharat gas|hp gas|piped gas|png|igl|mgl|adani gas|gas booking)\b/i.test(
			text
		)
	) {
		return {
			icon: <Zap size={size} strokeWidth={stroke} />,
			bg: 'bg-amber-100 text-amber-800',
			category: 'Bills',
			iconName: 'Zap',
		};
	}

	// 15. Mobile Recharge & Broadband / Internet
	if (
		/\b(recharge|mobile recharge|phone recharge|jio|airtel|vi|vodafone|bsnl|sim card|data pack|wifi|broadband|fiber|fibernet|act fibernet|act fiber|jiofiber|airtel xtream|excitel|hathway|net bill|internet bill|dth|tata sky|tata play|dish tv|airtel dth)\b/i.test(
			text
		)
	) {
		return {
			icon: <Smartphone size={size} strokeWidth={stroke} />,
			bg: 'bg-blue-100 text-blue-800',
			category: 'Bills',
			iconName: 'Smartphone',
		};
	}

	// 16. Water & Maintenance Utilities
	if (
		/\b(paani|pani|water bill|water tanker|bisleri|water can|water jar|ro repair|aquaguard|kent ro|society maintenance|flat maintenance|building maintenance|rwa|property tax|house tax|municipal tax|nagar nigam|municipality|garbage fee|utility|utilities|bill|bills)\b/i.test(
			text
		)
	) {
		return {
			icon: <Receipt size={size} strokeWidth={stroke} />,
			bg: 'bg-cyan-100 text-cyan-800',
			category: 'Bills',
			iconName: 'Receipt',
		};
	}

	// 17. House Rent, PG & Housing
	if (
		/\b(rent|kiraya|ghar ka kiraya|flat rent|room rent|pg rent|pg|paying guest|hostel|hostel fee|brokerage|broker fee|advance deposit|security deposit|flatmate share)\b/i.test(
			text
		)
	) {
		return {
			icon: <Home size={size} strokeWidth={stroke} />,
			bg: 'bg-violet-100 text-violet-800',
			category: 'Bills',
			iconName: 'Home',
		};
	}

	// 18. Clothes, Ethnic Wear, Shoes, Tailor & Shopping
	if (
		/\b(shopping|clothes|clothing|kapde|kapda|kurta|kurti|saree|sari|suit|salwar|dupatta|lehenga|sherwani|dhoti|lungi|gamcha|vest|banyan|underwear|socks|jeans|denim|tshirt|t-shirt|shirt|shirts|pant|pants|trousers|shorts|track pants|jacket|hoodie|sweater|shawl|chappal|slippers|jutti|mojari|sandals|shoes|sneakers|heels|bata|darzi|tailor|stitching|alteration|bazaar|bazar|chor bazaar|sarojini|janpath|street shopping|amazon|flipkart|myntra|ajio|meesho|nykaa|purplle|tata cliq|shopsy|snapdeal|zara|h&m|westside|zudio|pantaloons|max fashion|trends|reliance trends|fabindia|manyavar)\b/i.test(
			text
		)
	) {
		return {
			icon: <ShoppingBag size={size} strokeWidth={stroke} />,
			bg: 'bg-pink-100 text-pink-800',
			category: 'Shopping',
			iconName: 'ShoppingBag',
		};
	}

	// 19. Grooming, Salon, Parlour & Beauty
	if (
		/\b(salon|saloon|parlour|parlor|beauty parlour|barber|nai|baal|haircut|hair cut|cutting|shaving|beard|beard trim|daadi|styling|hair spa|hair color|dye|mehendi|mehndi|henna|waxing|threading|eyebrow|facial|cleanup|manicure|pedicure|massage|champi|head massage|spa|urban company|uc salon|lakme salon|jawed habib|naturals salon|cosmetics|makeup|kajal|lipstick|perfume|ittar|attar|deo|deodrant|fog|sunscreen|face wash|moisturizer|beauty|grooming)\b/i.test(
			text
		)
	) {
		return {
			icon: <Sparkles size={size} strokeWidth={stroke} />,
			bg: 'bg-teal-100 text-teal-800',
			category: 'Health',
			iconName: 'Sparkles',
		};
	}

	// 20. Movies, Cinema, OTT & Entertainment
	if (
		/\b(movie|movies|film|cinema|theater|theatre|pvr|inox|cinepolis|bookmyshow|bms|movie ticket|popcorn|multiplex|amusement park|water park|wonderla|imagica|zoo|museum|mela|circus|bowling|arcade|gaming|playstation|turf|cricket turf|badminton court|ott|hotstar|jio cinema|disney hotstar|netflix|prime video|amazon prime|sonyliv|zee5|spotify|gaana|wynk|jiosaavn|youtube premium|yt premium|entertainment)\b/i.test(
			text
		)
	) {
		return {
			icon: <Film size={size} strokeWidth={stroke} />,
			bg: 'bg-purple-100 text-purple-800',
			category: 'Entertainment',
			iconName: 'Film',
		};
	}

	// 21. Puja, Mandir, Religious, Spiritual & Charity
	if (
		/\b(mandir|pooja|puja|temple|masjid|dargah|gurdwara|gurudwara|church|darshan|prasad|prasadam|bhog|chadhava|dakshina|donation|daan|dan|chanda|charity|langar|bhandara|gau seva|agarbatti|dhoop|diya|deepak|camphor|kapoor|chandan|sindoor|kumkum|haldi|gangajal|havan|samagri|nariyal|phool|garland|mala|pandit|pandit ji|pujari|katha|satyanarayan)\b/i.test(
			text
		)
	) {
		return {
			icon: <Flame size={size} strokeWidth={stroke} />,
			bg: 'bg-amber-100 text-amber-800',
			category: 'Other',
			iconName: 'Flame',
		};
	}

	// 22. Education, Tuition, Books & Xerox
	if (
		/\b(school|college|university|school fee|college fee|tuition|tution|coaching|coaching class|sir fee|mam fee|admission fee|exam fee|hall ticket|semester fee|allen|aakash|fiitjee|physics wallah|pw|byjus|unacademy|book|books|kitaben|textbook|ncert|notebook|copy|register|pen|pencil|stationery|stationery shop|stationary|xerox|zerox|photocopy|photo copy|print|printout|lamination|spiral binding|cyber cafe|education)\b/i.test(
			text
		)
	) {
		return {
			icon: <BookOpen size={size} strokeWidth={stroke} />,
			bg: 'bg-indigo-100 text-indigo-800',
			category: 'Bills',
			iconName: 'BookOpen',
		};
	}

	// 23. Investments, Savings, Gold & Insurance
	if (
		/\b(sip|mutual fund|stocks|shares|share market|zerodha|groww|angel one|upstox|crypto|bitcoin|fixed deposit|fd|recurring deposit|rd|ppf|epf|pf|nps|post office|sukanya|bishi|chit fund|chitty|kitty party|committee|gold|sona|silver|chandi|gold coin|sgb|jewellery|jewelry|tanishq|kalyan|malabar gold|caratlane|lic|lic premium|life insurance|term insurance|health insurance|mediclaim|policy)\b/i.test(
			text
		)
	) {
		return {
			icon: <Landmark size={size} strokeWidth={stroke} />,
			bg: 'bg-yellow-100 text-yellow-800',
			category: 'Other',
			iconName: 'Landmark',
		};
	}

	// 24. Gifts, Shagun, Celebrations & Festivals
	if (
		/\b(shagun|lifafa|salami|nek|gift|gifts|present|return gift|bouquet|birthday|bday|bday party|birthday cake|anniversary|anniversary gift|shaadi|shaddi|wedding|marriage|sangeet|haldi|reception|barat|roka|engagement|mundan|baby shower|diwali|dipawali|patakha|crackers|holi|gulal|pichkari|eid|sewai|iftar|rakhi|rakshabandhan|bhai dooj|karva chauth|teej|chhath|durga puja|pujo|navratri|garba|dandiya|ganesh chaturthi|ganpati|onam|pongal|sankranti|kite|patang|baisakhi|lohri|christmas|new year party)\b/i.test(
			text
		)
	) {
		return {
			icon: <Gift size={size} strokeWidth={stroke} />,
			bg: 'bg-fuchsia-100 text-fuchsia-800',
			category: 'Entertainment',
			iconName: 'Gift',
		};
	}

	// 25. Drinks, Beer, Theka & Party
	if (
		/\b(theka|daru|daaru|beer|whisky|whiskey|vodka|rum|old monk|gin|wine|liquor|alcohol|tasmac|wine shop|model shop|ahata|pub|brewery|chakhna|chakna|cold drink|thums up|sting)\b/i.test(
			text
		)
	) {
		return {
			icon: <Wine size={size} strokeWidth={stroke} />,
			bg: 'bg-rose-100 text-rose-800',
			category: 'Entertainment',
			iconName: 'Wine',
		};
	}

	// 26. Pets & Animal Care
	if (
		/\b(pet|dog|cat|puppy|kitten|dog food|cat food|pedigree|royal canin|vet|veterinary|vet clinic|pet clinic)\b/i.test(
			text
		)
	) {
		return {
			icon: <PawPrint size={size} strokeWidth={stroke} />,
			bg: 'bg-emerald-100 text-emerald-800',
			category: 'Other',
			iconName: 'PawPrint',
		};
	}

	// If it is a split transaction with no other match
	if (isSplit) {
		return {
			icon: <Users size={size} strokeWidth={stroke} />,
			bg: 'bg-lavender/40 text-lavender-deep',
			category: 'Split',
			iconName: 'Users',
		};
	}

	// Default fallback
	return {
		icon: <Tag size={size} strokeWidth={stroke} />,
		bg: 'bg-surface text-text-muted',
		category: category || 'Other',
		iconName: 'Tag',
	};
}

/**
 * Suggests an app category given freeform text (e.g. from typing a description or voice transcription)
 */
export function suggestCategoryFromText(text: string): string | null {
	if (!text || !text.trim()) return null;
	const visual = getCategoryVisual({ description: text });
	if (visual.iconName !== 'Tag' && visual.category) {
		return visual.category;
	}
	return null;
}
