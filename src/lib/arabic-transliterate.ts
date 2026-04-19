/**
 * Simple Arabic → English transliteration map
 * Converts Arabic names to approximate English equivalents
 */
const charMap: Record<string, string> = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ب': 'b', 'ت': 't', 'ث': 'th',
  'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
  'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a',
  'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'a', 'ئ': 'e', 'ؤ': 'o',
  'ء': '', 'ّ': '', 'َ': 'a', 'ُ': 'u', 'ِ': 'i', 'ْ': '', 'ً': 'an',
  'ٌ': 'un', 'ٍ': 'in', ' ': ' ',
};

// Common Arabic names → proper English mappings
const commonNames: Record<string, string> = {
  'محمد': 'Mohammed', 'أحمد': 'Ahmed', 'علي': 'Ali', 'حسن': 'Hassan',
  'حسين': 'Hussein', 'عمر': 'Omar', 'خالد': 'Khaled', 'سعد': 'Saad',
  'فاطمة': 'Fatima', 'عائشة': 'Aisha', 'مريم': 'Mariam', 'سارة': 'Sara',
  'نور': 'Noor', 'زينب': 'Zainab', 'ياسمين': 'Yasmine', 'ليلى': 'Layla',
  'عبدالله': 'Abdullah', 'عبدالرحمن': 'Abdulrahman', 'عبدالعزيز': 'Abdulaziz',
  'إبراهيم': 'Ibrahim', 'يوسف': 'Yousef', 'داود': 'Dawood', 'سليمان': 'Sulaiman',
  'رشيد': 'Rashid', 'كريم': 'Karim', 'جمال': 'Jamal', 'صالح': 'Saleh',
  'طارق': 'Tariq', 'ناصر': 'Nasser', 'سعيد': 'Saeed', 'ماجد': 'Majed',
  'فيصل': 'Faisal', 'بدر': 'Badr', 'زيد': 'Zaid', 'حمد': 'Hamad',
  'سلطان': 'Sultan', 'عادل': 'Adel', 'وليد': 'Waleed', 'هشام': 'Hisham',
  'رائد': 'Raed', 'منصور': 'Mansour', 'هاني': 'Hani', 'رامي': 'Rami',
  'دانا': 'Dana', 'رنا': 'Rana', 'لينا': 'Lina', 'هند': 'Hind',
  'منى': 'Mona', 'سمر': 'Samar', 'ريم': 'Reem', 'دينا': 'Dina',
  'آمنة': 'Amna', 'حياة': 'Hayat', 'نوال': 'Nawal', 'سهام': 'Siham',
};

function transliterateWord(word: string): string {
  // Check common names first
  if (commonNames[word]) return commonNames[word];

  let result = '';
  for (const char of word) {
    result += charMap[char] ?? char;
  }

  // Capitalize first letter
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export function transliterateArabicToEnglish(arabicText: string): string {
  if (!arabicText?.trim()) return '';
  
  const words = arabicText.trim().split(/\s+/);
  return words.map(transliterateWord).join(' ');
}
