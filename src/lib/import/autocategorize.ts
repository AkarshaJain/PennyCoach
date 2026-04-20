/**
 * Free deterministic merchant → category rules.
 *
 * This replaces what paid bank-aggregator APIs do, using plain keyword matching
 * on the merchant/description string. Each rule maps a regex (case-insensitive)
 * to a default category slug. The first matching rule wins.
 *
 * Users can always correct the category in the preview before committing.
 */

interface Rule {
  pattern: RegExp;
  slug: string;
}

const RULES: Rule[] = [
  // Income-like
  { pattern: /\b(payroll|paycheck|direct deposit|salary|acme inc|employer|adp\b|gusto|intuit qb)\b/i, slug: "salary" },
  { pattern: /\b(refund|reimburs|venmo cashout|paypal refund)\b/i, slug: "refund" },
  { pattern: /\b(dividend|interest paid|div pay|int pay)\b/i, slug: "interest" },

  // Fixed
  { pattern: /\b(rent|greystar|avalon|equity residential|landlord|property mgmt)\b/i, slug: "rent" },
  { pattern: /\b(mortgage|rocket mortgage|wells fargo home|chase home)\b/i, slug: "rent" },
  { pattern: /\b(toyota financial|ford credit|honda financial|auto loan|car payment|capital one auto)\b/i, slug: "auto-loan" },
  { pattern: /\b(nelnet|great lakes|navient|sallie mae|student loan|mohela|edfinancial)\b/i, slug: "student-loan" },
  { pattern: /\b(geico|progressive|state farm|allstate|liberty mutual|farmers ins|usaa ins|nationwide ins)\b/i, slug: "insurance" },
  { pattern: /\b(duke energy|con edison|pg&e|socal edison|dominion|nationalgrid|xcel|pse&g|coned)\b/i, slug: "electricity" },
  { pattern: /\b(natural gas|socal gas|nicor|columbia gas|atmos energy)\b/i, slug: "gas-utility" },
  { pattern: /\b(water|sewer|trash|sanitation|waste management|republic services)\b/i, slug: "water" },
  { pattern: /\b(xfinity|comcast|spectrum|verizon fios|at&t internet|google fiber|cox comm)\b/i, slug: "internet" },
  { pattern: /\b(t-mobile|tmobile|verizon wireless|at&t mobility|mint mobile|google fi|visible)\b/i, slug: "phone" },
  { pattern: /\b(netflix|spotify|hulu|disney\+?|apple\.com\/bill|icloud|hbo max|paramount|apple tv|youtube premium|nytimes|wsj|nyt)\b/i, slug: "subscriptions" },
  { pattern: /\b(planet fitness|equinox|24 hour fitness|la fitness|crunch fitness|peloton)\b/i, slug: "gym" },
  { pattern: /\b(kindercare|bright horizons|daycare|tuition|preschool)\b/i, slug: "childcare" },
  { pattern: /\b(hoa|property tax|county tax|condo assoc)\b/i, slug: "hoa" },

  // Groceries
  { pattern: /\b(trader joe'?s|whole foods|kroger|safeway|publix|walmart neighborhood|walmart groc|albertsons|wegmans|sprouts|aldi|giant food|heb|food lion|meijer|costco whse|sam'?s club)\b/i, slug: "groceries" },

  // Takeout / delivery
  { pattern: /\b(doordash|uber eats|grubhub|postmates|seamless|caviar|instacart)\b/i, slug: "takeout" },

  // Dining
  { pattern: /\b(chipotle|panera|shake shack|five guys|in-n-out|olive garden|applebee|chili'?s|cheesecake factory|outback|texas roadhouse|ihop|denny|waffle house|red lobster|taco bell|mcdonald|burger king|wendy|kfc|subway|popeye|panda express|dominos|pizza hut|papa john|chick-fil-a)\b/i, slug: "dining-out" },

  // Coffee
  { pattern: /\b(starbucks|dunkin|peet'?s|caribou|blue bottle|philz)\b/i, slug: "coffee" },

  // Fuel
  { pattern: /\b(shell|exxon|mobil|chevron|bp\b|arco|valero|marathon|speedway|7-eleven gas|wawa|sheetz|circle k|costco gas|sam'?s gas|citgo|sunoco)\b/i, slug: "fuel" },

  // Transit
  { pattern: /\b(mta|bart|cta|wmata|septa|caltrain|metro transit|transit authority|amtrak)\b/i, slug: "public-transit" },
  { pattern: /\b(uber\b(?! eats)|lyft|curb ride)\b/i, slug: "rideshare" },
  { pattern: /\b(parking|parkmobile|spothero|paybyphone)\b/i, slug: "parking" },
  { pattern: /\b(toll|e-zpass|sunpass|fastrak|i-pass)\b/i, slug: "parking" },

  // Medical
  { pattern: /\b(cvs|walgreens|rite aid|pharmacy|dentist|orthodonti|optical|optometr|md\b|md\s|medical|clinic|hospital|urgent care|er bill|lab corp|quest diagnost)\b/i, slug: "medical" },

  // Shopping
  { pattern: /\b(amazon|amzn mktp|amazon\.com|target|best buy|macy'?s|nordstrom|kohls|tjmaxx|marshalls|ross stores|gap|old navy|banana republic|uniqlo|h&m|zara|sephora|ulta|ebay|etsy|apple store|microsoft store|bestbuy)\b/i, slug: "shopping" },

  // Entertainment
  { pattern: /\b(amc theat|regal cinema|cinemark|movie tavern|ticketmaster|stubhub|steam\.com|playstation|xbox|nintendo|goingpopping)\b/i, slug: "entertainment" },

  // Travel
  { pattern: /\b(airbnb|booking\.com|hotels\.com|expedia|priceline|kayak|marriott|hilton|hyatt|ihg|delta air|united airlines|american airlines|southwest|jetblue|alaska air|spirit air|frontier air|uber airport|lyft airport|hertz|avis|enterprise rent|budget car|turo|aa\.com|ual\.com|southwest\.com)\b/i, slug: "travel" },

  // Pets
  { pattern: /\b(petsmart|petco|chewy|bark\.co|rover|vca animal|banfield pet|vet hospital)\b/i, slug: "pets" },

  // Household
  { pattern: /\b(ikea|home depot|lowes|ace hardware|bed bath|container store|wayfair|crate & barrel|pottery barn|west elm)\b/i, slug: "household" },

  // Personal care
  { pattern: /\b(salon|barber|great clips|supercuts|nail bar|spa\b|massage envy)\b/i, slug: "personal-care" },

  // Charity
  { pattern: /\b(red cross|unicef|united way|salvation army|goodfund|go fund me|gofundme|church|mosque|synagogue)\b/i, slug: "charity" },

  // Retirement / HSA — these must fire BEFORE the generic investments rule
  // so a line like "401K CONTRIBUTION FIDELITY" lands in retirement-401k.
  { pattern: /\b401\s*\(?k\)?|401k contrib(ution)?|employer match\b/i, slug: "retirement-401k" },
  { pattern: /\b(roth ira|traditional ira|ira contrib(ution)?)\b/i, slug: "retirement-ira" },
  { pattern: /\b(hsa\b|fsa\b|health savings|health saving)\b/i, slug: "hsa" },

  // Investments
  { pattern: /\b(vanguard|fidelity|schwab|robinhood|etrade|sofi invest|wealthfront|betterment|m1 finance|acorns|public\.com|coinbase|gemini|kraken)\b/i, slug: "investments" },

  // Taxes (US)
  { pattern: /\b(irs\b|us treasury|us treas|state tax|estimated tax|franchise tax|property tax)\b/i, slug: "taxes" },

  // Health insurance (separate from general insurance)
  { pattern: /\b(anthem|aetna|cigna|kaiser|humana|blue cross|blue shield|uhc|unitedhealth)\b/i, slug: "health-insurance" },

  // Credit card payments (payment TO a credit card account)
  { pattern: /\b(chase card|amex epayment|discover card pmt|capital one card pmt|citi card pmt|credit card payment|cc payment|online payment thank you)\b/i, slug: "credit-card-payment" },

  // Home maintenance
  { pattern: /\b(angi\b|home depot install|plumber|electrician|hvac|handyman|lawn care|pest control|roof(er|ing))\b/i, slug: "home-maintenance" },

  // Fees
  { pattern: /\b(atm fee|overdraft|service charge|maintenance fee|late fee|bank fee|wire fee|foreign fee)\b/i, slug: "fees" },
];

/**
 * Guess the category slug for a free-text merchant/description. Returns null
 * if no rule matches so the UI can prompt the user to pick one.
 */
export function guessCategorySlug(merchantOrNote: string | null): string | null {
  if (!merchantOrNote) return null;
  const s = merchantOrNote.trim();
  if (!s) return null;
  for (const rule of RULES) {
    if (rule.pattern.test(s)) return rule.slug;
  }
  return null;
}

/** Guess the payment method from a merchant string. Best-effort. */
export function guessPaymentMethod(note: string | null): string | null {
  if (!note) return null;
  if (/\bzelle\b/i.test(note)) return "ZELLE";
  if (/\bvenmo\b/i.test(note)) return "VENMO";
  if (/\bpaypal\b/i.test(note)) return "PAYPAL";
  if (/\bapple pay|applepay\b/i.test(note)) return "APPLE_PAY";
  if (/\bgoogle pay|gpay\b/i.test(note)) return "GOOGLE_PAY";
  if (/\bACH\b|direct deposit|payroll/i.test(note)) return "ACH";
  if (/\bcheck\b|check #/i.test(note)) return "CHECK";
  if (/\bautopay|auto pay|recurring\b/i.test(note)) return "AUTOPAY";
  if (/\bdebit\b|\bpos\b/i.test(note)) return "DEBIT_CARD";
  if (/\bcredit\b/i.test(note)) return "CREDIT_CARD";
  return null;
}
