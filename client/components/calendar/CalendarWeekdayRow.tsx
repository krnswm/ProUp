import { getWeekdayNames } from '@/utils/calendarUtils';

export function CalendarWeekdayRow() {
  const weekdays = getWeekdayNames();
  
  return (
    <div className="grid grid-cols-7 gap-1 mb-2">
      {weekdays.map((day) => (
        <div
          key={day}
          className="text-center text-sm font-semibold text-muted-foreground py-2"
        >
          {day}
        </div>
      ))}
    </div>
  );
}
