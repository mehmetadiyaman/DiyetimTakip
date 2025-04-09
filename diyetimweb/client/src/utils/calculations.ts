/**
 * Calculate Body Mass Index (BMI)
 * 
 * @param weightKg Weight in kilograms
 * @param heightCm Height in centimeters
 * @returns BMI value
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  // Convert height from cm to meters
  const heightM = heightCm / 100;
  
  // BMI formula: weight (kg) / (height (m) * height (m))
  return weightKg / (heightM * heightM);
}

/**
 * Get BMI classification
 * 
 * @param bmi Body Mass Index value
 * @returns Classification as string
 */
export function getBMIClassification(bmi: number): string {
  if (bmi < 18.5) {
    return "Zayıf";
  } else if (bmi < 25) {
    return "Normal";
  } else if (bmi < 30) {
    return "Fazla Kilolu";
  } else if (bmi < 35) {
    return "Obez (Sınıf 1)";
  } else if (bmi < 40) {
    return "Obez (Sınıf 2)";
  } else {
    return "Aşırı Obez (Sınıf 3)";
  }
}

/**
 * Calculate daily calorie needs using Mifflin-St Jeor formula
 * 
 * @param weightKg Weight in kilograms
 * @param heightCm Height in centimeters
 * @param ageYears Age in years
 * @param gender 'male' or 'female'
 * @param activityLevel Activity level factor
 * @returns Daily calorie needs
 */
export function calculateMifflinStJeor(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  gender: 'male' | 'female',
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
): number {
  // Base formula
  let bmr = 0;
  
  if (gender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
  }
  
  // Activity level multipliers
  const activityMultipliers = {
    sedentary: 1.2,      // Little or no exercise
    light: 1.375,        // Light exercise 1-3 days/week
    moderate: 1.55,      // Moderate exercise 3-5 days/week
    active: 1.725,       // Hard exercise 6-7 days/week
    very_active: 1.9     // Very hard exercise & physical job
  };
  
  return bmr * activityMultipliers[activityLevel];
}

/**
 * Estimate body fat percentage
 * 
 * @param bmi Body Mass Index
 * @param ageYears Age in years
 * @param gender 'male' or 'female'
 * @returns Estimated body fat percentage
 */
export function estimateBodyFatPercentage(
  bmi: number,
  ageYears: number,
  gender: 'male' | 'female'
): number {
  // This is a simplified formula based on BMI, age, and gender
  // More accurate methods require more detailed measurements
  
  // For adult males: (1.20 × BMI) + (0.23 × Age) - 16.2
  // For adult females: (1.20 × BMI) + (0.23 × Age) - 5.4
  
  if (gender === 'male') {
    return (1.2 * bmi) + (0.23 * ageYears) - 16.2;
  } else {
    return (1.2 * bmi) + (0.23 * ageYears) - 5.4;
  }
}

/**
 * Calculate macronutrient distribution
 * 
 * @param dailyCalories Total daily calories
 * @param proteinPercentage Percentage of calories from protein
 * @param carbPercentage Percentage of calories from carbohydrates
 * @param fatPercentage Percentage of calories from fat
 * @returns Object with macronutrient grams
 */
export function calculateMacros(
  dailyCalories: number,
  proteinPercentage: number = 30,
  carbPercentage: number = 40,
  fatPercentage: number = 30
): { protein: number, carbs: number, fat: number } {
  // Check that percentages add up to 100
  if (proteinPercentage + carbPercentage + fatPercentage !== 100) {
    throw new Error("Makro besin oranları %100'e eşit olmalıdır");
  }
  
  // Calories per gram: protein 4cal, carbs 4cal, fat 9cal
  const proteinCalories = dailyCalories * (proteinPercentage / 100);
  const carbCalories = dailyCalories * (carbPercentage / 100);
  const fatCalories = dailyCalories * (fatPercentage / 100);
  
  return {
    protein: Math.round(proteinCalories / 4),
    carbs: Math.round(carbCalories / 4),
    fat: Math.round(fatCalories / 9)
  };
}
