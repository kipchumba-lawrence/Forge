export interface FoodEntry {
  id?: number;
  date: string;           // ISO date string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  confidence: number;
  imageBase64?: string;
}
