import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import { Booking } from '../../types';

interface CalendarViewProps {
  bookings: Booking[];
  onBookingClick: (booking: Booking) => void;
}

export default function CalendarView({ bookings, onBookingClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getBookingsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookings.filter(b => b.date === dateStr && b.status === 'confirmed');
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const renderCalendarDays = () => {
    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="bg-gray-50 border border-gray-200 h-32" />
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayBookings = getBookingsForDate(day);
      const today = isToday(day);

      days.push(
        <div
          key={day}
          className={`border border-gray-200 p-2 min-h-32 transition-colors ${
            today ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50'
          }`}
        >
          <div className={`text-sm font-semibold mb-2 ${
            today ? 'text-blue-700' : 'text-gray-900'
          }`}>
            {day}
            {today && <span className="ml-1 text-xs">(Hoje)</span>}
          </div>
          <div className="space-y-1">
            {dayBookings.slice(0, 3).map((booking) => (
              <button
                key={booking.id}
                onClick={() => onBookingClick(booking)}
                className="w-full text-left p-2 bg-gray-900 text-white rounded text-xs hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="w-3 h-3" />
                  <span className="font-medium">{booking.time}</span>
                </div>
                <div className="flex items-center gap-1 truncate">
                  <User className="w-3 h-3" />
                  <span>{booking.clientName}</span>
                </div>
              </button>
            ))}
            {dayBookings.length > 3 && (
              <div className="text-xs text-gray-600 text-center pt-1">
                +{dayBookings.length - 3} mais
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            {monthNames[month]} {year}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={previousMonth}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-7 gap-0">
          {dayNames.map(day => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-gray-700 py-2 border-b border-gray-200"
            >
              {day}
            </div>
          ))}
          {renderCalendarDays()}
        </div>
      </div>
    </div>
  );
}
