import { useState } from 'react';
import { CalendarHeader } from './CalendarHeader';
import { CalendarWeekdayRow } from './CalendarWeekdayRow';
import { CalendarDayCell } from './CalendarDayCell';
import { generateCalendarGrid } from '@/utils/calendarUtils';

interface Task {
  id: string;
  title: string;
  dueDate?: string;
  status?: string;
}

interface MonthlyCalendarProps {
  tasks?: Task[];
  onDateClick?: (date: Date) => void;
}

export function MonthlyCalendar({ tasks = [], onDateClick }: MonthlyCalendarProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  
  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  const calendarGrid = generateCalendarGrid(currentYear, currentMonth);
  
  return (
    <div className="w-full">
      <CalendarHeader
        year={currentYear}
        month={currentMonth}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
      />
      
      <CalendarWeekdayRow />
      
      <div className="space-y-1">
        {calendarGrid.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((date, dayIndex) => (
              <CalendarDayCell
                key={`${weekIndex}-${dayIndex}`}
                date={date}
                tasks={tasks}
                onDateClick={onDateClick}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
