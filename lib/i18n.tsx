'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Lang = 'en' | 'hi';

// Keyed by the English string already used throughout the app, so existing
// components can be translated by wrapping the label in t() without having
// to invent a separate key namespace for every string.
const TRANSLATIONS: Record<string, Record<Lang, string>> = {
  Dashboard: { en: 'Dashboard', hi: 'डैशबोर्ड' },
  Overview: { en: 'Overview', hi: 'सारांश' },
  Students: { en: 'Students', hi: 'छात्र' },
  Courses: { en: 'Courses', hi: 'पाठ्यक्रम' },
  Batches: { en: 'Batches', hi: 'बैच' },
  'My batches': { en: 'My batches', hi: 'मेरे बैच' },
  Staff: { en: 'Staff', hi: 'स्टाफ' },
  Payroll: { en: 'Payroll', hi: 'वेतन' },
  Alumni: { en: 'Alumni', hi: 'पूर्व छात्र' },
  'Fee collection': { en: 'Fee collection', hi: 'फीस संग्रह' },
  'Fees & payments': { en: 'Fees & payments', hi: 'फीस व भुगतान' },
  'Due fees': { en: 'Due fees', hi: 'बकाया फीस' },
  Expenses: { en: 'Expenses', hi: 'खर्च' },
  Enquiries: { en: 'Enquiries', hi: 'पूछताछ' },
  'Exams & marks': { en: 'Exams & marks', hi: 'परीक्षा व अंक' },
  Results: { en: 'Results', hi: 'परिणाम' },
  Homework: { en: 'Homework', hi: 'गृहकार्य' },
  'Lesson plans': { en: 'Lesson plans', hi: 'पाठ योजना' },
  Timetable: { en: 'Timetable', hi: 'समय सारणी' },
  'Academic calendar': { en: 'Academic calendar', hi: 'शैक्षणिक कैलेंडर' },
  Library: { en: 'Library', hi: 'पुस्तकालय' },
  Inventory: { en: 'Inventory', hi: 'सूची' },
  Hostel: { en: 'Hostel', hi: 'छात्रावास' },
  Transport: { en: 'Transport', hi: 'परिवहन' },
  'Visitor log': { en: 'Visitor log', hi: 'आगंतुक रजिस्टर' },
  Requests: { en: 'Requests', hi: 'अनुरोध' },
  'Leave requests': { en: 'Leave requests', hi: 'अवकाश अनुरोध' },
  'Leave & queries': { en: 'Leave & queries', hi: 'अवकाश व प्रश्न' },
  Notices: { en: 'Notices', hi: 'सूचनाएं' },
  Reports: { en: 'Reports', hi: 'रिपोर्ट' },
  Performance: { en: 'Performance', hi: 'प्रदर्शन' },
  Attendance: { en: 'Attendance', hi: 'उपस्थिति' },
  Search: { en: 'Search', hi: 'खोजें' },
  Branches: { en: 'Branches', hi: 'शाखाएं' },
  'Roles & Permissions': { en: 'Roles & Permissions', hi: 'भूमिकाएं व अनुमतियां' },
  Settings: { en: 'Settings', hi: 'सेटिंग्स' },
  'My children': { en: 'My children', hi: 'मेरे बच्चे' },
  'My profile': { en: 'My profile', hi: 'मेरी प्रोफ़ाइल' },
  'Sign Out': { en: 'Sign Out', hi: 'साइन आउट' },
  Management: { en: 'Management', hi: 'प्रबंधन' },
  Teacher: { en: 'Teacher', hi: 'शिक्षक' },
  Guardian: { en: 'Guardian', hi: 'अभिभावक' },
  Student: { en: 'Student', hi: 'छात्र' },
};

function translate(lang: Lang, key: string): string {
  return TRANSLATIONS[key]?.[lang] ?? key;
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key: string) => key,
});

const STORAGE_KEY = 'sym_lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY) as Lang | null) : null;
    if (saved === 'en' || saved === 'hi') setLangState(saved);
  }, []);

  function setLang(next: Lang) {
    setLangState(next);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: (key: string) => translate(lang, key) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
