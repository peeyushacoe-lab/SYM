// Pure, rule-based (no AI, no API calls, no cost) parser that turns pasted
// free-text into timetable slots. Understands two styles, and any mix of
// them:
//
//   Day-header block style:
//     Monday
//     9-10 Physics Sharma
//     10-11 Chemistry Rao
//
//   Inline style (day repeated on every line, or several slots on one line):
//     Mon 9:00-10:00 Physics Sharma
//     Tue 9-10 Physics, 10-11 Chemistry Rao
//
// It uses the school's actual subject and teacher names (passed in) to pull
// them out of the free text after the time range, so "9-10 physics with mr
// sharma" and "9-10 Physics - Sharma" both resolve the same way.

export const DAY_ALIASES: Record<string, number> = {
  monday: 0, mon: 0,
  tuesday: 1, tue: 1, tues: 1,
  wednesday: 2, wed: 2, weds: 2,
  thursday: 3, thu: 3, thur: 3, thurs: 3,
  friday: 4, fri: 4,
  saturday: 5, sat: 5,
  sunday: 6, sun: 6,
};

export interface ParsedSlot {
  day: number;
  start_time: string; // "HH:MM", 24h
  end_time: string | null;
  subject: string;
  teacher_name: string | null; // matched against knownTeachers; resolve to an id by exact name afterwards
  raw: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// No am/pm marker given: school class times are virtually always between
// 8am and 7pm, so a bare hour of 1-7 almost always means "in the afternoon"
// (1pm-7pm) rather than 1am-7am, and 8-12 is left as morning/noon.
function resolveHour(hour: number, meridiem?: string): number {
  if (meridiem) {
    const isPM = meridiem.toLowerCase() === 'pm';
    if (isPM && hour < 12) return hour + 12;
    if (!isPM && hour === 12) return 0;
    return hour;
  }
  if (hour >= 1 && hour <= 7) return hour + 12;
  return hour;
}

const DAY_PATTERN = new RegExp(`^(${Object.keys(DAY_ALIASES).join('|')})\\b[:.]?\\s*`, 'i');
const TIME_PATTERN = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to|–|—)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;

export function parseTimetableText(
  text: string,
  knownSubjects: string[],
  knownTeachers: string[]
): { slots: ParsedSlot[]; errors: string[] } {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const slots: ParsedSlot[] = [];
  const errors: string[] = [];
  let currentDay: number | null = null;

  const sortedSubjects = [...knownSubjects].sort((a, b) => b.length - a.length);
  const sortedTeachers = [...knownTeachers].sort((a, b) => b.length - a.length);

  for (const rawLine of lines) {
    let line = rawLine;

    const dayMatch = line.match(DAY_PATTERN);
    if (dayMatch) {
      currentDay = DAY_ALIASES[dayMatch[1].toLowerCase()];
      line = line.slice(dayMatch[0].length).trim();
    }

    if (!line) continue; // a day-only header line — just sets context

    const chunks = line.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
    for (const chunk of chunks) {
      const tm = chunk.match(TIME_PATTERN);
      if (!tm || tm.index === undefined) {
        errors.push(`Couldn't find a time range in: "${rawLine}"`);
        continue;
      }
      if (currentDay === null) {
        errors.push(`No day given yet for: "${rawLine}"`);
        continue;
      }

      const startH = resolveHour(parseInt(tm[1], 10), tm[3]);
      const startM = tm[2] ? parseInt(tm[2], 10) : 0;
      const endH = resolveHour(parseInt(tm[4], 10), tm[6] || tm[3]);
      const endM = tm[5] ? parseInt(tm[5], 10) : 0;
      const start_time = `${pad(startH)}:${pad(startM)}`;
      const end_time = `${pad(endH)}:${pad(endM)}`;

      let rest = (chunk.slice(0, tm.index) + chunk.slice(tm.index + tm[0].length)).trim();
      rest = rest.replace(/^[-:]\s*/, '').replace(/\s*[-:]$/, '').trim();
      const lowerRest = rest.toLowerCase();

      let subject = '';
      for (const s of sortedSubjects) {
        if (lowerRest.includes(s.toLowerCase())) { subject = s; break; }
      }
      let teacher: string | null = null;
      for (const t of sortedTeachers) {
        if (lowerRest.includes(t.toLowerCase())) { teacher = t; break; }
      }

      if (!subject) {
        let remainder = rest;
        if (teacher) {
          remainder = remainder.replace(new RegExp(teacher.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '');
        }
        remainder = remainder.replace(/\bwith\b|\bby\b/gi, '').replace(/[-,]/g, ' ').replace(/\s+/g, ' ').trim();
        subject = remainder || 'Untitled';
      }

      slots.push({ day: currentDay, start_time, end_time, subject, teacher_name: teacher, raw: rawLine });
    }
  }

  return { slots, errors };
}
