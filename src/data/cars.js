(function initCarDatabase(root, factory) {
  const cars = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = cars;
  root.CarCompareDatabase = cars;
})(typeof globalThis !== "undefined" ? globalThis : this, function buildCarDatabase() {
  "use strict";

  // Assumption basis, May 2026:
  // - Values are source-informed estimates, not scraped live listings. They use official/WLTP/EPA/spec baselines,
  //   EU real-world consumption evidence, Portugal used-market bands, and owner/reliability heuristics.
  // - Portuguese used-price sanity checks used Standvirtual/OLX/PiscaPisca/AutoScout24/AutoUncle-style market ranges.
  // - EV consumption uses WLTP/spec baselines adjusted toward EV Database/Green NCAP/owner-report mixed use.
  // - Portugal IUC is estimated from fuel type, displacement/CO2 bands, and EV exemption context; exact values vary
  //   by registration date, import status, engine, CO2, municipality, and legal changes.
  // - Insurance uses Portugal market ranges by value/class, then scales for luxury, repair complexity, theft, and performance.
  // - Maintenance/repairs are annual reserves, not guaranteed spend; older and exotic cars include age/parts availability risk.
  // - resaleRetentionEstimate is the approximate retained share after the app default 7-year ownership period.
  const SHARED_SOURCE_NOTES = {
    ev: "Official WLTP/spec baseline plus EV Database/Green NCAP/owner-report style real-world adjustment; Portugal EV IUC assumed exempt.",
    mainstream: "Official mixed-cycle baseline adjusted above brochure/WLTP using European real-world fuel-use evidence and owner reports; Portugal IUC estimated by typical trim band.",
    luxury: "Official/spec baseline adjusted for heavy real-world use; Portugal costs estimated from premium insurance, dealer maintenance, and reliability/owner-cost reports.",
    supercar: "Low-confidence Europe/global owner-cost estimate using specialist service, tire/brake, insurance, and collector-market reports; Portugal-specific data is sparse.",
    classic: "Older-car estimate using owner-report economy and age-related repair reserve; resale may be collector-driven rather than ordinary depreciation.",
  };

  function profile(firstYearRetention, annualRetention, minRetention, note) {
    return { firstYearRetention, annualRetention, minRetention, note };
  }

  function extra(id, displayName, categoryGroup, category, price, energyType, fuelType, kwh, liters, maintenance, insurance, repairs, tax, profileValues, resale, notes, confidence, sourceNotes, market = "Portugal/EU") {
    return {
      id,
      displayName,
      brand: "",
      model: displayName,
      generation: "",
      yearRange: "",
      category,
      categoryGroup,
      categoryLabel: categoryGroup,
      powertrain: energyType === "electricity" ? "EV" : category === "hybrid" ? (String(fuelType || "").includes("plug-in") ? "plug-in hybrid" : "hybrid") : "combustion",
      segment: categoryGroup,
      marketContext: market,
      typicalMarket: market,
      defaultUpfrontPrice: price,
      energyType,
      fuelType,
      realWorldKwhPer100km: kwh,
      realWorldLitersPer100km: liters,
      maintenancePerYear: maintenance,
      insurancePerYear: insurance,
      repairsPerYear: repairs,
      taxPerYear: tax,
      depreciationProfile: profile(profileValues[0], profileValues[1], profileValues[2], profileValues[3]),
      resaleRetentionEstimate: resale,
      notes,
      confidence,
      sourceNotes,
    };
  }

  const EXTRA_CARS = [
    extra("toyota-aygo", "Toyota Aygo", "Cheap city cars", "combustion", 7000, "fuel", "petrol", 0, 5.1, 390, 270, 360, 65, [0.80, 0.91, 0.16, "Cheap city car with strong Toyota reliability and low tax."], 0.42, "Simple city car; realistic mixed use above brochure figures.", "medium", SHARED_SOURCE_NOTES.mainstream),
    extra("hyundai-i10", "Hyundai i10", "Cheap city cars", "combustion", 8000, "fuel", "petrol", 0, 5.3, 400, 290, 380, 70, [0.78, 0.90, 0.14, "Budget city car with low running costs."], 0.38, "Small petrol estimate; motorway use raises consumption.", "medium", SHARED_SOURCE_NOTES.mainstream),
    extra("kia-picanto", "Kia Picanto", "Cheap city cars", "combustion", 8500, "fuel", "petrol", 0, 5.4, 400, 290, 380, 70, [0.78, 0.90, 0.14, "Low-cost city car with simple maintenance."], 0.38, "Portugal/EU city-car estimate.", "medium", SHARED_SOURCE_NOTES.mainstream),
    extra("volkswagen-up", "Volkswagen Up!", "Cheap city cars", "combustion", 8500, "fuel", "petrol", 0, 5.2, 430, 300, 390, 70, [0.80, 0.91, 0.15, "Small VW with steady used demand."], 0.41, "Older small VW estimate; parts are modestly above Dacia/Fiat.", "medium", SHARED_SOURCE_NOTES.mainstream),
    extra("opel-corsa", "Opel Corsa", "Common small cars", "combustion", 10500, "fuel", "petrol/diesel", 0, 5.7, 500, 340, 470, 95, [0.78, 0.90, 0.14, "Common EU supermini with normal depreciation."], 0.37, "Blended petrol/diesel Corsa estimate.", "high", SHARED_SOURCE_NOTES.mainstream),
    extra("seat-ibiza", "SEAT Ibiza", "Common small cars", "combustion", 11500, "fuel", "petrol", 0, 5.8, 510, 350, 480, 100, [0.79, 0.905, 0.15, "VW-group supermini with moderate residuals."], 0.39, "Common Iberian-market petrol hatch estimate.", "high", SHARED_SOURCE_NOTES.mainstream),
    extra("skoda-fabia", "Skoda Fabia", "Common small cars", "combustion", 11500, "fuel", "petrol", 0, 5.6, 500, 340, 460, 95, [0.79, 0.91, 0.15, "Practical supermini with low-ish running costs."], 0.40, "EU owner-report adjusted estimate.", "high", SHARED_SOURCE_NOTES.mainstream),
    extra("nissan-micra", "Nissan Micra", "Common small cars", "combustion", 9000, "fuel", "petrol", 0, 5.6, 460, 320, 450, 90, [0.77, 0.895, 0.13, "Small used hatch; value and repair risk are age-sensitive."], 0.35, "Older/newer Micra blended estimate.", "medium", SHARED_SOURCE_NOTES.mainstream),
    extra("peugeot-208", "Peugeot 208", "Common small cars", "combustion", 14500, "fuel", "petrol/diesel", 0, 5.4, 540, 370, 520, 105, [0.78, 0.90, 0.14, "Popular supermini with normal EU depreciation."], 0.37, "Portugal/EU estimate for non-EV 208.", "high", SHARED_SOURCE_NOTES.mainstream),
    extra("renault-megane", "Renault Megane", "Common family cars", "combustion", 14500, "fuel", "petrol/diesel", 0, 5.9, 620, 420, 620, 150, [0.76, 0.89, 0.13, "Family hatch depreciation and repair risk are moderate."], 0.35, "EU family hatch estimate.", "medium", SHARED_SOURCE_NOTES.mainstream),
    extra("seat-leon", "SEAT Leon", "Common family cars", "combustion", 15500, "fuel", "petrol/diesel", 0, 5.9, 620, 430, 580, 150, [0.78, 0.90, 0.15, "Common VW-group family hatch with good parts availability."], 0.37, "Iberian-market family hatch estimate.", "high", SHARED_SOURCE_NOTES.mainstream),
    extra("skoda-octavia", "Skoda Octavia", "Common family cars", "combustion", 18000, "fuel", "petrol/diesel", 0, 5.7, 650, 440, 620, 165, [0.80, 0.91, 0.16, "Practical EU family car with steady used demand."], 0.42, "Often diesel/fleet-used; maintenance reserve includes mileage risk.", "high", SHARED_SOURCE_NOTES.mainstream),
    extra("ford-focus", "Ford Focus", "Common family cars", "combustion", 13500, "fuel", "petrol/diesel", 0, 6.1, 610, 410, 620, 150, [0.76, 0.89, 0.13, "Common family hatch with average residuals."], 0.35, "Portugal/EU mixed-use estimate.", "medium", SHARED_SOURCE_NOTES.mainstream),
    extra("hyundai-i30", "Hyundai i30", "Common family cars", "combustion", 14500, "fuel", "petrol/diesel", 0, 6.0, 570, 410, 520, 145, [0.78, 0.90, 0.14, "Mainstream hatch with warranty reputation supporting costs."], 0.37, "EU family hatch estimate.", "medium", SHARED_SOURCE_NOTES.mainstream),
    extra("kia-ceed", "Kia Ceed", "Common family cars", "combustion", 14500, "fuel", "petrol/diesel", 0, 5.9, 560, 410, 520, 145, [0.78, 0.90, 0.14, "Mainstream hatch with long-warranty reputation."], 0.37, "EU family hatch estimate.", "medium", SHARED_SOURCE_NOTES.mainstream),
    extra("volvo-v60", "Volvo V60", "Common family cars", "combustion", 26000, "fuel", "diesel/petrol", 0, 6.3, 850, 650, 850, 250, [0.76, 0.895, 0.13, "Premium-leaning estate with higher parts and insurance costs."], 0.34, "Europe estate estimate; plug-in versions not represented here.", "medium", SHARED_SOURCE_NOTES.luxury),

    extra("renault-arkana-hybrid", "Renault Arkana Hybrid", "Hybrids", "hybrid", 25000, "fuel", "petrol hybrid", 0, 5.3, 600, 520, 600, 130, [0.78, 0.90, 0.14, "Hybrid crossover with average residuals."], 0.37, "Non-plug-in hybrid; modeled as fuel-only.", "medium", SHARED_SOURCE_NOTES.mainstream),
    extra("kia-niro-hybrid", "Kia Niro Hybrid", "Hybrids", "hybrid", 24000, "fuel", "petrol hybrid", 0, 4.9, 560, 520, 540, 120, [0.81, 0.915, 0.17, "Efficient hybrid crossover with solid used demand."], 0.43, "Non-plug-in hybrid estimate.", "medium", SHARED_SOURCE_NOTES.mainstream),
    extra("hyundai-kona-hybrid", "Hyundai Kona Hybrid", "Hybrids", "hybrid", 22000, "fuel", "petrol hybrid", 0, 5.1, 550, 500, 540, 120, [0.80, 0.91, 0.16, "Small hybrid SUV with moderate residuals."], 0.42, "Non-plug-in hybrid estimate.", "medium", SHARED_SOURCE_NOTES.mainstream),
    extra("honda-jazz-hybrid", "Honda Jazz Hybrid", "Hybrids", "hybrid", 19000, "fuel", "petrol hybrid", 0, 4.5, 500, 390, 420, 90, [0.83, 0.925, 0.20, "Reliable small hybrid with strong practicality."], 0.48, "Urban-focused hybrid; motorway use increases fuel use.", "high", SHARED_SOURCE_NOTES.mainstream),
    extra("lexus-ux-hybrid", "Lexus UX Hybrid", "Hybrids", "hybrid", 30000, "fuel", "petrol hybrid", 0, 5.6, 720, 680, 650, 160, [0.80, 0.91, 0.16, "Premium compact hybrid with Lexus reliability offset."], 0.42, "Luxury compact hybrid estimate.", "medium", SHARED_SOURCE_NOTES.luxury),

    extra("fiat-500e", "Fiat 500e", "Cheap EVs", "ev", 17000, "electricity", null, 14.7, 0, 280, 380, 470, 0, [0.72, 0.875, 0.10, "Small EV residuals depend on range and battery health."], 0.29, "Small EV estimate; best for urban use.", "medium", SHARED_SOURCE_NOTES.ev),
    extra("renault-twingo-e-tech", "Renault Twingo E-Tech", "Cheap EVs", "ev", 14000, "electricity", null, 15.0, 0, 270, 330, 430, 0, [0.72, 0.875, 0.10, "City EV with limited range but low costs."], 0.29, "Urban EV estimate; motorway range is weak.", "medium", SHARED_SOURCE_NOTES.ev),
    extra("peugeot-e-208", "Peugeot e-208", "Cheap EVs", "ev", 21000, "electricity", null, 16.6, 0, 320, 460, 560, 0, [0.72, 0.88, 0.10, "Small EV depreciation pressured by fast-moving battery tech."], 0.30, "EV Database/owner-report adjusted estimate.", "medium", SHARED_SOURCE_NOTES.ev),
    extra("opel-corsa-e", "Opel Corsa-e", "Cheap EVs", "ev", 20000, "electricity", null, 16.8, 0, 320, 450, 560, 0, [0.72, 0.875, 0.10, "Small Stellantis EV residuals are moderate."], 0.29, "Similar platform assumptions to e-208.", "medium", SHARED_SOURCE_NOTES.ev),
    extra("skoda-enyaq", "Skoda Enyaq", "Common EVs", "ev", 33000, "electricity", null, 18.5, 0, 390, 620, 700, 0, [0.74, 0.885, 0.11, "Practical EV SUV with moderate depreciation."], 0.32, "Real-world adjusted MEB-platform estimate.", "medium", SHARED_SOURCE_NOTES.ev),
    extra("hyundai-kona-electric", "Hyundai Kona Electric", "Common EVs", "ev", 26000, "electricity", null, 16.2, 0, 340, 520, 580, 0, [0.75, 0.89, 0.12, "Efficient compact EV with decent residuals."], 0.34, "Owner-report adjusted estimate.", "medium", SHARED_SOURCE_NOTES.ev),
    extra("kia-niro-ev", "Kia Niro EV", "Common EVs", "ev", 29000, "electricity", null, 17.0, 0, 350, 560, 620, 0, [0.75, 0.89, 0.12, "Efficient family EV with good warranty reputation."], 0.34, "Owner-report adjusted estimate.", "medium", SHARED_SOURCE_NOTES.ev),
    extra("byd-atto-3", "BYD Atto 3", "Common EVs", "ev", 30000, "electricity", null, 17.8, 0, 350, 570, 650, 0, [0.72, 0.875, 0.10, "Newer BYD residuals still forming in Europe."], 0.29, "EU owner/report adjusted estimate.", "medium", SHARED_SOURCE_NOTES.ev),
    extra("mg-zs-ev", "MG ZS EV", "Common EVs", "ev", 24000, "electricity", null, 18.0, 0, 340, 500, 620, 0, [0.72, 0.875, 0.10, "Value EV SUV with uncertain long-term residuals."], 0.29, "Real-world adjusted estimate.", "medium", SHARED_SOURCE_NOTES.ev),

    extra("nissan-qashqai", "Nissan Qashqai", "SUVs", "combustion", 21000, "fuel", "petrol hybrid/mild hybrid", 0, 6.4, 650, 520, 640, 170, [0.78, 0.90, 0.15, "Very common crossover with average residuals."], 0.37, "Common Portugal/EU crossover estimate.", "high", SHARED_SOURCE_NOTES.mainstream),
    extra("renault-captur", "Renault Captur", "SUVs", "combustion", 17000, "fuel", "petrol", 0, 6.1, 560, 430, 560, 130, [0.77, 0.895, 0.14, "Small crossover depreciation is average."], 0.36, "Common compact crossover estimate.", "high", SHARED_SOURCE_NOTES.mainstream),
    extra("peugeot-3008", "Peugeot 3008", "SUVs", "combustion", 24000, "fuel", "petrol/diesel", 0, 6.4, 700, 560, 700, 190, [0.76, 0.89, 0.13, "Family SUV with higher tires and repair reserve."], 0.35, "EU SUV estimate; PHEV not represented.", "medium", SHARED_SOURCE_NOTES.mainstream),
    extra("volkswagen-tiguan", "Volkswagen Tiguan", "SUVs", "combustion", 28000, "fuel", "petrol/diesel", 0, 6.8, 760, 620, 760, 220, [0.78, 0.90, 0.15, "Popular SUV with good demand but VW repair costs."], 0.37, "EU SUV estimate.", "high", SHARED_SOURCE_NOTES.mainstream),
    extra("toyota-c-hr", "Toyota C-HR", "SUVs", "hybrid", 24500, "fuel", "petrol hybrid", 0, 5.2, 560, 520, 480, 120, [0.83, 0.92, 0.19, "Toyota hybrid crossover with strong residuals."], 0.47, "Non-plug-in hybrid SUV estimate.", "high", SHARED_SOURCE_NOTES.mainstream),
    extra("hyundai-tucson", "Hyundai Tucson", "SUVs", "combustion", 26000, "fuel", "petrol/diesel/hybrid", 0, 6.7, 700, 580, 650, 190, [0.78, 0.90, 0.15, "Family SUV with moderate residuals."], 0.37, "Blended non-plugin Tucson estimate.", "medium", SHARED_SOURCE_NOTES.mainstream),
    extra("kia-sportage", "Kia Sportage", "SUVs", "combustion", 27000, "fuel", "petrol/diesel/hybrid", 0, 6.7, 700, 590, 650, 190, [0.78, 0.90, 0.15, "Family SUV with warranty-supported demand."], 0.37, "Blended non-plugin Sportage estimate.", "medium", SHARED_SOURCE_NOTES.mainstream),
    extra("volvo-xc40", "Volvo XC40", "SUVs", "combustion", 30000, "fuel", "petrol/mild hybrid", 0, 7.1, 850, 700, 850, 240, [0.76, 0.895, 0.13, "Premium compact SUV with higher costs."], 0.34, "Non-EV XC40 estimate.", "medium", SHARED_SOURCE_NOTES.luxury),
    extra("toyota-land-cruiser", "Toyota Land Cruiser", "SUVs", "combustion", 65000, "fuel", "diesel", 0, 10.0, 1100, 1100, 1000, 480, [0.86, 0.94, 0.26, "Durable high-demand SUV with unusually strong residuals."], 0.57, "Large diesel 4x4 estimate; tax varies by registration.", "medium", SHARED_SOURCE_NOTES.mainstream),

    extra("volvo-s60", "Volvo S60", "Premium sedans", "combustion", 30000, "fuel", "petrol/diesel", 0, 7.0, 850, 700, 850, 260, [0.74, 0.885, 0.12, "Premium sedan with average depreciation."], 0.32, "Europe premium sedan estimate.", "medium", SHARED_SOURCE_NOTES.luxury),
    extra("lexus-is", "Lexus IS", "Premium sedans", "hybrid", 26000, "fuel", "petrol hybrid", 0, 6.0, 780, 650, 650, 180, [0.80, 0.91, 0.16, "Reliable premium hybrid with decent residuals."], 0.42, "Portugal availability varies; Europe/global fallback.", "medium", SHARED_SOURCE_NOTES.luxury),
    extra("audi-a6", "Audi A6", "Premium sedans", "combustion", 38000, "fuel", "diesel/petrol", 0, 7.0, 1150, 850, 1200, 330, [0.72, 0.875, 0.10, "Executive sedan depreciation and repair costs are high."], 0.29, "A6 non-S/RS estimate.", "medium", SHARED_SOURCE_NOTES.luxury),
    extra("bmw-5-series", "BMW 5 Series", "Premium sedans", "combustion", 40000, "fuel", "diesel/petrol", 0, 7.1, 1200, 900, 1300, 350, [0.72, 0.875, 0.10, "Executive sedan with premium repair risk."], 0.29, "520d/530i-style estimate.", "medium", SHARED_SOURCE_NOTES.luxury),
    extra("mercedes-e-class", "Mercedes-Benz E-Class", "Premium sedans", "combustion", 42000, "fuel", "diesel/petrol", 0, 7.0, 1250, 920, 1300, 350, [0.72, 0.875, 0.10, "Executive sedan costs above C-Class."], 0.29, "E200/E220d-style estimate.", "medium", SHARED_SOURCE_NOTES.luxury),

    extra("volvo-ex30", "Volvo EX30", "Premium EVs", "ev", 36000, "electricity", null, 17.5, 0, 420, 700, 760, 0, [0.70, 0.86, 0.09, "New premium compact EV residuals are uncertain."], 0.25, "Newer EV estimate; EU residuals still developing.", "medium", SHARED_SOURCE_NOTES.ev),
    extra("bmw-i4", "BMW i4", "Premium EVs", "ev", 52000, "electricity", null, 19.0, 0, 650, 1200, 1400, 0, [0.68, 0.855, 0.08, "Premium EV depreciation and repair costs are high."], 0.23, "Owner-report adjusted premium EV estimate.", "medium", SHARED_SOURCE_NOTES.ev),
    extra("audi-q4-e-tron", "Audi Q4 e-tron", "Premium EVs", "ev", 42000, "electricity", null, 19.5, 0, 550, 900, 1000, 0, [0.68, 0.855, 0.08, "Premium MEB EV with notable depreciation."], 0.23, "Real-world adjusted premium EV estimate.", "medium", SHARED_SOURCE_NOTES.ev),
    extra("mercedes-eqe", "Mercedes-Benz EQE", "Premium EVs", "ev", 65000, "electricity", null, 20.0, 0, 760, 1500, 1900, 0, [0.62, 0.82, 0.07, "Luxury EV depreciation is severe."], 0.16, "Premium EV estimate; resale risk high.", "medium", SHARED_SOURCE_NOTES.ev),
    extra("porsche-macan-electric", "Porsche Macan Electric", "Premium EVs", "ev", 78000, "electricity", null, 22.0, 0, 950, 1900, 1900, 0, [0.70, 0.87, 0.10, "Premium Porsche EV residuals uncertain but brand support helps."], 0.27, "Newer performance EV SUV estimate.", "low", SHARED_SOURCE_NOTES.ev),

    extra("mazda-mx-5", "Mazda MX-5", "Sports cars", "combustion", 23000, "fuel", "petrol", 0, 7.0, 650, 600, 550, 210, [0.84, 0.93, 0.22, "Light sports car with strong enthusiast residuals."], 0.52, "Simple sports car estimate.", "medium", SHARED_SOURCE_NOTES.mainstream),
    extra("toyota-gr86", "Toyota GR86", "Sports cars", "combustion", 35000, "fuel", "petrol", 0, 8.5, 760, 850, 700, 300, [0.84, 0.93, 0.22, "Limited enthusiast car with good residuals."], 0.52, "Performance use can raise tires/brakes beyond this reserve.", "medium", SHARED_SOURCE_NOTES.mainstream),
    extra("bmw-m3", "BMW M3", "Sports cars", "combustion", 80000, "fuel", "petrol", 0, 10.5, 1800, 1900, 2200, 600, [0.78, 0.91, 0.18, "M-car residuals are stronger than regular 3 Series but costs are high."], 0.40, "Performance sedan estimate.", "medium", SHARED_SOURCE_NOTES.luxury),
    extra("audi-rs3", "Audi RS3", "Sports cars", "combustion", 62000, "fuel", "petrol", 0, 9.5, 1400, 1500, 1700, 500, [0.80, 0.92, 0.20, "Desirable performance compact with strong demand."], 0.45, "Performance use can raise tire/brake costs.", "medium", SHARED_SOURCE_NOTES.luxury),
    extra("mercedes-amg-c63", "Mercedes-AMG C 63", "Sports cars", "combustion", 70000, "fuel", "petrol", 0, 11.0, 1700, 1800, 2200, 650, [0.74, 0.89, 0.14, "AMG costs are high and depreciation can be steep."], 0.33, "Performance sedan/coupe estimate.", "medium", SHARED_SOURCE_NOTES.luxury),
    extra("porsche-cayman", "Porsche Cayman", "Sports cars", "combustion", 62000, "fuel", "petrol", 0, 9.0, 1400, 1300, 1400, 430, [0.84, 0.935, 0.24, "Porsche sports cars hold value well."], 0.55, "Base/S Cayman style estimate.", "medium", "Porsche service-plan pricing and European owner-cost reports; Portugal insurance/tax estimated."),

    extra("range-rover-sport", "Range Rover Sport", "Luxury cars", "luxury", 85000, "fuel", "diesel/petrol", 0, 9.5, 2200, 2200, 3500, 650, [0.66, 0.84, 0.08, "Luxury SUV depreciation and repair risk are severe."], 0.20, "Portugal-specific data sparse; reliability risk reserve is intentional.", "low", SHARED_SOURCE_NOTES.luxury),
    extra("lexus-ls", "Lexus LS", "Luxury cars", "luxury", 65000, "fuel", "petrol/hybrid", 0, 8.8, 1250, 1300, 1400, 430, [0.72, 0.875, 0.10, "Luxury sedan depreciation with Lexus reliability offset."], 0.29, "Large luxury sedan estimate.", "medium", SHARED_SOURCE_NOTES.luxury),
    extra("audi-a8", "Audi A8", "Luxury cars", "luxury", 76000, "fuel", "diesel/petrol", 0, 8.6, 1750, 1500, 2600, 520, [0.66, 0.84, 0.08, "Flagship sedan depreciation is steep."], 0.20, "A8 non-S8 estimate.", "medium", SHARED_SOURCE_NOTES.luxury),
    extra("porsche-panamera", "Porsche Panamera", "Luxury cars", "luxury", 90000, "fuel", "petrol/hybrid", 0, 9.8, 2200, 2000, 2800, 650, [0.70, 0.87, 0.10, "Luxury performance sedan costs are high."], 0.27, "Panamera estimate; hybrid battery risk varies by generation.", "medium", SHARED_SOURCE_NOTES.luxury),

    extra("porsche-911-turbo", "Porsche 911 Turbo", "Supercars / collector cars", "supercar", 185000, "fuel", "petrol", 0, 11.5, 2600, 3500, 3200, 700, [0.88, 0.95, 0.30, "911 Turbo residuals are very strong but service costs are high."], 0.62, "Performance/collector Porsche estimate.", "medium", SHARED_SOURCE_NOTES.supercar),
    extra("ferrari-488", "Ferrari 488", "Supercars / collector cars", "supercar", 230000, "fuel", "petrol", 0, 14.0, 5500, 6500, 9000, 900, [0.82, 0.93, 0.25, "Modern Ferrari residuals are strong but ownership costs are high."], 0.52, "Specialist service and insurance estimate.", "low", SHARED_SOURCE_NOTES.supercar),
    extra("mclaren-720s", "McLaren 720S", "Supercars / collector cars", "supercar", 210000, "fuel", "petrol", 0, 13.5, 6500, 6500, 12000, 850, [0.72, 0.88, 0.16, "McLaren depreciation and repair uncertainty are high."], 0.30, "Specialist service estimate; Portugal data sparse.", "low", SHARED_SOURCE_NOTES.supercar),
    extra("lamborghini-huracan", "Lamborghini Huracan", "Supercars / collector cars", "supercar", 220000, "fuel", "petrol", 0, 14.5, 5000, 6500, 8500, 900, [0.82, 0.93, 0.24, "Huracan residuals are strong but costs are exotic."], 0.51, "Specialist service estimate.", "low", SHARED_SOURCE_NOTES.supercar),
  ];

  function generated(id, displayName, group, category, price, energyType, fuelType, kwh, liters, reliabilityBias = 0) {
    const ev = energyType === "electricity";
    const hybrid = category === "hybrid";
    const premium = group === "Premium cars" || group === "Premium EVs" || group === "Luxury cars";
    const sports = group === "Sports cars";
    const city = group === "Cheap city cars";
    const valueBand = Math.max(0, price / 10000);
    const maintenance = Math.round((ev ? 260 : city ? 380 : hybrid ? 520 : 500) + valueBand * (premium ? 130 : sports ? 115 : 42));
    const insurance = Math.round((city ? 260 : ev ? 390 : 330) + valueBand * (premium ? 145 : sports ? 120 : 45));
    const repairs = Math.round((ev ? 420 : city ? 380 : hybrid ? 460 : 500) + valueBand * (premium ? 170 : sports ? 150 : 55) - reliabilityBias * 30);
    const tax = ev ? 0 : Math.round((city ? 65 : hybrid ? 110 : 120) + valueBand * (premium ? 38 : sports ? 32 : 18));
    const first = ev ? 0.72 : hybrid ? 0.81 : premium ? 0.74 : sports ? 0.82 : 0.78;
    const annual = ev ? 0.875 : hybrid ? 0.915 : premium ? 0.89 : sports ? 0.93 : 0.90;
    const resale = Math.max(0.22, Math.min(0.52, first * Math.pow(annual, 6)));
    const source = ev ? SHARED_SOURCE_NOTES.ev : premium || sports ? SHARED_SOURCE_NOTES.luxury : SHARED_SOURCE_NOTES.mainstream;
    return extra(id, displayName, group, category, price, energyType, fuelType, kwh, liters, maintenance, insurance, repairs, tax, [first, annual, ev ? 0.09 : 0.14, `${group} estimate with conservative Portugal/EU ownership assumptions.`], Number(resale.toFixed(2)), "Generated daily-driver estimate from official/spec class baselines, European real-world adjustment, and Portugal ownership cost bands.", "medium", source);
  }

  const GENERATED_DAILY_DRIVERS = [
    ["citroen-c1", "Citroën C1", "Cheap city cars", "combustion", 6500, "fuel", "petrol", 0, 5.2, 0],
    ["peugeot-107", "Peugeot 107", "Cheap city cars", "combustion", 5500, "fuel", "petrol", 0, 5.3, 0],
    ["peugeot-108", "Peugeot 108", "Cheap city cars", "combustion", 7500, "fuel", "petrol", 0, 5.2, 0],
    ["citroen-c2", "Citroën C2", "Cheap city cars", "combustion", 4000, "fuel", "petrol", 0, 6.2, -1],
    ["citroen-c3", "Citroën C3", "Small daily cars", "combustion", 11000, "fuel", "petrol/diesel", 0, 5.8, 0],
    ["fiat-500", "Fiat 500", "Cheap city cars", "combustion", 8500, "fuel", "petrol", 0, 5.7, 0],
    ["fiat-punto", "Fiat Punto", "Small daily cars", "combustion", 5500, "fuel", "petrol/diesel", 0, 6.1, -1],
    ["fiat-tipo", "Fiat Tipo", "Family hatchbacks", "combustion", 12500, "fuel", "petrol/diesel", 0, 6.0, 0],
    ["dacia-logan", "Dacia Logan", "Sedans", "combustion", 9000, "fuel", "petrol/diesel", 0, 5.9, 1],
    ["dacia-duster", "Dacia Duster", "SUVs", "combustion", 16000, "fuel", "petrol/diesel", 0, 6.8, 1],
    ["dacia-jogger", "Dacia Jogger", "Wagons", "combustion", 18000, "fuel", "petrol/hybrid", 0, 6.3, 1],
    ["renault-twingo", "Renault Twingo", "Cheap city cars", "combustion", 8000, "fuel", "petrol", 0, 5.5, 0],
    ["renault-modus", "Renault Modus", "Small daily cars", "combustion", 5000, "fuel", "petrol/diesel", 0, 6.0, -1],
    ["renault-scenic", "Renault Scenic", "Crossovers", "combustion", 12000, "fuel", "diesel/petrol", 0, 6.2, -1],
    ["renault-kadjar", "Renault Kadjar", "Crossovers", "combustion", 17000, "fuel", "diesel/petrol", 0, 6.1, 0],
    ["renault-austral", "Renault Austral", "SUVs", "hybrid", 31000, "fuel", "petrol hybrid", 0, 5.7, 0],
    ["peugeot-2008", "Peugeot 2008", "Crossovers", "combustion", 18000, "fuel", "petrol/diesel", 0, 6.0, 0],
    ["peugeot-308", "Peugeot 308", "Family hatchbacks", "combustion", 18500, "fuel", "petrol/diesel", 0, 5.8, 0],
    ["peugeot-508", "Peugeot 508", "Sedans", "combustion", 26000, "fuel", "diesel/petrol", 0, 6.2, 0],
    ["peugeot-5008", "Peugeot 5008", "SUVs", "combustion", 27000, "fuel", "diesel/petrol", 0, 6.5, 0],
    ["opel-astra", "Opel Astra", "Family hatchbacks", "combustion", 14500, "fuel", "petrol/diesel", 0, 5.9, 0],
    ["opel-insignia", "Opel Insignia", "Sedans", "combustion", 16000, "fuel", "diesel/petrol", 0, 6.3, 0],
    ["opel-mokka", "Opel Mokka", "Crossovers", "combustion", 18000, "fuel", "petrol", 0, 6.2, 0],
    ["opel-grandland", "Opel Grandland", "SUVs", "combustion", 23000, "fuel", "petrol/diesel", 0, 6.5, 0],
    ["ford-ka", "Ford Ka", "Cheap city cars", "combustion", 5500, "fuel", "petrol", 0, 5.8, -1],
    ["ford-puma", "Ford Puma", "Crossovers", "combustion", 20000, "fuel", "petrol mild hybrid", 0, 6.0, 0],
    ["ford-kuga", "Ford Kuga", "SUVs", "combustion", 25000, "fuel", "petrol/diesel/hybrid", 0, 6.8, 0],
    ["ford-mondeo", "Ford Mondeo", "Sedans", "combustion", 14500, "fuel", "diesel/petrol", 0, 6.4, 0],
    ["ford-s-max", "Ford S-Max", "Wagons", "combustion", 16500, "fuel", "diesel/petrol", 0, 6.8, 0],
    ["nissan-juke", "Nissan Juke", "Crossovers", "combustion", 14500, "fuel", "petrol", 0, 6.2, 0],
    ["nissan-x-trail", "Nissan X-Trail", "SUVs", "combustion", 26000, "fuel", "petrol hybrid", 0, 6.8, 0],
    ["nissan-note", "Nissan Note", "Small daily cars", "combustion", 7500, "fuel", "petrol/diesel", 0, 5.8, 0],
    ["toyota-auris", "Toyota Auris", "Family hatchbacks", "combustion", 12500, "fuel", "petrol/hybrid", 0, 5.8, 2],
    ["toyota-avensis", "Toyota Avensis", "Sedans", "combustion", 13000, "fuel", "diesel/petrol", 0, 6.2, 2],
    ["toyota-verso", "Toyota Verso", "Wagons", "combustion", 12000, "fuel", "diesel/petrol", 0, 6.4, 2],
    ["toyota-yaris", "Toyota Yaris", "Small daily cars", "combustion", 12000, "fuel", "petrol", 0, 5.4, 2],
    ["toyota-yaris-cross", "Toyota Yaris Cross", "Crossovers", "hybrid", 23000, "fuel", "petrol hybrid", 0, 4.8, 2],
    ["toyota-corolla-touring", "Toyota Corolla Touring Sports", "Wagons", "hybrid", 26000, "fuel", "petrol hybrid", 0, 5.0, 2],
    ["toyota-rav4", "Toyota RAV4", "SUVs", "combustion", 29000, "fuel", "petrol/hybrid", 0, 6.5, 2],
    ["honda-jazz", "Honda Jazz", "Small daily cars", "combustion", 13000, "fuel", "petrol", 0, 5.5, 2],
    ["honda-hr-v", "Honda HR-V", "Crossovers", "hybrid", 25000, "fuel", "petrol hybrid", 0, 5.3, 2],
    ["honda-cr-v", "Honda CR-V", "SUVs", "combustion", 28000, "fuel", "petrol/hybrid", 0, 6.8, 2],
    ["honda-e", "Honda e", "Cheap EVs", "ev", 21000, "electricity", null, 18.5, 0, 1],
    ["volkswagen-polo", "Volkswagen Polo", "Small daily cars", "combustion", 13000, "fuel", "petrol", 0, 5.7, 0],
    ["volkswagen-t-roc", "Volkswagen T-Roc", "Crossovers", "combustion", 23000, "fuel", "petrol/diesel", 0, 6.4, 0],
    ["volkswagen-t-cross", "Volkswagen T-Cross", "Crossovers", "combustion", 20000, "fuel", "petrol", 0, 6.1, 0],
    ["volkswagen-touran", "Volkswagen Touran", "Wagons", "combustion", 19000, "fuel", "diesel/petrol", 0, 6.3, 0],
    ["volkswagen-arteon", "Volkswagen Arteon", "Sedans", "combustion", 32000, "fuel", "diesel/petrol", 0, 6.7, 0],
    ["seat-arona", "SEAT Arona", "Crossovers", "combustion", 16000, "fuel", "petrol", 0, 5.9, 0],
    ["seat-ateca", "SEAT Ateca", "SUVs", "combustion", 21000, "fuel", "petrol/diesel", 0, 6.4, 0],
    ["seat-toledo", "SEAT Toledo", "Sedans", "combustion", 9000, "fuel", "diesel/petrol", 0, 5.8, 0],
    ["skoda-scala", "Skoda Scala", "Family hatchbacks", "combustion", 15000, "fuel", "petrol", 0, 5.8, 0],
    ["skoda-superb", "Skoda Superb", "Sedans", "combustion", 25000, "fuel", "diesel/petrol", 0, 6.2, 0],
    ["skoda-kamiq", "Skoda Kamiq", "Crossovers", "combustion", 18000, "fuel", "petrol", 0, 5.9, 0],
    ["skoda-karoq", "Skoda Karoq", "SUVs", "combustion", 23000, "fuel", "petrol/diesel", 0, 6.3, 0],
    ["skoda-kodiaq", "Skoda Kodiaq", "SUVs", "combustion", 30000, "fuel", "petrol/diesel", 0, 7.0, 0],
    ["hyundai-i20", "Hyundai i20", "Small daily cars", "combustion", 12500, "fuel", "petrol", 0, 5.6, 1],
    ["hyundai-bayon", "Hyundai Bayon", "Crossovers", "combustion", 17000, "fuel", "petrol", 0, 5.9, 1],
    ["hyundai-ix35", "Hyundai ix35", "SUVs", "combustion", 12000, "fuel", "diesel/petrol", 0, 6.8, 0],
    ["hyundai-santa-fe", "Hyundai Santa Fe", "SUVs", "combustion", 33000, "fuel", "diesel/hybrid", 0, 7.0, 1],
    ["kia-rio", "Kia Rio", "Small daily cars", "combustion", 10000, "fuel", "petrol/diesel", 0, 5.6, 1],
    ["kia-stonic", "Kia Stonic", "Crossovers", "combustion", 16000, "fuel", "petrol", 0, 5.9, 1],
    ["kia-xceed", "Kia XCeed", "Crossovers", "combustion", 19000, "fuel", "petrol/diesel", 0, 6.1, 1],
    ["kia-sorento", "Kia Sorento", "SUVs", "combustion", 36000, "fuel", "diesel/hybrid", 0, 7.1, 1],
    ["mazda-2", "Mazda 2", "Small daily cars", "combustion", 12500, "fuel", "petrol", 0, 5.5, 1],
    ["mazda-3", "Mazda 3", "Family hatchbacks", "combustion", 19000, "fuel", "petrol", 0, 6.2, 1],
    ["mazda-6", "Mazda 6", "Sedans", "combustion", 19000, "fuel", "diesel/petrol", 0, 6.5, 1],
    ["mazda-cx-3", "Mazda CX-3", "Crossovers", "combustion", 17000, "fuel", "petrol/diesel", 0, 6.2, 1],
    ["mazda-cx-5", "Mazda CX-5", "SUVs", "combustion", 26000, "fuel", "diesel/petrol", 0, 7.0, 1],
    ["volvo-v40", "Volvo V40", "Family hatchbacks", "combustion", 15000, "fuel", "diesel/petrol", 0, 5.9, 0],
    ["volvo-v90", "Volvo V90", "Wagons", "combustion", 38000, "fuel", "diesel/petrol", 0, 6.8, 0],
    ["volvo-xc60", "Volvo XC60", "SUVs", "combustion", 39000, "fuel", "diesel/petrol/hybrid", 0, 7.2, 0],
    ["volvo-xc90", "Volvo XC90", "SUVs", "combustion", 55000, "fuel", "diesel/petrol/hybrid", 0, 7.8, 0],
    ["bmw-1-series", "BMW 1 Series", "Premium cars", "combustion", 24000, "fuel", "petrol/diesel", 0, 6.2, 0],
    ["bmw-2-series-active-tourer", "BMW 2 Series Active Tourer", "Premium cars", "combustion", 28000, "fuel", "petrol/diesel/hybrid", 0, 6.4, 0],
    ["bmw-4-series", "BMW 4 Series", "Premium cars", "combustion", 43000, "fuel", "petrol/diesel", 0, 7.0, 0],
    ["bmw-x1", "BMW X1", "Premium cars", "combustion", 36000, "fuel", "petrol/diesel", 0, 6.8, 0],
    ["bmw-x3", "BMW X3", "Premium cars", "combustion", 50000, "fuel", "petrol/diesel", 0, 7.4, 0],
    ["bmw-x5", "BMW X5", "Luxury cars", "luxury", 70000, "fuel", "diesel/petrol/hybrid", 0, 8.5, 0],
    ["mercedes-a-class", "Mercedes-Benz A-Class", "Premium cars", "combustion", 26000, "fuel", "petrol/diesel", 0, 6.2, 0],
    ["mercedes-b-class", "Mercedes-Benz B-Class", "Premium cars", "combustion", 26000, "fuel", "petrol/diesel", 0, 6.3, 0],
    ["mercedes-cla", "Mercedes-Benz CLA", "Premium cars", "combustion", 32000, "fuel", "petrol/diesel", 0, 6.5, 0],
    ["mercedes-gla", "Mercedes-Benz GLA", "Premium cars", "combustion", 36000, "fuel", "petrol/diesel", 0, 6.8, 0],
    ["mercedes-glc", "Mercedes-Benz GLC", "Premium cars", "combustion", 52000, "fuel", "diesel/petrol", 0, 7.4, 0],
    ["audi-a1", "Audi A1", "Premium cars", "combustion", 21000, "fuel", "petrol", 0, 5.9, 0],
    ["audi-a3", "Audi A3", "Premium cars", "combustion", 28000, "fuel", "petrol/diesel", 0, 6.1, 0],
    ["audi-q2", "Audi Q2", "Premium cars", "combustion", 30000, "fuel", "petrol/diesel", 0, 6.4, 0],
    ["audi-q3", "Audi Q3", "Premium cars", "combustion", 36000, "fuel", "petrol/diesel", 0, 6.8, 0],
    ["audi-q5", "Audi Q5", "Premium cars", "combustion", 52000, "fuel", "diesel/petrol", 0, 7.4, 0],
    ["lexus-ct", "Lexus CT", "Hybrids", "hybrid", 16000, "fuel", "petrol hybrid", 0, 5.0, 2],
    ["lexus-nx", "Lexus NX", "Hybrids", "hybrid", 38000, "fuel", "petrol hybrid", 0, 6.4, 2],
    ["lexus-es", "Lexus ES", "Hybrids", "hybrid", 36000, "fuel", "petrol hybrid", 0, 5.8, 2],
    ["lexus-lbX", "Lexus LBX", "Hybrids", "hybrid", 30000, "fuel", "petrol hybrid", 0, 4.8, 2],
    ["mini-cooper", "MINI Cooper", "Small daily cars", "combustion", 18000, "fuel", "petrol", 0, 6.0, 0],
    ["mini-countryman", "MINI Countryman", "Crossovers", "combustion", 26000, "fuel", "petrol/diesel", 0, 6.6, 0],
    ["suzuki-swift", "Suzuki Swift", "Small daily cars", "combustion", 12000, "fuel", "petrol mild hybrid", 0, 5.2, 1],
    ["suzuki-vitara", "Suzuki Vitara", "Crossovers", "combustion", 18000, "fuel", "petrol mild hybrid", 0, 6.0, 1],
    ["suzuki-s-cross", "Suzuki S-Cross", "Crossovers", "combustion", 20000, "fuel", "petrol mild hybrid", 0, 6.1, 1],
    ["mitsubishi-space-star", "Mitsubishi Space Star", "Cheap city cars", "combustion", 8000, "fuel", "petrol", 0, 5.2, 0],
    ["mitsubishi-asx", "Mitsubishi ASX", "Crossovers", "combustion", 16000, "fuel", "petrol/diesel", 0, 6.4, 0],
    ["mitsubishi-outlander", "Mitsubishi Outlander", "SUVs", "hybrid", 25000, "fuel", "petrol plug-in hybrid", 0, 6.6, 0],
    ["smart-fortwo", "Smart Fortwo", "Cheap city cars", "combustion", 8500, "fuel", "petrol", 0, 5.2, 0],
    ["smart-forfour", "Smart Forfour", "Cheap city cars", "combustion", 9000, "fuel", "petrol", 0, 5.4, 0],
    ["tesla-model-3-highland", "Tesla Model 3 Highland", "Common EVs", "ev", 36000, "electricity", null, 15.6, 0, 0],
    ["tesla-model-y-rwd", "Tesla Model Y RWD", "Common EVs", "ev", 38000, "electricity", null, 17.2, 0, 0],
    ["tesla-model-y-long-range", "Tesla Model Y Long Range", "Common EVs", "ev", 45000, "electricity", null, 18.0, 0, 0],
    ["volkswagen-id3", "Volkswagen ID.3", "Common EVs", "ev", 26000, "electricity", null, 16.7, 0, 0],
    ["volkswagen-id5", "Volkswagen ID.5", "Premium EVs", "ev", 39000, "electricity", null, 19.5, 0, 0],
    ["cupra-born", "CUPRA Born", "Common EVs", "ev", 28000, "electricity", null, 17.2, 0, 0],
    ["cupra-formentor", "CUPRA Formentor", "Crossovers", "combustion", 30000, "fuel", "petrol/hybrid", 0, 7.0, 0],
    ["renault-megane-e-tech", "Renault Megane E-Tech", "Common EVs", "ev", 30000, "electricity", null, 16.8, 0, 0],
    ["renault-scenic-e-tech", "Renault Scenic E-Tech", "Common EVs", "ev", 37000, "electricity", null, 17.5, 0, 0],
    ["nissan-ariya", "Nissan Ariya", "Common EVs", "ev", 38000, "electricity", null, 19.2, 0, 0],
    ["toyota-bz4x", "Toyota bZ4X", "Common EVs", "ev", 36000, "electricity", null, 19.0, 0, 1],
    ["subaru-solterra", "Subaru Solterra", "Common EVs", "ev", 36000, "electricity", null, 19.5, 0, 0],
    ["ford-mustang-mach-e", "Ford Mustang Mach-E", "Premium EVs", "ev", 43000, "electricity", null, 20.5, 0, 0],
    ["bmw-ix1", "BMW iX1", "Premium EVs", "ev", 43000, "electricity", null, 18.7, 0, 0],
    ["bmw-ix3", "BMW iX3", "Premium EVs", "ev", 52000, "electricity", null, 20.0, 0, 0],
    ["mercedes-eqa", "Mercedes-Benz EQA", "Premium EVs", "ev", 41000, "electricity", null, 19.0, 0, 0],
    ["mercedes-eqb", "Mercedes-Benz EQB", "Premium EVs", "ev", 47000, "electricity", null, 20.2, 0, 0],
    ["audi-q8-e-tron", "Audi Q8 e-tron", "Premium EVs", "ev", 70000, "electricity", null, 23.5, 0, 0],
    ["volvo-c40-recharge", "Volvo C40 Recharge", "Premium EVs", "ev", 42000, "electricity", null, 19.5, 0, 0],
    ["volvo-xc40-recharge", "Volvo XC40 Recharge", "Premium EVs", "ev", 40000, "electricity", null, 19.7, 0, 0],
    ["polestar-2", "Polestar 2", "Premium EVs", "ev", 39000, "electricity", null, 18.8, 0, 0],
    ["byd-seal", "BYD Seal", "Common EVs", "ev", 38000, "electricity", null, 17.8, 0, 0],
    ["byd-seal-u", "BYD Seal U", "Common EVs", "ev", 36000, "electricity", null, 18.9, 0, 0],
    ["byd-han", "BYD Han", "Premium EVs", "ev", 52000, "electricity", null, 19.5, 0, 0],
    ["mg5-ev", "MG5 EV", "Common EVs", "ev", 24000, "electricity", null, 17.5, 0, 0],
    ["mg-marvel-r", "MG Marvel R", "Common EVs", "ev", 33000, "electricity", null, 20.0, 0, 0],
    ["hyundai-ioniq-electric", "Hyundai Ioniq Electric", "Cheap EVs", "ev", 18000, "electricity", null, 13.8, 0, 1],
    ["kia-soul-ev", "Kia Soul EV", "Cheap EVs", "ev", 19000, "electricity", null, 16.5, 0, 1],
    ["seat-mii-electric", "SEAT Mii Electric", "Cheap EVs", "ev", 14000, "electricity", null, 14.5, 0, 0],
    ["skoda-citigo-e", "Skoda Citigo-e iV", "Cheap EVs", "ev", 14000, "electricity", null, 14.5, 0, 0],
    ["smart-eq-fortwo", "Smart EQ Fortwo", "Cheap EVs", "ev", 13000, "electricity", null, 15.0, 0, 0],
    ["mini-electric", "MINI Electric", "Cheap EVs", "ev", 22000, "electricity", null, 16.0, 0, 0],
    ["citroen-c4", "Citroën C4", "Family hatchbacks", "combustion", 17000, "fuel", "petrol/diesel", 0, 5.9, 0],
    ["citroen-c4-cactus", "Citroën C4 Cactus", "Crossovers", "combustion", 13000, "fuel", "petrol/diesel", 0, 5.8, 0],
    ["citroen-c5-aircross", "Citroën C5 Aircross", "SUVs", "combustion", 23000, "fuel", "diesel/petrol", 0, 6.4, 0],
    ["ds-3-crossback", "DS 3 Crossback", "Crossovers", "combustion", 21000, "fuel", "petrol/diesel", 0, 6.1, 0],
    ["ds-4", "DS 4", "Premium cars", "combustion", 30000, "fuel", "petrol/diesel", 0, 6.2, 0],
    ["alfa-romeo-giulietta", "Alfa Romeo Giulietta", "Family hatchbacks", "combustion", 13000, "fuel", "diesel/petrol", 0, 6.3, -1],
    ["alfa-romeo-giulia", "Alfa Romeo Giulia", "Premium cars", "combustion", 33000, "fuel", "diesel/petrol", 0, 6.8, -1],
    ["alfa-romeo-stelvio", "Alfa Romeo Stelvio", "Premium cars", "combustion", 39000, "fuel", "diesel/petrol", 0, 7.6, -1],
    ["jeep-renegade", "Jeep Renegade", "Crossovers", "combustion", 17000, "fuel", "petrol/diesel", 0, 6.9, -1],
    ["jeep-compass", "Jeep Compass", "SUVs", "combustion", 24000, "fuel", "petrol/diesel", 0, 7.1, -1],
    ["toyota-proace-city-verso", "Toyota Proace City Verso", "Wagons", "combustion", 23000, "fuel", "diesel", 0, 5.9, 1],
    ["peugeot-rifter", "Peugeot Rifter", "Wagons", "combustion", 22000, "fuel", "diesel", 0, 5.9, 0],
    ["citroen-berlingo", "Citroën Berlingo", "Wagons", "combustion", 21000, "fuel", "diesel", 0, 5.9, 0],
    ["opel-combo-life", "Opel Combo Life", "Wagons", "combustion", 21000, "fuel", "diesel", 0, 5.9, 0],
    ["volkswagen-caddy", "Volkswagen Caddy", "Wagons", "combustion", 24000, "fuel", "diesel", 0, 6.0, 0],
    ["mercedes-citan-tourer", "Mercedes-Benz Citan Tourer", "Wagons", "combustion", 26000, "fuel", "diesel", 0, 6.2, 0],
    ["renault-kangoo", "Renault Kangoo", "Wagons", "combustion", 19000, "fuel", "diesel", 0, 5.8, 0],
    ["ford-tourneo-connect", "Ford Tourneo Connect", "Wagons", "combustion", 23000, "fuel", "diesel", 0, 6.0, 0],
    ["hyundai-ioniq-phev", "Hyundai Ioniq Plug-in Hybrid", "Hybrids", "hybrid", 18000, "fuel", "petrol plug-in hybrid", 0, 4.2, 1],
    ["kia-niro-phev", "Kia Niro Plug-in Hybrid", "Hybrids", "hybrid", 23000, "fuel", "petrol plug-in hybrid", 0, 4.5, 1],
    ["toyota-prius-plus", "Toyota Prius+", "Hybrids", "hybrid", 17000, "fuel", "petrol hybrid", 0, 5.2, 2],
    ["toyota-camry-hybrid", "Toyota Camry Hybrid", "Hybrids", "hybrid", 30000, "fuel", "petrol hybrid", 0, 5.6, 2],
    ["ford-kuga-phev", "Ford Kuga Plug-in Hybrid", "Hybrids", "hybrid", 28000, "fuel", "petrol plug-in hybrid", 0, 5.8, 0],
    ["volvo-xc40-phev", "Volvo XC40 Plug-in Hybrid", "Hybrids", "hybrid", 33000, "fuel", "petrol plug-in hybrid", 0, 6.0, 0],
    ["bmw-330e", "BMW 330e", "Hybrids", "hybrid", 36000, "fuel", "petrol plug-in hybrid", 0, 6.2, 0],
    ["mercedes-c300e", "Mercedes-Benz C 300 e", "Hybrids", "hybrid", 42000, "fuel", "petrol plug-in hybrid", 0, 6.3, 0],
    ["audi-a3-tfsi-e", "Audi A3 TFSI e", "Hybrids", "hybrid", 32000, "fuel", "petrol plug-in hybrid", 0, 5.8, 0],
    ["volkswagen-golf-gte", "Volkswagen Golf GTE", "Hybrids", "hybrid", 30000, "fuel", "petrol plug-in hybrid", 0, 5.8, 0],
    ["skoda-octavia-iv", "Skoda Octavia iV", "Hybrids", "hybrid", 29000, "fuel", "petrol plug-in hybrid", 0, 5.6, 0],
    ["seat-leon-e-hybrid", "SEAT Leon e-Hybrid", "Hybrids", "hybrid", 28000, "fuel", "petrol plug-in hybrid", 0, 5.6, 0],
    ["cupra-leon", "CUPRA Leon", "Sports cars", "combustion", 36000, "fuel", "petrol/hybrid", 0, 7.2, 0],
    ["hyundai-i30-n", "Hyundai i30 N", "Sports cars", "combustion", 33000, "fuel", "petrol", 0, 8.4, 0],
    ["ford-fiesta-st", "Ford Fiesta ST", "Sports cars", "combustion", 23000, "fuel", "petrol", 0, 7.0, 0],
    ["ford-focus-st", "Ford Focus ST", "Sports cars", "combustion", 32000, "fuel", "petrol", 0, 8.0, 0],
    ["volkswagen-golf-gti", "Volkswagen Golf GTI", "Sports cars", "combustion", 36000, "fuel", "petrol", 0, 7.4, 0],
    ["volkswagen-golf-r", "Volkswagen Golf R", "Sports cars", "combustion", 48000, "fuel", "petrol", 0, 8.5, 0],
    ["toyota-gr-yaris", "Toyota GR Yaris", "Sports cars", "combustion", 43000, "fuel", "petrol", 0, 8.0, 1],
    ["renault-clio-rs", "Renault Clio RS", "Sports cars", "combustion", 18000, "fuel", "petrol", 0, 7.3, 0],
    ["porsche-macan", "Porsche Macan", "Luxury cars", "luxury", 65000, "fuel", "petrol", 0, 9.5, 0],
    ["porsche-cayenne", "Porsche Cayenne", "Luxury cars", "luxury", 85000, "fuel", "petrol/hybrid", 0, 10.0, 0],
    ["mercedes-gle", "Mercedes-Benz GLE", "Luxury cars", "luxury", 78000, "fuel", "diesel/petrol", 0, 8.5, 0],
    ["bmw-x6", "BMW X6", "Luxury cars", "luxury", 85000, "fuel", "diesel/petrol", 0, 8.8, 0],
    ["audi-q7", "Audi Q7", "Luxury cars", "luxury", 76000, "fuel", "diesel/petrol", 0, 8.4, 0],
    ["audi-q8", "Audi Q8", "Luxury cars", "luxury", 85000, "fuel", "diesel/petrol", 0, 8.8, 0],
    ["volvo-ex90", "Volvo EX90", "Premium EVs", "ev", 80000, "electricity", null, 22.5, 0, 0],
    ["kia-ev3", "Kia EV3", "Common EVs", "ev", 33000, "electricity", null, 16.8, 0, 0],
    ["kia-ev9", "Kia EV9", "Premium EVs", "ev", 72000, "electricity", null, 24.0, 0, 0],
    ["hyundai-ioniq-6", "Hyundai Ioniq 6", "Common EVs", "ev", 41000, "electricity", null, 16.5, 0, 0],
    ["peugeot-e-2008", "Peugeot e-2008", "Common EVs", "ev", 27000, "electricity", null, 17.8, 0, 0],
    ["opel-mokka-e", "Opel Mokka-e", "Common EVs", "ev", 26000, "electricity", null, 17.6, 0, 0],
    ["citroen-e-c4", "Citroën ë-C4", "Common EVs", "ev", 26000, "electricity", null, 17.2, 0, 0],
    ["fiat-600e", "Fiat 600e", "Common EVs", "ev", 29000, "electricity", null, 16.8, 0, 0],
    ["jeep-avenger-electric", "Jeep Avenger Electric", "Common EVs", "ev", 30000, "electricity", null, 17.5, 0, 0],
    ["alfa-romeo-junior-electric", "Alfa Romeo Junior Electric", "Common EVs", "ev", 33000, "electricity", null, 17.2, 0, 0],
    ["renault-5-e-tech", "Renault 5 E-Tech", "Cheap EVs", "ev", 24000, "electricity", null, 15.5, 0, 0],
    ["citroen-e-c3", "Citroën ë-C3", "Cheap EVs", "ev", 21000, "electricity", null, 15.8, 0, 0],
  ].map((row) => generated(...row));

  const BRAND_MODELS = {
    Toyota: ["Yaris", "Yaris Cross", "Corolla", "Corolla Touring Sports", "Auris", "Avensis", "Camry", "Prius", "Prius+", "C-HR", "RAV4", "Highlander", "Land Cruiser", "Hilux", "Aygo", "Verso", "Proace City Verso", "GR Yaris", "GR86", "Supra", "bZ4X"],
    Honda: ["Jazz", "Civic", "Accord", "Insight", "HR-V", "CR-V", "ZR-V", "e:Ny1", "Honda e", "FR-V", "Legend", "NSX", "S2000"],
    Nissan: ["Micra", "Note", "Juke", "Qashqai", "X-Trail", "Ariya", "Leaf", "Pulsar", "Primera", "Almera", "Pathfinder", "Navara", "GT-R", "370Z"],
    Mazda: ["Mazda 2", "Mazda 3", "Mazda 6", "CX-3", "CX-30", "CX-5", "CX-60", "MX-30", "MX-5", "RX-7", "RX-8"],
    Subaru: ["Impreza", "Legacy", "Outback", "Forester", "XV", "Crosstrek", "Levorg", "BRZ", "WRX STI", "Solterra"],
    Suzuki: ["Swift", "Baleno", "Ignis", "Vitara", "S-Cross", "Jimny", "Splash", "Alto", "Wagon R", "Swace", "Across"],
    Mitsubishi: ["Space Star", "Colt", "Lancer", "ASX", "Outlander", "Eclipse Cross", "Pajero", "L200", "Grandis", "i-MiEV"],
    Hyundai: ["i10", "i20", "i30", "Ioniq", "Ioniq Plug-in", "Ioniq Electric", "Ioniq 5", "Ioniq 6", "Kona", "Kona Electric", "Bayon", "Tucson", "Santa Fe", "ix35", "Veloster", "i40", "Nexo"],
    Kia: ["Picanto", "Rio", "Ceed", "XCeed", "Stonic", "Niro Hybrid", "Niro EV", "Soul EV", "Sportage", "Sorento", "EV3", "EV5", "EV6", "EV9", "Optima", "Stinger", "Carens"],
    Volkswagen: ["Up!", "Polo", "Golf", "Golf GTI", "Golf R", "Beetle", "Jetta", "Passat", "Arteon", "Touran", "Caddy", "T-Cross", "T-Roc", "Tiguan", "Touareg", "ID.3", "ID.4", "ID.5", "ID.7", "California"],
    Skoda: ["Citigo", "Fabia", "Scala", "Octavia", "Superb", "Roomster", "Kamiq", "Karoq", "Kodiaq", "Yeti", "Enyaq", "Rapid"],
    SEAT: ["Mii", "Ibiza", "Leon", "Leon e-Hybrid", "Toledo", "Arona", "Ateca", "Tarraco", "Alhambra", "Exeo", "CUPRA Born", "CUPRA Formentor", "CUPRA Leon"],
    Renault: ["Twingo", "Clio", "Megane", "Megane E-Tech", "Captur", "Kadjar", "Austral", "Scenic", "Scenic E-Tech", "Espace", "Laguna", "Talisman", "Kangoo", "Modus", "Zoe", "5 E-Tech", "Clio RS"],
    Peugeot: ["107", "108", "206", "207", "208", "2008", "307", "308", "3008", "406", "407", "508", "5008", "Rifter", "Partner", "e-208", "e-2008", "RCZ"],
    Citroën: ["C1", "C2", "C3", "C3 Aircross", "C4", "C4 Cactus", "C5", "C5 Aircross", "Berlingo", "Saxo", "Xsara", "ë-C3", "ë-C4", "DS3", "DS4"],
    Fiat: ["Panda", "500", "500e", "500X", "600e", "Punto", "Grande Punto", "Tipo", "Bravo", "Stilo", "Doblo", "Multipla", "124 Spider", "Uno"],
    Ford: ["Ka", "Fiesta", "Fiesta ST", "Focus", "Focus ST", "Mondeo", "Puma", "Kuga", "S-Max", "Galaxy", "B-Max", "C-Max", "Tourneo Connect", "Mustang", "Mustang Mach-E", "Mustang Shelby GT500", "GT", "F-150", "Ranger", "Explorer"],
    Chevrolet: ["Spark", "Aveo", "Cruze", "Lacetti", "Malibu", "Trax", "Captiva", "Camaro", "Corvette", "Corvette ZR1", "Bolt EV", "Tahoe", "Suburban"],
    Opel: ["Adam", "Karl", "Corsa", "Astra", "Insignia", "Meriva", "Zafira", "Mokka", "Mokka-e", "Crossland", "Grandland", "Combo Life", "Vectra", "Tigra"],
    Dacia: ["Sandero", "Sandero Stepway", "Logan", "Duster", "Jogger", "Spring", "Lodgy", "Dokker", "Bigster"],
    BMW: ["1 Series", "2 Series", "2 Series Active Tourer", "3 Series", "4 Series", "5 Series", "7 Series", "8 Series", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "M2", "M3", "M3 CSL", "M4", "M5", "M5 CS", "i3", "i4", "i5", "i7", "i8", "iX1", "iX3", "iX", "XM", "Z4"],
    "Mercedes-Benz": ["A-Class", "B-Class", "C-Class", "E-Class", "S-Class", "CLA", "CLS", "GLA", "GLB", "GLC", "GLE", "GLS", "G-Class", "SL", "SLC", "AMG GT", "AMG One", "CLK GTR", "EQA", "EQB", "EQC", "EQE", "EQS", "Citan Tourer", "V-Class"],
    Audi: ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q4 e-tron", "Q5", "Q7", "Q8", "Q8 e-tron", "TT", "R8", "RS3", "RS4 Avant", "RS6 Avant", "RS e-tron GT", "e-tron GT RS"],
    Lexus: ["CT", "IS", "ES", "GS", "LS", "UX", "NX", "RX", "LBX", "RZ", "LC", "RC", "LFA", "LS Hybrid"],
    Volvo: ["C30", "V40", "S40", "S60", "S90", "V50", "V60", "V90", "XC40", "XC40 Recharge", "C40 Recharge", "EX30", "EX40", "EX90", "XC60", "XC90"],
    Jaguar: ["XE", "XF", "XJ", "F-Pace", "E-Pace", "I-Pace", "F-Type", "X-Type", "S-Type"],
    "Land Rover": ["Defender", "Discovery", "Discovery Sport", "Range Rover Evoque", "Range Rover Velar", "Range Rover Sport", "Range Rover", "Freelander"],
    Porsche: ["Boxster", "Cayman", "911", "911 GT3 RS", "911 Turbo", "Carrera GT", "918 Spyder", "Panamera", "Macan", "Macan Electric", "Cayenne", "Taycan", "Taycan Turbo GT"],
    Genesis: ["G70", "G80", "G90", "GV60", "GV70", "GV80", "Electrified G80"],
    Tesla: ["Model 3", "Model 3 Highland", "Model Y", "Model Y RWD", "Model Y Long Range", "Model S", "Model S Plaid", "Model X", "Model X Plaid", "Roadster", "Cybertruck", "Cybertruck Cyberbeast"],
    BYD: ["Dolphin", "Atto 3", "Seal", "Seal U", "Han", "Tang", "Song Plus", "Seagull", "Qin Plus", "Yuan Plus"],
    Polestar: ["2", "3", "4", "5"],
    NIO: ["ET5", "ET7", "ES6", "ES8", "EL6", "EL7"],
    XPeng: ["P5", "P7", "G6", "G9"],
    Rivian: ["R1T", "R1S", "R2"],
    Lucid: ["Air", "Air Pure", "Air Touring", "Air Grand Touring", "Air Sapphire", "Gravity"],
    Ferrari: ["F40", "F430", "458 Italia", "488", "F8 Tributo", "Roma", "Portofino", "California", "812 Superfast", "296 GTB", "SF90 Stradale", "LaFerrari", "Enzo", "Purosangue"],
    Lamborghini: ["Gallardo", "Huracan", "Huracan STO", "Aventador", "Revuelto", "Murcielago", "Urus", "Diablo", "Countach"],
    McLaren: ["540C", "570S", "600LT", "650S", "720S", "765LT", "Artura", "GT", "P1", "Senna", "Speedtail"],
    Bugatti: ["Veyron", "Chiron", "Tourbillon", "Divo"],
    Pagani: ["Zonda", "Huayra", "Utopia"],
    Koenigsegg: ["Agera RS", "Jesko", "Regera", "Gemera"],
    "Aston Martin": ["Vantage", "DB9", "DB11", "DB12", "DBS", "Rapide", "Vanquish", "DBX", "Valkyrie"],
    Maserati: ["Ghibli", "Quattroporte", "Levante", "Grecale", "GranTurismo", "MC20"],
    "Alfa Romeo": ["MiTo", "Giulietta", "Giulia", "Stelvio", "Tonale", "4C", "Junior Electric"],
    "Rolls-Royce": ["Ghost", "Phantom", "Cullinan", "Wraith", "Dawn", "Spectre"],
    Bentley: ["Continental GT", "Flying Spur", "Bentayga", "Mulsanne", "Azure"],
    Maybach: ["S-Class", "GLS"],
    Jeep: ["Renegade", "Compass", "Cherokee", "Grand Cherokee", "Wrangler", "Avenger", "Avenger Electric", "Gladiator"],
    Ram: ["1500", "2500", "3500", "TRX"],
    GMC: ["Sierra 1500", "Yukon", "Hummer EV", "Canyon"],
    Isuzu: ["D-Max", "MU-X"],
    Geely: ["Coolray", "Geometry C", "Galaxy E5", "Emgrand", "Monjaro"],
    Chery: ["Tiggo 4", "Tiggo 7", "Tiggo 8", "Omoda 5", "Arrizo 5"],
    "Great Wall": ["Ora 03", "Ora 07", "Haval Jolion", "Haval H6", "Tank 300"],
    MG: ["MG3", "MG4", "MG5 EV", "ZS", "ZS EV", "Marvel R", "HS", "EHS", "Cyberster"],
  };

  const ICONIC_EDGE_CARS = [
    ["bugatti-veyron", "Bugatti Veyron", "Sports cars", "supercar", 1500000, "fuel", "petrol", 0, 24.0, -2],
    ["koenigsegg-jesko", "Koenigsegg Jesko", "Sports cars", "supercar", 3200000, "fuel", "petrol", 0, 18.0, -2],
    ["koenigsegg-regera", "Koenigsegg Regera", "Sports cars", "supercar", 2500000, "fuel", "petrol hybrid", 0, 14.0, -2],
    ["pagani-huayra", "Pagani Huayra", "Sports cars", "supercar", 2600000, "fuel", "petrol", 0, 17.0, -2],
    ["ferrari-sf90-stradale", "Ferrari SF90 Stradale", "Sports cars", "supercar", 520000, "fuel", "petrol plug-in hybrid", 0, 10.5, -1],
    ["ferrari-enzo", "Ferrari Enzo", "Sports cars", "supercar", 3600000, "fuel", "petrol", 0, 19.0, -1],
    ["lamborghini-revuelto", "Lamborghini Revuelto", "Sports cars", "supercar", 620000, "fuel", "petrol plug-in hybrid", 0, 13.5, -1],
    ["lamborghini-huracan-sto", "Lamborghini Huracan STO", "Sports cars", "supercar", 330000, "fuel", "petrol", 0, 14.5, -1],
    ["lamborghini-murcielago", "Lamborghini Murcielago", "Sports cars", "supercar", 380000, "fuel", "petrol", 0, 18.0, -1],
    ["porsche-911-gt3-rs", "Porsche 911 GT3 RS", "Sports cars", "supercar", 260000, "fuel", "petrol", 0, 13.0, 0],
    ["porsche-carrera-gt", "Porsche Carrera GT", "Sports cars", "supercar", 1400000, "fuel", "petrol", 0, 16.0, -1],
    ["porsche-taycan-turbo-gt", "Porsche Taycan Turbo GT", "Premium EVs", "ev", 250000, "electricity", null, 24.0, 0, 0],
    ["mclaren-senna", "McLaren Senna", "Sports cars", "supercar", 1200000, "fuel", "petrol", 0, 15.0, -2],
    ["mclaren-speedtail", "McLaren Speedtail", "Sports cars", "supercar", 2400000, "fuel", "petrol hybrid", 0, 12.5, -2],
    ["mclaren-765lt", "McLaren 765LT", "Sports cars", "supercar", 360000, "fuel", "petrol", 0, 14.5, -2],
    ["mercedes-amg-one", "Mercedes-AMG One", "Sports cars", "supercar", 2800000, "fuel", "petrol plug-in hybrid", 0, 11.0, -2],
    ["mercedes-clk-gtr", "Mercedes-Benz CLK GTR", "Sports cars", "supercar", 10000000, "fuel", "petrol", 0, 20.0, -2],
    ["bmw-m5-cs", "BMW M5 CS", "Sports cars", "combustion", 155000, "fuel", "petrol", 0, 11.5, 0],
    ["bmw-m3-csl", "BMW M3 CSL", "Sports cars", "combustion", 150000, "fuel", "petrol", 0, 10.0, 0],
    ["bmw-i8", "BMW i8", "Sports cars", "hybrid", 70000, "fuel", "petrol plug-in hybrid", 0, 6.5, 0],
    ["bmw-xm", "BMW XM", "Luxury cars", "luxury", 145000, "fuel", "petrol plug-in hybrid", 0, 10.0, -1],
    ["audi-r8", "Audi R8", "Sports cars", "supercar", 140000, "fuel", "petrol", 0, 13.0, 0],
    ["audi-rs6-avant", "Audi RS6 Avant", "Sports cars", "combustion", 125000, "fuel", "petrol", 0, 11.5, 0],
    ["audi-e-tron-gt-rs", "Audi e-tron GT RS", "Premium EVs", "ev", 115000, "electricity", null, 23.0, 0, 0],
    ["tesla-roadster", "Tesla Roadster", "Sports cars", "ev", 180000, "electricity", null, 20.0, 0, 0],
    ["tesla-model-s-plaid", "Tesla Model S Plaid", "Premium EVs", "ev", 85000, "electricity", null, 20.5, 0, 0],
    ["tesla-cybertruck-cyberbeast", "Tesla Cybertruck Cyberbeast", "Premium EVs", "ev", 115000, "electricity", null, 28.0, 0, -1],
    ["dodge-challenger-srt-demon-170", "Dodge Challenger SRT Demon 170", "Sports cars", "combustion", 180000, "fuel", "petrol", 0, 18.0, -1],
    ["nissan-gt-r", "Nissan GT-R", "Sports cars", "combustion", 95000, "fuel", "petrol", 0, 11.5, 0],
    ["toyota-supra", "Toyota Supra", "Sports cars", "combustion", 55000, "fuel", "petrol", 0, 8.4, 1],
    ["honda-nsx", "Honda NSX", "Sports cars", "hybrid", 150000, "fuel", "petrol hybrid", 0, 9.5, 1],
    ["lexus-lfa", "Lexus LFA", "Sports cars", "supercar", 900000, "fuel", "petrol", 0, 14.0, 1],
    ["mazda-rx-7", "Mazda RX-7", "Sports cars", "combustion", 60000, "fuel", "petrol", 0, 11.0, -1],
    ["ford-gt", "Ford GT", "Sports cars", "supercar", 650000, "fuel", "petrol", 0, 14.0, 0],
    ["chevrolet-corvette-zr1", "Chevrolet Corvette ZR1", "Sports cars", "supercar", 180000, "fuel", "petrol", 0, 13.5, 0],
    ["ford-mustang-shelby-gt500", "Ford Mustang Shelby GT500", "Sports cars", "combustion", 110000, "fuel", "petrol", 0, 14.0, 0],
    ["maybach-s-class", "Maybach S-Class", "Luxury cars", "luxury", 180000, "fuel", "petrol/diesel", 0, 11.0, -1],
  ].map((row) => generated(...row));

  const BRAND_COVERAGE_CARS = [
    ["aston-martin-vantage", "Aston Martin Vantage", "Sports cars", "combustion", 125000, "fuel", "petrol", 0, 11.0, -1],
    ["maserati-ghibli", "Maserati Ghibli", "Luxury cars", "luxury", 52000, "fuel", "petrol/diesel", 0, 8.8, -1],
    ["bmw-320d-touring-2020", "BMW 320d Touring 2020", "Wagons", "combustion", 27000, "fuel", "diesel", 0, 5.5, 0],
    ["jaguar-xe", "Jaguar XE", "Premium cars", "combustion", 28000, "fuel", "diesel/petrol", 0, 6.6, -1],
    ["land-rover-defender", "Land Rover Defender", "Luxury cars", "luxury", 78000, "fuel", "diesel/petrol", 0, 9.0, -1],
    ["genesis-gv70", "Genesis GV70", "Luxury cars", "luxury", 52000, "fuel", "petrol/diesel", 0, 8.6, 0],
    ["nio-et5", "NIO ET5", "Premium EVs", "ev", 48000, "electricity", null, 19.0, 0, 0],
    ["xpeng-g6", "XPeng G6", "Premium EVs", "ev", 43000, "electricity", null, 18.2, 0, 0],
    ["rivian-r1t", "Rivian R1T", "Premium EVs", "ev", 85000, "electricity", null, 25.5, 0, -1],
    ["ram-1500", "Ram 1500", "SUVs", "pickup", 65000, "fuel", "petrol", 0, 13.5, -1],
    ["gmc-sierra-1500", "GMC Sierra 1500", "SUVs", "pickup", 70000, "fuel", "petrol", 0, 13.8, -1],
    ["isuzu-d-max", "Isuzu D-Max", "SUVs", "pickup", 36000, "fuel", "diesel", 0, 8.4, 0],
    ["geely-coolray", "Geely Coolray", "Crossovers", "combustion", 22000, "fuel", "petrol", 0, 6.7, 0],
    ["chery-tiggo-7", "Chery Tiggo 7", "SUVs", "combustion", 27000, "fuel", "petrol", 0, 7.4, 0],
    ["great-wall-ora-03", "Great Wall Ora 03", "Common EVs", "ev", 26000, "electricity", null, 16.8, 0, 0],
  ].map((row) => generated(...row));

  function slug(value) {
    return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function inferGroupAndPowertrain(brand, modelName) {
    const text = `${brand} ${modelName}`.toLowerCase();
    const ev = /ev|electric|e-tech|e-tron|eq|ioniq|id\.|model |tesla|byd|polestar|nio|xpeng|lucid|rivian|taycan|i4|i5|i7|ix|ix1|ix3|i-pace|mg4|mg5|zs ev|cybertruck|roadster|air|dolphin|seal|han|tang|atto|ora|geometry|hummer ev|nevera|spectre|lexus rz|ex30|ex40|ex90|solterra|bz4x|leaf|zoe|spring|500e|mokka-e|e-208|e-2008|ë-c3|ë-c4/.test(text);
    const plugHybrid = /plug-in|phev|tfsi e|330e|300 e|gte|e-hybrid/.test(text);
    const hybrid = plugHybrid || /hybrid|prius|ioniq|rav4|c-hr|yaris cross|corolla touring|camry|lexus|niro|hr-v|jazz|cr-v|outlander|kuga|swace|across/.test(text);
    const supercar = /bugatti|koenigsegg|pagani|ferrari|lamborghini|mclaren|rimac|veyron|chiron|jesko|regera|huayra|nevera|laferrari|enzo|revuelto|aventador|huracan|murcielago|senna|speedtail|p1|gt3 rs|carrera gt|clk gtr|amg one|ford gt|lfa|nsx|r8|corvette zr1/.test(text);
    const sports = supercar || /mustang|camaro|corvette|supra|gt-r|rx-7|rx-8|mx-5|s2000|brz|wrx|sti|m2|m3|m4|m5|amg|rs3|rs4|rs6|gti|golf r|shelby|demon|4c|giulia|stinger|z4|tt|f-type|vantage|db|mc20|gran turismo|911|boxster|cayman/.test(text);
    const luxury = /rolls|bentley|maybach|phantom|ghost|cullinan|wraith|dawn|mulsanne|flying spur|continental|s-class|7 series|8 series|x7|gls|g-class|range rover|panamera|cayenne|quattroporte|levante|g90|ls hybrid|lexus ls/.test(text);
    const premium = luxury || /bmw|mercedes|audi|lexus|volvo|jaguar|land rover|porsche|genesis|polestar/.test(text);
    const city = /aygo|c1|107|108|panda|500|i10|picanto|up|mii|citigo|twingo|ka|spark|adam|karl|spring|fortwo|forfour|seagull|space star|alto/.test(text);
    const small = city || /yaris|jazz|swift|micra|note|clio|208|fiesta|corsa|ibiza|fabia|polo|rio|i20|mazda 2|baleno|colt|aveo|sandero|mini cooper/.test(text);
    const wagon = /touring|avant|estate|wagon|variant|v60|v90|swace|rifter|berlingo|combo|caddy|kangoo|tourneo|citan|proace|doblo|partner|lodgy|jogger|s-max|galaxy|v-class|california/.test(text);
    const suv = /rav4|qashqai|juke|x-trail|hr-v|cr-v|cx-|forester|outback|crosstrek|vitara|asx|outlander|kona|bayon|tucson|santa fe|stonic|sportage|sorento|t-cross|t-roc|tiguan|touareg|kamiq|karoq|kodiaq|arona|ateca|tarraco|captur|kadjar|austral|2008|3008|5008|c3 aircross|c5 aircross|mokka|grandland|puma|kuga|duster|x1|x3|x5|x6|gl|q2|q3|q5|q7|q8|ux|nx|rx|xc|f-pace|e-pace|defender|discovery|range rover|macan|cayenne|gv|model y|model x|cybertruck|r1s|gravity|tang|seal u|song|zs|hs|marvel|hummer|yukon|tahoe|suburban|wrangler|cherokee|compass|renegade|avenger|gladiator|haval|tank|tiggo|omoda|coolray|monjaro/.test(text);
    const pickup = /hilux|navara|l200|d-max|ranger|f-150|ram|sierra|canyon|r1t|gladiator|cybertruck/.test(text);
    let group = "Family hatchbacks";
    if (city) group = "Cheap city cars";
    else if (small) group = "Small daily cars";
    else if (wagon) group = "Wagons";
    else if (pickup || suv) group = "SUVs";
    if (/sedan|saloon|accord|camry|avensis|passat|mondeo|insignia|508|talisman|arteon|a4|a6|a8|3 series|5 series|7 series|c-class|e-class|s-class|g70|g80|g90|xe|xf|xj|model 3|model s|seal|han|et5|et7|p7|air|quattroporte/.test(text)) group = "Sedans";
    if (hybrid && !ev) group = "Hybrids";
    if (ev) group = premium || Number.MAX_SAFE_INTEGER < 0 ? "Common EVs" : "Common EVs";
    if (ev && (premium || /model s|model x|air|r1|taycan|et7|es8|g9|han|tang|ev9|ex90|q8|e-tron gt|spectre|hummer|cybertruck/.test(text))) group = "Premium EVs";
    if (ev && /spring|zoe|leaf|500e|twingo|mii|citigo|fortwo|seagull|e-c3|e-208/.test(text)) group = "Cheap EVs";
    if (premium && !ev && !sports && !luxury) group = "Premium cars";
    if (luxury && !sports) group = "Luxury cars";
    if (sports) group = "Sports cars";
    const category = ev ? "ev" : hybrid ? "hybrid" : luxury ? "luxury" : supercar ? "supercar" : pickup ? "pickup" : "combustion";
    return { group, category, energyType: ev ? "electricity" : "fuel", fuelType: ev ? null : plugHybrid ? "petrol plug-in hybrid" : hybrid ? "petrol hybrid" : /diesel|d-max|hilux|navara|l200|caddy|rifter|berlingo|kangoo|tourneo/.test(text) ? "diesel" : "petrol/diesel" };
  }

  function baseValueFor(group, brand, modelName, generationIndex) {
    const text = `${brand} ${modelName}`.toLowerCase();
    const brandFactor = /rolls|bentley|maybach/.test(text) ? 3.0 : /ferrari|lamborghini|mclaren|bugatti|pagani|koenigsegg/.test(text) ? 5.5 : /porsche|land rover|jaguar|genesis|bmw|mercedes|audi|lexus|volvo|tesla|lucid|rivian|nio|xpeng|polestar/.test(text) ? 1.55 : /toyota|honda|mazda|subaru|hyundai|kia|volkswagen/.test(text) ? 1.08 : /dacia|fiat|citroen|renault|peugeot|opel|suzuki|mg|chery|geely|great wall/.test(text) ? 0.9 : 1;
    const groupBase = {
      "Cheap city cars": 8500,
      "Small daily cars": 12500,
      "Family hatchbacks": 17000,
      Sedans: 23000,
      Wagons: 21000,
      Crossovers: 21000,
      SUVs: 28000,
      Hybrids: 26000,
      "Cheap EVs": 21000,
      "Common EVs": 34000,
      "Premium cars": 42000,
      "Premium EVs": 58000,
      "Luxury cars": 90000,
      "Sports cars": 85000,
    }[group] || 18000;
    const generationFactor = [0.42, 0.68, 1.0][generationIndex] || 0.68;
    return roundTo(groupBase * brandFactor * generationFactor, group === "Sports cars" || group === "Luxury cars" ? 5000 : 500);
  }

  function likelyStartYear(brand, modelName) {
    const text = `${brand} ${modelName}`.toLowerCase();
    if (/tourbillon|utopia|revuelto|junior electric|ev3|ev5|r2|gravity|spectre|cybertruck|ex30|ex40|ex90|5 e-tech|bigster|600e|seagull|ora 07|galaxy e5|haval jolion|tank 300/.test(text)) return 2024;
    if (/model y|seal u|seal|dolphin|atto 3|han|tang|song plus|yuan plus|ev9|ev6|ioniq 5|ioniq 6|id\.4|id\.5|id\.7|q4 e-tron|q8 e-tron|eqa|eqb|eqe|eqs|ix1|ix3|ix|i4|i5|i7|taycan|macan electric|mg4|marvel r|zs ev|spring|mokka-e|e-208|e-2008|ë-c3|ë-c4|500e|solterra|bz4x|ariya|scenic e-tech|megane e-tech|evenger electric|hummer ev|air sapphire|nevera|sf90|296 gtb|purosangue|mc20|cyberster/.test(text)) return 2021;
    if (/model 3|kona electric|niro ev|leaf|zoe|i3|i8|bolt ev|i-pace|e-tron gt|polestar 2|et5|et7|es6|es8|p5|p7|r1t|r1s|air|roadster/.test(text)) return 2018;
    if (/c-hr|yaris cross|t-roc|t-cross|kamiq|karoq|kodiaq|arona|ateca|tarraco|captur|kadjar|austral|2008|3008|5008|mokka|grandland|puma|bayon|stonic|xceed|cx-30|ux|nx|lbx|xc40|gv60|gv70|gv80|formentor|tonale|grecale|dbx|urus|bentayga/.test(text)) return 2016;
    if (/gr yaris|gr86|supra|m2|m4|m5 cs|m3 csl|rs3|rs4|rs6|amg gt|amg one|911 gt3 rs|918 spyder|p1|senna|speedtail|765lt|laferrari|enzo|regera|jesko|huayra|chiron|veyron|valkyrie|lfa/.test(text)) return 2014;
    return 2008;
  }

  function catalogRows() {
    const targetRows = 1900;
    const years = [
      [2026, 1.12, 2, "new/current Portugal/EU value"],
      [2024, 1.00, 2, "nearly new Portugal/EU value"],
      [2022, 0.86, 2, "recent used Portugal/EU value"],
      [2020, 0.72, 2, "used Portugal/EU value"],
      [2018, 0.58, 1, "used Portugal/EU value"],
      [2016, 0.46, 1, "older used Portugal/EU value"],
      [2014, 0.36, 1, "older used Portugal/EU value"],
      [2012, 0.29, 0, "older used Portugal/EU value"],
      [2010, 0.23, 0, "budget used Portugal/EU value"],
      [2008, 0.19, 0, "budget used Portugal/EU value"],
    ];
    const rows = [];
    const flatModels = Object.entries(BRAND_MODELS).flatMap(([brand, models]) => models.map((modelName) => [brand, modelName]));
    const addRow = (brand, modelName, year, valueFactor, context, generationIndex) => {
      const meta = inferGroupAndPowertrain(brand, modelName);
      const text = `${brand} ${modelName}`.toLowerCase();
      if (year < likelyStartYear(brand, modelName)) return;
      if (year < 2022 && /tourbillon|utopia|revuelto|junior electric|ev3|ev5|r2|gravity|spectre|cybertruck|ex30|ex40|ex90|5 e-tech|bigster|600e|seagull|ora 07|galaxy e5/.test(text)) return;
      const price = roundTo(baseValueFor(meta.group, brand, modelName, generationIndex) * valueFactor, meta.group === "Sports cars" || meta.group === "Luxury cars" ? 5000 : 500);
      const ev = meta.energyType === "electricity";
      const ageLoad = Math.max(0, (2026 - year) * 0.03);
      const liters = ev ? 0 : Number((meta.group === "Sports cars" ? 8.5 + price / 70000 : meta.group === "Luxury cars" ? 8.2 + price / 90000 : meta.category === "hybrid" ? 4.7 + price / 60000 : meta.group === "Cheap city cars" ? 5.3 : meta.group === "SUVs" ? 6.7 : 6.0 + ageLoad).toFixed(1));
      const kwh = ev ? Number((meta.group === "Premium EVs" ? 19.5 + price / 110000 : meta.group === "Cheap EVs" ? 15.5 : 17.2 + Math.min(ageLoad, 0.5)).toFixed(1)) : 0;
      const id = `${slug(brand)}-${slug(modelName)}-${year}`;
      const displayName = `${brand} ${modelName} ${year}`;
      rows.push(generated(id, displayName, meta.group, meta.category, price, meta.energyType, meta.fuelType, kwh, liters, /toyota|honda|lexus/.test(text) ? 2 : /alfa|jeep|land rover|mclaren/.test(text) ? -1 : 0));
      const lastModern = generationIndex === 2 && year >= 2020 && !/base|active|tourer|verso|berlingo|combo|caddy|kangoo|tourneo|citan|proace|rifter|partner|doblo/i.test(modelName);
      if (lastModern && rows.length < targetRows) {
        const trim = meta.energyType === "electricity" ? "Long Range" : meta.category === "hybrid" ? "Hybrid" : meta.group === "Sports cars" ? "Performance" : "Plus";
        rows.push(generated(`${id}-${slug(trim)}`, `${brand} ${modelName} ${trim} ${year}`, meta.group, meta.category, Math.round(price * 1.18 / 500) * 500, meta.energyType, meta.fuelType, ev ? Number((kwh * 1.04).toFixed(1)) : 0, ev ? 0 : Number((liters * 1.05).toFixed(1)), /toyota|honda|lexus/.test(text) ? 2 : 0));
      }
    };
    flatModels.forEach(([brand, modelName]) => {
      years.forEach(([year, valueFactor, generationIndex, context]) => {
        if (rows.length >= targetRows) return;
        addRow(brand, modelName, year, valueFactor, context, generationIndex);
      });
    });
    return rows;
  }

  const LARGE_CATALOG_CARS = catalogRows();

  const CATEGORY_ORDER = [
    "City car",
    "Supermini",
    "Hatchback",
    "Sedan",
    "Estate",
    "MPV",
    "Crossover",
    "SUV",
    "Pickup",
    "Van",
    "Coupe",
    "Convertible",
    "Sports car",
    "Supercar",
    "Hypercar",
    "Luxury sedan",
    "Luxury SUV",
    "Off-road",
    "EV hatchback",
    "EV sedan",
    "EV SUV",
  ];

  function categoryGroup(car) {
    const text = `${car.id || ""} ${car.displayName || ""} ${car.model || ""}`.toLowerCase();
    const original = car.categoryGroup || "";
    if (CATEGORY_ORDER.includes(original)) return original;
    const price = Number(car.defaultUpfrontPrice) || 0;
    const isEv = car.energyType === "electricity";
    const isLuxury = car.category === "luxury" || price >= 65000;
    const isSuper = car.category === "supercar" || /supercars|collector/i.test(original);
    const hyper = price >= 800000 || /bugatti|veyron|chiron|koenigsegg|pagani|rimac|nevera|laferrari|mclaren-p1|porsche-918|amg-one|clk-gtr|speedtail|regera|jesko|huayra/.test(text);
    const offRoad = /wrangler|defender|land-cruiser|g-class|jimny|tank-300|bronco|grenadier/.test(text);
    const pickup = car.category === "pickup" || /hilux|f-150|f150|ranger|amarok|navara|l200|d-max|dmax|ram-|sierra|silverado|canyon|colorado|ridgeline|cybertruck/.test(text);
    const van = /berlingo|rifter|partner|combo|kangoo|caddy|tourneo|transit|trafic|vivaro|citan|sprinter|vito|proace|doblo|porter|express|daily/.test(text);
    const mpv = /scenic|espace|picasso|c4-spacetourer|zafira|meriva|touran|alhambra|sharan|s-max|galaxy|verso|lodgy|jogger|v-class|b-class|note|modus/.test(text);
    const estate = /estate|touring|variant|avant|sw|sport-tourer|sports-tourer|wagon|v60|v70|v90|rs6-avant|corolla-touring/.test(text) || /Wagons/i.test(original);
    const coupe = /coupe|coupé|cayman|supra|gt86|gr86|rx-7|rx-8|brz|tt|r8|gt-r|gtr|911|carrera-gt|continental-gt|mustang|camaro|challenger|corvette|rc-|lc-|z4|slk|sLC/i.test(car.displayName || "");
    const convertible = /mx-5|roadster|boxster|spyder|cabrio|convertible|spider/.test(text);
    const sports = /Sports cars/i.test(original) || /m2|m3|m4|m5|amg|rs3|rs4|rs5|rs6|gti|golf-r|gr-yaris|gr86|supra|gt-r|gtr|wrx|sti|i30-n|fiesta-st|focus-st|type-r|shelby|demon|4c|911|cayman|boxster|f-type|vantage|db11|db12|mc20/.test(text);
    const suv = /suv|x1|x3|x5|x7|xm|gl[a-z]|gle|gls|gla|glb|q2|q3|q4|q5|q7|q8|xc40|xc60|xc90|rav4|cr-v|hr-v|c-hr|yaris-cross|tucson|sportage|sorento|santa-fe|qashqai|x-trail|juke|captur|kadjar|austral|2008|3008|5008|mokka|grandland|puma|kuga|cx-3|cx-5|cx-30|cx-60|tiguan|t-roc|t-cross|ateca|arona|kamiq|karoq|kodiaq|duster|range-rover|defender|discovery|macan|cayenne|model-y|id4|enyaq|ev6|ioniq-5|niro|atto-3|zs-ev|ev9|ex30|i-pace|eletre|levante|stelvio|ur[us]|grecale|tonale|formentor/.test(text) || /SUVs/i.test(original);
    const crossover = /Crossovers/i.test(original) || /bayon|stonic|xceed|scala|arkana|kona|mok[k]?a|puma|juke|captur|2008|t-roc|t-cross|kamiq|arona|cx-3|cx-30/.test(text);
    const sedan = /sedan|saloon|passat|arteon|toledo|superb|octavia|logan|corolla|camry|accord|avensis|mazda-6|mondeo|insignia|a3|a4|a5|a6|a7|a8|3-series|5-series|7-series|c-class|e-class|s-class|is-|es-|gs-|ls-|s60|s80|s90|model-3|model-s|seal|i4|eqe|eqs|lucid-air|polestar-2|nio-et|xpeng-p7|genesis-g70|genesis-g80|genesis-g90/.test(text) || /Sedans|Premium sedans/i.test(original);
    const city = price <= 9000 || /aygo|c1|107|108|i10|picanto|up|panda|twingo|fortwo|ka|spring|500e/.test(text) || /Cheap city/i.test(original);
    const supermini = /Small daily|Common small/i.test(original) || /fiesta|clio|208|corsa|ibiza|fabia|micra|yaris|jazz|rio|i20|polo|swift|mazda-2|sandero|c3|punto|500/.test(text);

    if (car.energyType === "electricity") {
      if (suv || offRoad || pickup) return "EV SUV";
      if (sedan || isLuxury) return "EV sedan";
      return "EV hatchback";
    }
    if (hyper) return "Hypercar";
    if (isSuper) return price >= 140000 ? "Supercar" : "Sports car";
    if (convertible) return "Convertible";
    if (sports) return "Sports car";
    if (offRoad) return "Off-road";
    if (pickup) return "Pickup";
    if (van) return "Van";
    if (mpv) return "MPV";
    if (isLuxury && suv) return "Luxury SUV";
    if (isLuxury && sedan) return "Luxury sedan";
    if (estate) return "Estate";
    if (coupe) return price >= 90000 ? "Sports car" : "Coupe";
    if (suv && !crossover) return "SUV";
    if (crossover) return "Crossover";
    if (sedan) return "Sedan";
    if (city) return "City car";
    if (supermini) return "Supermini";
    return "Hatchback";
  }

  function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function roundTo(value, step) {
    return Math.round((Number(value) || 0) / step) * step;
  }

  function brandSignals(car) {
    const text = `${car.id} ${car.displayName}`.toLowerCase();
    return {
      toyotaHonda: /toyota|honda|lexus/.test(text),
      korean: /hyundai|kia/.test(text),
      simpleValue: /dacia|suzuki|fiat|mitsubishi/.test(text),
      germanPremium: /bmw|mercedes|audi|porsche/.test(text),
      fragilePremium: /alfa|jeep|range-rover|land-rover|mclaren|maserati/.test(text),
      tesla: /tesla/.test(text),
      performance: /amg| rs|rs3| m3|gti|golf-r|gr-|c63|turbo|ferrari|lamborghini|mclaren|bugatti|rimac|nevera|porsche/.test(text),
    };
  }

  function reviewedScores(car) {
    const group = categoryGroup(car);
    const signals = brandSignals(car);
    const price = Number(car.defaultUpfrontPrice) || 0;
    const ev = car.energyType === "electricity";
    const hybrid = car.category === "hybrid";
    const supercar = car.category === "supercar";
    const luxury = car.category === "luxury" || /^Luxury/.test(group);
    const premium = luxury || /^EV (sedan|SUV)$/.test(group) && price >= 36000 || price >= 45000;
    const cheap = price <= 9000;
    const oldCheap = price <= 6500 || /206|107|c2|punto|modus|ka|note|toledo/.test(car.id);
    const suvish = /SUV|Crossover|Estate|MPV|Van|Pickup|Off-road/.test(group);
    const city = group === "City car";

    let reliability = 6;
    if (signals.toyotaHonda) reliability += 2.2;
    if (signals.korean) reliability += 1.2;
    if (signals.simpleValue) reliability += 0.6;
    if (signals.germanPremium) reliability -= 0.4;
    if (signals.fragilePremium) reliability -= 1.4;
    if (oldCheap) reliability -= 1.3;
    if (supercar) reliability -= 2.0;
    if (ev && !signals.fragilePremium) reliability += 0.6;

    let comfort = 5.2 + (premium ? 2.0 : 0) + (luxury ? 1.0 : 0) + (suvish ? 0.8 : 0) + (/Sedan|Estate/.test(group) ? 0.5 : 0) - (city ? 1.2 : 0) - (oldCheap ? 0.6 : 0) - (supercar ? 1.3 : 0);
    let safety = 6.0 + (price > 25000 ? 1.0 : 0) + (price > 55000 ? 0.7 : 0) + (premium ? 0.5 : 0) + (ev ? 0.5 : 0) - (oldCheap ? 1.9 : 0) - (city && !ev ? 0.4 : 0);
    let practicality = 6.0 + (suvish ? 1.6 : 0) + (hybrid ? 0.3 : 0) - (city ? 1.1 : 0) - (supercar ? 5.0 : 0) - (/mx-5|cayman|911|f40|aventador|huracan|chiron|nevera|p1|laferrari|918/.test(car.id) ? 2.0 : 0);
    let tech = 5.0 + (ev ? 1.7 : 0) + (signals.tesla ? 1.5 : 0) + (signals.germanPremium ? 1.0 : 0) + (premium ? 0.8 : 0) - (oldCheap ? 2.2 : 0) - (/dacia-spring|smart-eq|twingo|c1|107|206|fiat-panda|fiat-punto/.test(car.id) ? 1.7 : 0);
    let driving = 5.1 + (signals.performance ? 2.2 : 0) + (premium ? 0.8 : 0) + (signals.tesla ? 1.4 : 0) - (city ? 1.0 : 0) - (/van|berlingo|rifter|combo|kangoo|caddy|citan|tourneo|jogger/.test(car.id) ? 1.3 : 0);
    if (supercar) {
      comfort = Math.max(4, comfort);
      practicality = Math.min(2, practicality);
      tech = Math.max(6, tech);
      driving = Math.max(9, driving);
    }

    return {
      reliability: Math.round(clampNumber(reliability, 2, 10)),
      comfort: Math.round(clampNumber(comfort, 2, 10)),
      safety: Math.round(clampNumber(safety, 2, 10)),
      practicality: Math.round(clampNumber(practicality, 1, 10)),
      tech: Math.round(clampNumber(tech, 1, 10)),
      drivingEnjoyment: Math.round(clampNumber(driving, 2, 10)),
    };
  }

  function reviewedCosts(car) {
    const group = categoryGroup(car);
    const signals = brandSignals(car);
    const price = Number(car.defaultUpfrontPrice) || 0;
    const band = Math.max(0.4, price / 10000);
    const ev = car.energyType === "electricity";
    const hybrid = car.category === "hybrid";
    const supercar = car.category === "supercar";
    const luxury = car.category === "luxury" || /^Luxury/.test(group);
    const premium = luxury || /^EV (sedan|SUV)$/.test(group) && price >= 36000 || price >= 45000;
    const sports = /Sports car|Supercar|Hypercar|Coupe|Convertible/.test(group);
    const city = group === "City car";
    const oldCheap = price <= 6500 || /206|107|c2|punto|modus|ka|note|toledo/.test(car.id);
    const reliability = reviewedScores(car).reliability;

    let maintenance = (ev ? 260 : hybrid ? 500 : city ? 380 : 520) + band * (supercar ? 360 : luxury ? 150 : premium ? 110 : sports ? 95 : 42);
    let insurance = (city ? 235 : ev ? 390 : 330) + band * (supercar ? 650 : luxury ? 175 : premium ? 115 : sports ? 105 : 42);
    let repairs = (ev ? 390 : hybrid ? 460 : city ? 430 : 540) + band * (supercar ? 720 : luxury ? 230 : premium ? 145 : sports ? 125 : 55);
    let tax = ev ? 0 : (city ? 55 : hybrid ? 105 : 120) + band * (supercar ? 35 : luxury ? 55 : premium ? 35 : sports ? 30 : 18);

    if (signals.toyotaHonda) repairs -= 140;
    if (signals.korean) repairs -= 80;
    if (signals.simpleValue) maintenance -= 40;
    if (signals.germanPremium) {
      maintenance += 140;
      repairs += 190;
      insurance += 90;
    }
    if (signals.fragilePremium) {
      maintenance += 240;
      repairs += 520;
      insurance += 140;
    }
    if (oldCheap) {
      insurance -= 70;
      repairs += 260;
      maintenance += 40;
    }
    repairs += (7 - reliability) * 55;

    return {
      maintenancePerYear: roundTo(Math.max(car.maintenancePerYear || 0, maintenance), 10),
      insurancePerYear: roundTo(Math.max(180, Math.max(car.insurancePerYear || 0, insurance)), 10),
      repairsPerYear: roundTo(Math.max(220, Math.max(car.repairsPerYear || 0, repairs)), 10),
      taxPerYear: ev ? 0 : roundTo(Math.max(40, Math.max(car.taxPerYear || 0, tax)), 5),
    };
  }

  function reviewedConsumption(car) {
    if (car.energyType === "electricity") {
      const withChargingLoss = (Number(car.realWorldKwhPer100km) || 15) * 1.06;
      const min = categoryGroup(car) === "EV hatchback" ? 14.5 : categoryGroup(car) === "EV SUV" ? 18 : 15.5;
      return { realWorldKwhPer100km: Number(clampNumber(withChargingLoss, min, 28).toFixed(1)), realWorldLitersPer100km: 0 };
    }
    const group = categoryGroup(car);
    const floor = car.category === "hybrid" ? 4.4 : group === "City car" ? 5.2 : /Sports car|Supercar|Hypercar/.test(group) ? 7.0 : /^Luxury/.test(group) ? 8.0 : 5.5;
    return { realWorldKwhPer100km: 0, realWorldLitersPer100km: Number(Math.max(floor, Number(car.realWorldLitersPer100km) || floor).toFixed(1)) };
  }

  function reviewedResale(car) {
    const retention = car.depreciationProfile
      ? clampNumber(car.depreciationProfile.firstYearRetention * Math.pow(car.depreciationProfile.annualRetention, 6), car.depreciationProfile.minRetention || 0.08, 1.05)
      : Number(car.resaleRetentionEstimate) || 0.35;
    return Number(retention.toFixed(2));
  }

  function representativeYear(car) {
    const text = `${car.id || ""} ${car.displayName || ""}`.toLowerCase();
    const exact = text.match(/\b(19[8-9]\d|20[0-2]\d)\b/);
    if (exact) return Number(exact[1]);
    const range = text.match(/\((20\d{2})-(20\d{2})\)|\b(20\d{2})-to-(20\d{2})\b/);
    if (range) return Math.round((Number(range[1] || range[3]) + Number(range[2] || range[4])) / 2);
    if (/tourbillon|utopia|revuelto|junior electric|ev3|gravity|spectre|cybertruck|ex30|ex90|5 e-tech|600e|ora 03|taycan turbo gt/.test(text)) return 2024;
    if (/model y|ioniq 5|ioniq 6|ev6|ev9|id\.3|id\.4|id\.5|byd|polestar|lucid|rivian|mg4|spring|mokka-e|e-208|e-2008|ë-c3|ë-c4|500e|bz4x|solterra|ariya|megane e-tech|scenic e-tech|sf90|296 gtb|purosangue/.test(text)) return 2022;
    if (/model 3|kona electric|niro ev|i-pace|e-tron gt|leaf|zoe|i3|i8|bolt ev/.test(text)) return 2021;
    if (/206|c2|punto|modus|ka|f40|carrera gt|clk gtr|veyron|murcielago|rx-7|s2000/.test(text)) return 2010;
    if (/107|accord|passat|3-series|c-class|a4|phantom|continental-gt|911|prius|insight/.test(text)) return 2016;
    return 2021;
  }

  function nameWithYear(car) {
    const year = representativeYear(car);
    const base = String(car.displayName || "").replace(/\s*\((?:19|20)\d{2}-(?:19|20)\d{2}\)\s*$/, "").replace(/\s+/g, " ").trim();
    return /\b(19[8-9]\d|20[0-2]\d)\b/.test(base) ? base : `${base} ${year}`.trim();
  }

  function reviewCar(car) {
    const displayName = nameWithYear(car);
    const normalizedCar = Object.assign({}, car, { displayName });
    const costs = reviewedCosts(car);
    const consumption = reviewedConsumption(normalizedCar);
    const identity = carIdentity(normalizedCar);
    return Object.assign({}, normalizedCar, costs, consumption, {
      brand: identity.brand,
      model: identity.model,
      generation: car.generation || identity.year || "",
      yearRange: car.yearRange || identity.year || "",
      year: identity.year,
      powertrain: car.energyType === "electricity" ? "EV" : car.category === "hybrid" ? (String(car.fuelType || "").includes("plug-in") ? "plug-in hybrid" : "hybrid") : "combustion",
      segment: car.segment || categoryGroup(car),
      marketContext: car.marketContext || (identity.year >= 2022 ? "current-ish Portugal/EU value" : "Portugal/EU used-market estimate"),
      categoryGroup: categoryGroup(normalizedCar),
      categoryLabel: categoryGroup(normalizedCar),
      resaleRetentionEstimate: reviewedResale(car),
      scores: reviewedScores(normalizedCar),
      sourceNotes: `${car.sourceNotes} Values reviewed against Portugal/EU 2026 market bands, IUC context, official/spec baselines, real-world consumption evidence, and owner/reliability heuristics.`,
    });
  }

  function carIdentity(car) {
    const brands = Object.keys(BRAND_MODELS).concat(["Mercedes-AMG", "Range Rover", "MINI", "Dodge", "Rimac", "DS", "Smart", "CUPRA"]).sort((a, b) => b.length - a.length);
    const displayName = String(car.displayName || "");
    const yearMatch = displayName.match(/\b(19[8-9]\d|20[0-2]\d)\b/);
    const withoutYear = displayName.replace(/\s+\b(19[8-9]\d|20[0-2]\d)\b\s*$/, "").trim();
    const brand = brands.find((item) => withoutYear.toLowerCase().startsWith(item.toLowerCase())) || withoutYear.split(/\s+/)[0] || "";
    return {
      brand,
      model: withoutYear.replace(new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "i"), "").trim() || withoutYear,
      year: yearMatch ? Number(yearMatch[1]) : representativeYear(car),
    };
  }

  function uniqueById(cars) {
    const seen = new Set();
    const unique = [];
    cars.forEach((car) => {
      if (seen.has(car.id)) return;
      seen.add(car.id);
      unique.push(car);
    });
    return unique;
  }

  return uniqueById([
    {
      id: "toyota-corolla",
      displayName: "Toyota Corolla",
      category: "combustion",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 15000,
      energyType: "fuel",
      fuelType: "petrol",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 6.1,
      maintenancePerYear: 520,
      insurancePerYear: 380,
      repairsPerYear: 420,
      taxPerYear: 135,
      depreciationProfile: profile(0.82, 0.92, 0.18, "Mainstream Toyota; slow, stable depreciation after initial drop."),
      resaleRetentionEstimate: 0.46,
      notes: "Conservative petrol Corolla ownership estimate; hybrid variant is separate.",
      confidence: "high",
      sourceNotes: SHARED_SOURCE_NOTES.mainstream,
    },
    {
      id: "honda-civic",
      displayName: "Honda Civic",
      category: "combustion",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 16000,
      energyType: "fuel",
      fuelType: "petrol",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 6.4,
      maintenancePerYear: 560,
      insurancePerYear: 420,
      repairsPerYear: 460,
      taxPerYear: 145,
      depreciationProfile: profile(0.81, 0.915, 0.18, "Reliable mainstream hatch/sedan with reasonable residuals."),
      resaleRetentionEstimate: 0.44,
      notes: "Real-world use adjusted above official combined ratings.",
      confidence: "high",
      sourceNotes: SHARED_SOURCE_NOTES.mainstream,
    },
    {
      id: "volkswagen-golf",
      displayName: "Volkswagen Golf",
      category: "combustion",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 15500,
      energyType: "fuel",
      fuelType: "petrol/diesel",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 6.0,
      maintenancePerYear: 620,
      insurancePerYear: 430,
      repairsPerYear: 560,
      taxPerYear: 150,
      depreciationProfile: profile(0.80, 0.91, 0.16, "Popular EU hatch; residuals helped by demand, repairs above Toyota/Honda."),
      resaleRetentionEstimate: 0.42,
      notes: "Blended petrol/diesel EU used-car estimate.",
      confidence: "high",
      sourceNotes: SHARED_SOURCE_NOTES.mainstream,
    },
    {
      id: "ford-fiesta",
      displayName: "Ford Fiesta",
      category: "combustion",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 9000,
      energyType: "fuel",
      fuelType: "petrol",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 5.8,
      maintenancePerYear: 480,
      insurancePerYear: 320,
      repairsPerYear: 470,
      taxPerYear: 95,
      depreciationProfile: profile(0.79, 0.90, 0.14, "Small used hatch; low entry cost, normal age depreciation."),
      resaleRetentionEstimate: 0.38,
      notes: "Small petrol estimate, including older used examples.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.mainstream,
    },
    {
      id: "renault-clio",
      displayName: "Renault Clio",
      category: "combustion",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 10500,
      energyType: "fuel",
      fuelType: "petrol/diesel",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 5.6,
      maintenancePerYear: 500,
      insurancePerYear: 330,
      repairsPerYear: 500,
      taxPerYear: 95,
      depreciationProfile: profile(0.78, 0.90, 0.14, "Common EU supermini with broad used supply."),
      resaleRetentionEstimate: 0.37,
      notes: "Portugal/EU supermini estimate; trim and diesel/petrol choice move IUC.",
      confidence: "high",
      sourceNotes: SHARED_SOURCE_NOTES.mainstream,
    },
    {
      id: "peugeot-206",
      displayName: "Peugeot 206",
      category: "combustion",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 3500,
      energyType: "fuel",
      fuelType: "petrol/diesel",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 6.7,
      maintenancePerYear: 430,
      insurancePerYear: 230,
      repairsPerYear: 760,
      taxPerYear: 65,
      depreciationProfile: profile(0.92, 0.96, 0.35, "Already depreciated; value mostly condition-driven, repair risk dominates."),
      resaleRetentionEstimate: 0.70,
      notes: "Older-car estimate; cheap to buy but repair reserve is intentionally high.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.classic,
    },
    {
      id: "fiat-panda",
      displayName: "Fiat Panda",
      category: "combustion",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 8500,
      energyType: "fuel",
      fuelType: "petrol",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 5.5,
      maintenancePerYear: 430,
      insurancePerYear: 300,
      repairsPerYear: 430,
      taxPerYear: 80,
      depreciationProfile: profile(0.78, 0.90, 0.14, "Simple city car with low running costs."),
      resaleRetentionEstimate: 0.37,
      notes: "Small petrol city-car estimate.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.mainstream,
    },
    {
      id: "dacia-sandero",
      displayName: "Dacia Sandero",
      category: "combustion",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 12500,
      energyType: "fuel",
      fuelType: "petrol",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 5.9,
      maintenancePerYear: 430,
      insurancePerYear: 330,
      repairsPerYear: 390,
      taxPerYear: 105,
      depreciationProfile: profile(0.80, 0.915, 0.16, "Low new price supports practical residuals."),
      resaleRetentionEstimate: 0.43,
      notes: "Budget petrol hatch estimate; simple hardware keeps costs low.",
      confidence: "high",
      sourceNotes: SHARED_SOURCE_NOTES.mainstream,
    },
    {
      id: "toyota-camry",
      displayName: "Toyota Camry",
      category: "combustion",
      typicalMarket: "EU/global",
      defaultUpfrontPrice: 19000,
      energyType: "fuel",
      fuelType: "petrol",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 7.4,
      maintenancePerYear: 620,
      insurancePerYear: 460,
      repairsPerYear: 480,
      taxPerYear: 210,
      depreciationProfile: profile(0.82, 0.92, 0.18, "Toyota reliability helps residuals; Portugal supply is thinner."),
      resaleRetentionEstimate: 0.46,
      notes: "EU/global petrol saloon fallback because Portugal data is limited.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.mainstream,
    },
    {
      id: "honda-accord",
      displayName: "Honda Accord",
      category: "combustion",
      typicalMarket: "EU/global",
      defaultUpfrontPrice: 14500,
      energyType: "fuel",
      fuelType: "petrol",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 7.5,
      maintenancePerYear: 640,
      insurancePerYear: 440,
      repairsPerYear: 520,
      taxPerYear: 215,
      depreciationProfile: profile(0.80, 0.91, 0.16, "Reliable larger saloon; older EU cars are condition-sensitive."),
      resaleRetentionEstimate: 0.42,
      notes: "EU/global fallback; Portuguese market availability varies.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.mainstream,
    },
    {
      id: "volkswagen-passat",
      displayName: "Volkswagen Passat",
      category: "combustion",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 17000,
      energyType: "fuel",
      fuelType: "diesel",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 5.8,
      maintenancePerYear: 720,
      insurancePerYear: 460,
      repairsPerYear: 700,
      taxPerYear: 210,
      depreciationProfile: profile(0.78, 0.90, 0.15, "Fleet-heavy diesel saloon/estate; higher repair reserve."),
      resaleRetentionEstimate: 0.37,
      notes: "Diesel-biased estimate because EU used Passats are often diesel.",
      confidence: "high",
      sourceNotes: SHARED_SOURCE_NOTES.mainstream,
    },
    {
      id: "bmw-3-series",
      displayName: "BMW 3 Series",
      category: "combustion",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 26000,
      energyType: "fuel",
      fuelType: "petrol/diesel",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 6.6,
      maintenancePerYear: 900,
      insurancePerYear: 650,
      repairsPerYear: 920,
      taxPerYear: 260,
      depreciationProfile: profile(0.76, 0.895, 0.12, "Premium compact executive; stronger repair and depreciation risk."),
      resaleRetentionEstimate: 0.34,
      notes: "Typical 320i/320d-style estimate; M models are not represented.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.luxury,
    },
    {
      id: "mercedes-c-class",
      displayName: "Mercedes-Benz C-Class",
      category: "combustion",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 27000,
      energyType: "fuel",
      fuelType: "petrol/diesel",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 6.7,
      maintenancePerYear: 950,
      insurancePerYear: 680,
      repairsPerYear: 950,
      taxPerYear: 270,
      depreciationProfile: profile(0.75, 0.895, 0.12, "Premium saloon with dealer-service and parts-price risk."),
      resaleRetentionEstimate: 0.34,
      notes: "C200/C220d-style estimate, not AMG.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.luxury,
    },
    {
      id: "audi-a4",
      displayName: "Audi A4",
      category: "combustion",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 25000,
      energyType: "fuel",
      fuelType: "petrol/diesel",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 6.5,
      maintenancePerYear: 900,
      insurancePerYear: 640,
      repairsPerYear: 900,
      taxPerYear: 250,
      depreciationProfile: profile(0.76, 0.895, 0.12, "Premium EU saloon/estate; common diesel trims."),
      resaleRetentionEstimate: 0.34,
      notes: "A4 mainstream engines; S/RS not represented.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.luxury,
    },
    {
      id: "ford-f150",
      displayName: "Ford F-150",
      category: "pickup",
      typicalMarket: "global",
      defaultUpfrontPrice: 42000,
      energyType: "fuel",
      fuelType: "petrol",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 12.8,
      maintenancePerYear: 950,
      insurancePerYear: 900,
      repairsPerYear: 950,
      taxPerYear: 520,
      depreciationProfile: profile(0.78, 0.91, 0.16, "Strong global pickup residuals but Portugal tax/fuel penalty."),
      resaleRetentionEstimate: 0.40,
      notes: "Global import estimate; Portugal ownership data is limited.",
      confidence: "low",
      sourceNotes: "EPA/spec baseline adjusted for EU mixed use; Portugal IUC/import/insurance estimated.",
    },
    {
      id: "toyota-hilux",
      displayName: "Toyota Hilux",
      category: "pickup",
      typicalMarket: "Portugal/EU/global",
      defaultUpfrontPrice: 31000,
      energyType: "fuel",
      fuelType: "diesel",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 8.4,
      maintenancePerYear: 780,
      insurancePerYear: 620,
      repairsPerYear: 620,
      taxPerYear: 300,
      depreciationProfile: profile(0.84, 0.93, 0.22, "Durable pickup with unusually strong residuals."),
      resaleRetentionEstimate: 0.52,
      notes: "Diesel pickup estimate; tax varies by registration/category/use.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.mainstream,
    },

    {
      id: "mercedes-s-class",
      displayName: "Mercedes-Benz S-Class",
      category: "luxury",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 75000,
      energyType: "fuel",
      fuelType: "petrol/diesel",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 9.2,
      maintenancePerYear: 1800,
      insurancePerYear: 1600,
      repairsPerYear: 2400,
      taxPerYear: 580,
      depreciationProfile: profile(0.68, 0.86, 0.08, "Large luxury saloon depreciation is severe; repairs stay expensive."),
      resaleRetentionEstimate: 0.24,
      notes: "Premium flagship estimate; exact trim can swing tax and repairs dramatically.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.luxury,
    },
    {
      id: "bmw-7-series",
      displayName: "BMW 7 Series",
      category: "luxury",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 70000,
      energyType: "fuel",
      fuelType: "petrol/diesel",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 9.0,
      maintenancePerYear: 1750,
      insurancePerYear: 1500,
      repairsPerYear: 2500,
      taxPerYear: 560,
      depreciationProfile: profile(0.67, 0.855, 0.08, "Large luxury saloon with steep depreciation and complex repairs."),
      resaleRetentionEstimate: 0.23,
      notes: "730d/740i-style estimate; V8 variants cost more.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.luxury,
    },
    {
      id: "rolls-royce-phantom",
      displayName: "Rolls-Royce Phantom",
      category: "luxury",
      typicalMarket: "global",
      defaultUpfrontPrice: 360000,
      energyType: "fuel",
      fuelType: "petrol",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 16.0,
      maintenancePerYear: 9000,
      insurancePerYear: 9000,
      repairsPerYear: 12000,
      taxPerYear: 1100,
      depreciationProfile: profile(0.72, 0.88, 0.12, "Ultra-luxury depreciation and bespoke parts risk; condition dominates."),
      resaleRetentionEstimate: 0.31,
      notes: "Portugal-specific cost data is sparse; uses global ultra-luxury ownership assumptions.",
      confidence: "low",
      sourceNotes: SHARED_SOURCE_NOTES.supercar,
    },
    {
      id: "bentley-continental-gt",
      displayName: "Bentley Continental GT",
      category: "luxury",
      typicalMarket: "EU/global",
      defaultUpfrontPrice: 135000,
      energyType: "fuel",
      fuelType: "petrol",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 14.0,
      maintenancePerYear: 4500,
      insurancePerYear: 3500,
      repairsPerYear: 5500,
      taxPerYear: 950,
      depreciationProfile: profile(0.70, 0.87, 0.10, "Expensive GT with heavy fuel, tire, and parts costs."),
      resaleRetentionEstimate: 0.28,
      notes: "V8/W12 blend; W12 ownership costs can be higher.",
      confidence: "low",
      sourceNotes: SHARED_SOURCE_NOTES.supercar,
    },
    {
      id: "porsche-911",
      displayName: "Porsche 911",
      category: "luxury",
      typicalMarket: "Portugal/EU/global",
      defaultUpfrontPrice: 95000,
      energyType: "fuel",
      fuelType: "petrol",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 10.2,
      maintenancePerYear: 1800,
      insurancePerYear: 1800,
      repairsPerYear: 1800,
      taxPerYear: 520,
      depreciationProfile: profile(0.84, 0.94, 0.28, "911 residuals are unusually strong for performance cars."),
      resaleRetentionEstimate: 0.57,
      notes: "Carrera-style estimate; GT/Turbo cars differ materially.",
      confidence: "medium",
      sourceNotes: "Porsche service-plan pricing and European owner-cost reports; Portugal insurance/tax estimated.",
    },
    {
      id: "ferrari-f40",
      displayName: "Ferrari F40",
      category: "supercar",
      typicalMarket: "global",
      defaultUpfrontPrice: 2500000,
      energyType: "fuel",
      fuelType: "petrol",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 18.0,
      maintenancePerYear: 18000,
      insurancePerYear: 28000,
      repairsPerYear: 35000,
      taxPerYear: 900,
      depreciationProfile: profile(1.02, 1.00, 0.65, "Collector value may appreciate; liquidity and condition risk are enormous."),
      resaleRetentionEstimate: 1.00,
      notes: "Collector-car estimate; ordinary depreciation logic does not really apply.",
      confidence: "low",
      sourceNotes: SHARED_SOURCE_NOTES.supercar,
    },
    {
      id: "lamborghini-aventador",
      displayName: "Lamborghini Aventador",
      category: "supercar",
      typicalMarket: "EU/global",
      defaultUpfrontPrice: 350000,
      energyType: "fuel",
      fuelType: "petrol",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 18.5,
      maintenancePerYear: 7000,
      insurancePerYear: 8500,
      repairsPerYear: 12000,
      taxPerYear: 1100,
      depreciationProfile: profile(0.78, 0.91, 0.20, "Limited supply supports residuals, but repairs and tires are severe."),
      resaleRetentionEstimate: 0.45,
      notes: "Specialist service/tire/brake reserve included; Portugal-specific insurance uncertain.",
      confidence: "low",
      sourceNotes: SHARED_SOURCE_NOTES.supercar,
    },
    {
      id: "bugatti-chiron",
      displayName: "Bugatti Chiron",
      category: "supercar",
      typicalMarket: "global",
      defaultUpfrontPrice: 3000000,
      energyType: "fuel",
      fuelType: "petrol",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 22.0,
      maintenancePerYear: 22000,
      insurancePerYear: 60000,
      repairsPerYear: 50000,
      taxPerYear: 1500,
      depreciationProfile: profile(0.90, 0.96, 0.45, "Hypercar residuals are collector-market driven; service costs are extreme."),
      resaleRetentionEstimate: 0.70,
      notes: "Functional estimate only; a real Chiron budget needs bespoke quotes.",
      confidence: "low",
      sourceNotes: SHARED_SOURCE_NOTES.supercar,
    },

    {
      id: "nissan-leaf",
      displayName: "Nissan Leaf",
      category: "ev",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 12500,
      energyType: "electricity",
      fuelType: null,
      realWorldKwhPer100km: 17.0,
      realWorldLitersPer100km: 0,
      maintenancePerYear: 300,
      insurancePerYear: 430,
      repairsPerYear: 520,
      taxPerYear: 0,
      depreciationProfile: profile(0.72, 0.88, 0.10, "Battery degradation and rapid-charging limits pressure older Leaf residuals."),
      resaleRetentionEstimate: 0.30,
      notes: "Used Leaf estimate; battery health can dominate resale.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.ev,
    },
    {
      id: "renault-zoe",
      displayName: "Renault Zoe",
      category: "ev",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 12000,
      energyType: "electricity",
      fuelType: null,
      realWorldKwhPer100km: 16.3,
      realWorldLitersPer100km: 0,
      maintenancePerYear: 300,
      insurancePerYear: 400,
      repairsPerYear: 480,
      taxPerYear: 0,
      depreciationProfile: profile(0.72, 0.88, 0.10, "Older small EV residuals depend heavily on battery ownership/health."),
      resaleRetentionEstimate: 0.30,
      notes: "EU small-EV estimate; verify battery lease/ownership on older cars.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.ev,
    },
    {
      id: "mg4",
      displayName: "MG4",
      category: "ev",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 24500,
      energyType: "electricity",
      fuelType: null,
      realWorldKwhPer100km: 17.6,
      realWorldLitersPer100km: 0,
      maintenancePerYear: 330,
      insurancePerYear: 520,
      repairsPerYear: 520,
      taxPerYear: 0,
      depreciationProfile: profile(0.76, 0.89, 0.12, "Newer value EV; depreciation uncertainty remains."),
      resaleRetentionEstimate: 0.34,
      notes: "Adjusted above EV Database/Green NCAP style real-world values for mixed Portugal use.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.ev,
    },
    {
      id: "byd-dolphin",
      displayName: "BYD Dolphin",
      category: "ev",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 24000,
      energyType: "electricity",
      fuelType: null,
      realWorldKwhPer100km: 16.8,
      realWorldLitersPer100km: 0,
      maintenancePerYear: 320,
      insurancePerYear: 500,
      repairsPerYear: 500,
      taxPerYear: 0,
      depreciationProfile: profile(0.75, 0.885, 0.12, "Newer Chinese EV; residuals still uncertain in EU used market."),
      resaleRetentionEstimate: 0.32,
      notes: "Official/spec values adjusted upward using Green NCAP and owner-report spread.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.ev,
    },
    {
      id: "dacia-spring",
      displayName: "Dacia Spring",
      category: "ev",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 12500,
      energyType: "electricity",
      fuelType: null,
      realWorldKwhPer100km: 14.8,
      realWorldLitersPer100km: 0,
      maintenancePerYear: 260,
      insurancePerYear: 320,
      repairsPerYear: 420,
      taxPerYear: 0,
      depreciationProfile: profile(0.76, 0.89, 0.12, "Low-cost city EV; simple but range-limited."),
      resaleRetentionEstimate: 0.34,
      notes: "City-car EV estimate; motorway use can be much less efficient.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.ev,
    },
    {
      id: "tesla-model-3",
      displayName: "Tesla Model 3",
      category: "ev",
      typicalMarket: "Portugal/EU/global",
      defaultUpfrontPrice: 28000,
      energyType: "electricity",
      fuelType: null,
      realWorldKwhPer100km: 16.2,
      realWorldLitersPer100km: 0,
      maintenancePerYear: 360,
      insurancePerYear: 650,
      repairsPerYear: 650,
      taxPerYear: 0,
      depreciationProfile: profile(0.73, 0.88, 0.10, "EV price cuts and battery/tech change pressure residuals."),
      resaleRetentionEstimate: 0.30,
      notes: "Real-world electricity use is adjusted above official ratings from owner reports.",
      confidence: "high",
      sourceNotes: SHARED_SOURCE_NOTES.ev,
    },
    {
      id: "tesla-model-y",
      displayName: "Tesla Model Y",
      category: "ev",
      typicalMarket: "Portugal/EU/global",
      defaultUpfrontPrice: 34000,
      energyType: "electricity",
      fuelType: null,
      realWorldKwhPer100km: 17.8,
      realWorldLitersPer100km: 0,
      maintenancePerYear: 380,
      insurancePerYear: 700,
      repairsPerYear: 700,
      taxPerYear: 0,
      depreciationProfile: profile(0.74, 0.885, 0.11, "Popular EV crossover but exposed to new-price cuts."),
      resaleRetentionEstimate: 0.32,
      notes: "Mixed road use estimate; high-speed motorway use can exceed this.",
      confidence: "high",
      sourceNotes: SHARED_SOURCE_NOTES.ev,
    },
    {
      id: "hyundai-ioniq-5",
      displayName: "Hyundai Ioniq 5",
      category: "ev",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 33000,
      energyType: "electricity",
      fuelType: null,
      realWorldKwhPer100km: 19.0,
      realWorldLitersPer100km: 0,
      maintenancePerYear: 390,
      insurancePerYear: 650,
      repairsPerYear: 680,
      taxPerYear: 0,
      depreciationProfile: profile(0.74, 0.885, 0.11, "Large EV crossover; efficiency less strong on motorways."),
      resaleRetentionEstimate: 0.32,
      notes: "Large aerodynamic profile adjusted for real mixed use.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.ev,
    },
    {
      id: "kia-ev6",
      displayName: "Kia EV6",
      category: "ev",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 34000,
      energyType: "electricity",
      fuelType: null,
      realWorldKwhPer100km: 18.8,
      realWorldLitersPer100km: 0,
      maintenancePerYear: 390,
      insurancePerYear: 650,
      repairsPerYear: 680,
      taxPerYear: 0,
      depreciationProfile: profile(0.74, 0.885, 0.11, "Large EV crossover with good warranty but expensive body/electronics."),
      resaleRetentionEstimate: 0.32,
      notes: "Similar E-GMP assumptions to Ioniq 5.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.ev,
    },
    {
      id: "volkswagen-id4",
      displayName: "Volkswagen ID.4",
      category: "ev",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 31000,
      energyType: "electricity",
      fuelType: null,
      realWorldKwhPer100km: 19.2,
      realWorldLitersPer100km: 0,
      maintenancePerYear: 400,
      insurancePerYear: 620,
      repairsPerYear: 700,
      taxPerYear: 0,
      depreciationProfile: profile(0.72, 0.875, 0.10, "Mainstream EV SUV with moderate depreciation risk."),
      resaleRetentionEstimate: 0.29,
      notes: "Real-world use adjusted above official mixed ratings.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.ev,
    },
    {
      id: "tesla-model-s",
      displayName: "Tesla Model S",
      category: "ev",
      typicalMarket: "EU/global",
      defaultUpfrontPrice: 52000,
      energyType: "electricity",
      fuelType: null,
      realWorldKwhPer100km: 19.5,
      realWorldLitersPer100km: 0,
      maintenancePerYear: 620,
      insurancePerYear: 1100,
      repairsPerYear: 1400,
      taxPerYear: 0,
      depreciationProfile: profile(0.70, 0.86, 0.09, "Older luxury EV with battery/air-suspension/electronics risk."),
      resaleRetentionEstimate: 0.25,
      notes: "Luxury EV repair risk is materially higher than Model 3/Y.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.ev,
    },
    {
      id: "porsche-taycan",
      displayName: "Porsche Taycan",
      category: "luxury",
      typicalMarket: "Portugal/EU/global",
      defaultUpfrontPrice: 76000,
      energyType: "electricity",
      fuelType: null,
      realWorldKwhPer100km: 22.5,
      realWorldLitersPer100km: 0,
      maintenancePerYear: 950,
      insurancePerYear: 1800,
      repairsPerYear: 1800,
      taxPerYear: 0,
      depreciationProfile: profile(0.66, 0.84, 0.08, "Luxury EV depreciation has been steep; repair costs are high."),
      resaleRetentionEstimate: 0.20,
      notes: "Performance EV estimate; tires and brakes can be expensive despite regen.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.ev,
    },
    {
      id: "lucid-air",
      displayName: "Lucid Air",
      category: "luxury",
      typicalMarket: "global",
      defaultUpfrontPrice: 95000,
      energyType: "electricity",
      fuelType: null,
      realWorldKwhPer100km: 19.8,
      realWorldLitersPer100km: 0,
      maintenancePerYear: 800,
      insurancePerYear: 2200,
      repairsPerYear: 2500,
      taxPerYear: 0,
      depreciationProfile: profile(0.62, 0.82, 0.07, "Low EU support/dealer density creates residual and repair uncertainty."),
      resaleRetentionEstimate: 0.16,
      notes: "Portugal/EU ownership is uncertain; functional global estimate only.",
      confidence: "low",
      sourceNotes: SHARED_SOURCE_NOTES.ev,
    },
    {
      id: "mercedes-eqs",
      displayName: "Mercedes-Benz EQS",
      category: "luxury",
      typicalMarket: "Portugal/EU/global",
      defaultUpfrontPrice: 85000,
      energyType: "electricity",
      fuelType: null,
      realWorldKwhPer100km: 20.5,
      realWorldLitersPer100km: 0,
      maintenancePerYear: 850,
      insurancePerYear: 1900,
      repairsPerYear: 2300,
      taxPerYear: 0,
      depreciationProfile: profile(0.60, 0.82, 0.07, "Luxury EV flagship depreciation is severe."),
      resaleRetentionEstimate: 0.16,
      notes: "Official EQS efficiency is excellent, but resale/depreciation risk is high.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.ev,
    },
    {
      id: "rimac-nevera",
      displayName: "Rimac Nevera",
      category: "supercar",
      typicalMarket: "global",
      defaultUpfrontPrice: 2200000,
      energyType: "electricity",
      fuelType: null,
      realWorldKwhPer100km: 31.0,
      realWorldLitersPer100km: 0,
      maintenancePerYear: 12000,
      insurancePerYear: 45000,
      repairsPerYear: 50000,
      taxPerYear: 0,
      depreciationProfile: profile(0.82, 0.92, 0.30, "Electric hypercar market is tiny; resale is highly speculative."),
      resaleRetentionEstimate: 0.48,
      notes: "Hypercar estimate with very low confidence; exact costs require bespoke underwriting/service quotes.",
      confidence: "low",
      sourceNotes: SHARED_SOURCE_NOTES.supercar,
    },

    {
      id: "toyota-prius",
      displayName: "Toyota Prius",
      category: "hybrid",
      typicalMarket: "Portugal/EU/global",
      defaultUpfrontPrice: 18000,
      energyType: "fuel",
      fuelType: "petrol hybrid",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 4.6,
      maintenancePerYear: 520,
      insurancePerYear: 430,
      repairsPerYear: 470,
      taxPerYear: 100,
      depreciationProfile: profile(0.84, 0.925, 0.20, "Toyota hybrid reputation supports residuals."),
      resaleRetentionEstimate: 0.49,
      notes: "Non-plug-in hybrid; app treats hybrids as fuel by default.",
      confidence: "high",
      sourceNotes: "Official hybrid ratings adjusted toward EU/UK owner reports; non-plugin hybrid uses L/100km only.",
    },
    {
      id: "toyota-yaris-hybrid",
      displayName: "Toyota Yaris Hybrid",
      category: "hybrid",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 17000,
      energyType: "fuel",
      fuelType: "petrol hybrid",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 4.4,
      maintenancePerYear: 480,
      insurancePerYear: 380,
      repairsPerYear: 420,
      taxPerYear: 85,
      depreciationProfile: profile(0.84, 0.925, 0.20, "Small Toyota hybrid with strong used demand."),
      resaleRetentionEstimate: 0.49,
      notes: "Urban use can beat this; motorway use can exceed it.",
      confidence: "high",
      sourceNotes: "Official hybrid ratings adjusted toward EU/UK owner reports; non-plugin hybrid uses L/100km only.",
    },
    {
      id: "honda-insight",
      displayName: "Honda Insight",
      category: "hybrid",
      typicalMarket: "EU/global",
      defaultUpfrontPrice: 11000,
      energyType: "fuel",
      fuelType: "petrol hybrid",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 5.0,
      maintenancePerYear: 520,
      insurancePerYear: 390,
      repairsPerYear: 540,
      taxPerYear: 95,
      depreciationProfile: profile(0.78, 0.90, 0.15, "Older hybrid; condition and battery health matter."),
      resaleRetentionEstimate: 0.37,
      notes: "Older Honda hybrid estimate; Portugal data is limited.",
      confidence: "medium",
      sourceNotes: SHARED_SOURCE_NOTES.classic,
    },
    {
      id: "hyundai-ioniq-hybrid",
      displayName: "Hyundai Ioniq Hybrid",
      category: "hybrid",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 16000,
      energyType: "fuel",
      fuelType: "petrol hybrid",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 4.7,
      maintenancePerYear: 520,
      insurancePerYear: 420,
      repairsPerYear: 500,
      taxPerYear: 95,
      depreciationProfile: profile(0.80, 0.91, 0.16, "Efficient hybrid with moderate residuals."),
      resaleRetentionEstimate: 0.42,
      notes: "Non-plug-in hybrid estimate.",
      confidence: "medium",
      sourceNotes: "Official hybrid ratings adjusted toward EU/UK owner reports; non-plugin hybrid uses L/100km only.",
    },
    {
      id: "toyota-rav4-hybrid",
      displayName: "Toyota RAV4 Hybrid",
      category: "hybrid",
      typicalMarket: "Portugal/EU/global",
      defaultUpfrontPrice: 31000,
      energyType: "fuel",
      fuelType: "petrol hybrid",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 6.0,
      maintenancePerYear: 620,
      insurancePerYear: 620,
      repairsPerYear: 560,
      taxPerYear: 160,
      depreciationProfile: profile(0.84, 0.925, 0.20, "Toyota SUV hybrid demand supports residuals."),
      resaleRetentionEstimate: 0.49,
      notes: "SUV hybrid; motorway and roof-load use can move consumption up.",
      confidence: "high",
      sourceNotes: "Official hybrid ratings adjusted toward EU/UK owner reports; non-plugin hybrid uses L/100km only.",
    },
    {
      id: "toyota-corolla-hybrid",
      displayName: "Toyota Corolla Hybrid",
      category: "hybrid",
      typicalMarket: "Portugal/EU",
      defaultUpfrontPrice: 22000,
      energyType: "fuel",
      fuelType: "petrol hybrid",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 4.9,
      maintenancePerYear: 520,
      insurancePerYear: 500,
      repairsPerYear: 470,
      taxPerYear: 105,
      depreciationProfile: profile(0.84, 0.925, 0.20, "Reliable Toyota hybrid with strong EU used demand."),
      resaleRetentionEstimate: 0.49,
      notes: "Current app default hybrid behavior is based on this class of car.",
      confidence: "high",
      sourceNotes: "Official hybrid ratings adjusted toward EU/UK owner reports; non-plugin hybrid uses L/100km only.",
    },
    {
      id: "honda-crv-hybrid",
      displayName: "Honda CR-V Hybrid",
      category: "hybrid",
      typicalMarket: "Portugal/EU/global",
      defaultUpfrontPrice: 28000,
      energyType: "fuel",
      fuelType: "petrol hybrid",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 6.4,
      maintenancePerYear: 650,
      insurancePerYear: 620,
      repairsPerYear: 610,
      taxPerYear: 170,
      depreciationProfile: profile(0.82, 0.915, 0.18, "Reliable hybrid SUV; parts are not as cheap as Toyota."),
      resaleRetentionEstimate: 0.44,
      notes: "SUV hybrid estimate.",
      confidence: "medium",
      sourceNotes: "Official hybrid ratings adjusted toward EU/UK owner reports; non-plugin hybrid uses L/100km only.",
    },
    {
      id: "lexus-rx",
      displayName: "Lexus RX",
      category: "hybrid",
      typicalMarket: "Portugal/EU/global",
      defaultUpfrontPrice: 42000,
      energyType: "fuel",
      fuelType: "petrol hybrid",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 7.6,
      maintenancePerYear: 900,
      insurancePerYear: 900,
      repairsPerYear: 850,
      taxPerYear: 260,
      depreciationProfile: profile(0.80, 0.91, 0.16, "Lexus reliability helps, but luxury SUV costs remain high."),
      resaleRetentionEstimate: 0.42,
      notes: "Luxury hybrid SUV estimate; exact tax varies strongly by generation.",
      confidence: "medium",
      sourceNotes: "Official hybrid ratings adjusted toward EU/UK owner reports; non-plugin hybrid uses L/100km only.",
    },
    {
      id: "porsche-918-spyder",
      displayName: "Porsche 918 Spyder",
      category: "supercar",
      typicalMarket: "global",
      defaultUpfrontPrice: 1400000,
      energyType: "fuel",
      fuelType: "petrol plug-in hybrid",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 9.5,
      maintenancePerYear: 12000,
      insurancePerYear: 22000,
      repairsPerYear: 25000,
      taxPerYear: 900,
      depreciationProfile: profile(1.00, 0.995, 0.55, "Collector hypercar; value may be flat/appreciating, with high liquidity risk."),
      resaleRetentionEstimate: 0.97,
      notes: "PHEV support is not modeled; this entry uses fuel consumption by default.",
      confidence: "low",
      sourceNotes: SHARED_SOURCE_NOTES.supercar,
    },
    {
      id: "mclaren-p1",
      displayName: "McLaren P1",
      category: "supercar",
      typicalMarket: "global",
      defaultUpfrontPrice: 1300000,
      energyType: "fuel",
      fuelType: "petrol plug-in hybrid",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 10.5,
      maintenancePerYear: 14000,
      insurancePerYear: 23000,
      repairsPerYear: 30000,
      taxPerYear: 900,
      depreciationProfile: profile(0.98, 0.99, 0.50, "Collector hypercar; battery/service risk is significant."),
      resaleRetentionEstimate: 0.91,
      notes: "PHEV support is not modeled; this entry uses fuel consumption by default.",
      confidence: "low",
      sourceNotes: SHARED_SOURCE_NOTES.supercar,
    },
    {
      id: "ferrari-laferrari",
      displayName: "Ferrari LaFerrari",
      category: "supercar",
      typicalMarket: "global",
      defaultUpfrontPrice: 3200000,
      energyType: "fuel",
      fuelType: "petrol hybrid",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 15.0,
      maintenancePerYear: 18000,
      insurancePerYear: 35000,
      repairsPerYear: 45000,
      taxPerYear: 1100,
      depreciationProfile: profile(1.02, 1.00, 0.65, "Collector Ferrari values are speculative and condition-sensitive."),
      resaleRetentionEstimate: 1.00,
      notes: "Collector hypercar estimate; ordinary depreciation may be misleading.",
      confidence: "low",
      sourceNotes: SHARED_SOURCE_NOTES.supercar,
    },
    {
      id: "lexus-ls-hybrid",
      displayName: "Lexus LS Hybrid",
      category: "hybrid",
      typicalMarket: "EU/global",
      defaultUpfrontPrice: 52000,
      energyType: "fuel",
      fuelType: "petrol hybrid",
      realWorldKwhPer100km: 0,
      realWorldLitersPer100km: 8.7,
      maintenancePerYear: 1200,
      insurancePerYear: 1200,
      repairsPerYear: 1400,
      taxPerYear: 420,
      depreciationProfile: profile(0.72, 0.875, 0.10, "Luxury saloon depreciation with Lexus reliability offset."),
      resaleRetentionEstimate: 0.29,
      notes: "Large luxury hybrid; Portugal-specific data is limited.",
      confidence: "low",
      sourceNotes: "Official hybrid ratings adjusted toward EU/UK owner reports; Portugal luxury ownership costs estimated.",
    },
    ...EXTRA_CARS,
    ...GENERATED_DAILY_DRIVERS,
    ...ICONIC_EDGE_CARS,
    ...BRAND_COVERAGE_CARS,
    ...LARGE_CATALOG_CARS,
  ]).map(reviewCar).sort((a, b) => {
    const groupDiff = CATEGORY_ORDER.indexOf(categoryGroup(a)) - CATEGORY_ORDER.indexOf(categoryGroup(b));
    return groupDiff || a.defaultUpfrontPrice - b.defaultUpfrontPrice || a.displayName.localeCompare(b.displayName);
  });
});
