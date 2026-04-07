import { Clock } from 'lucide-react';
import { MeetingType } from '../types';

interface MeetingTypeCardProps {
  meetingType: MeetingType;
  onSelect: (meetingType: MeetingType) => void;
}

export default function MeetingTypeCard({ meetingType, onSelect }: MeetingTypeCardProps) {
  return (
    <div
      onClick={() => onSelect(meetingType)}
      className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-900 hover:shadow-lg transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        <div className={`${meetingType.color} w-1 h-full rounded-full`}></div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-900 mb-2">
            {meetingType.title}
          </h3>
          <p className="text-gray-600 text-sm mb-4">{meetingType.description}</p>
          <div className="flex items-center text-gray-500 text-sm">
            <Clock className="w-4 h-4 mr-2" />
            <span>{meetingType.duration} minutos</span>
          </div>
        </div>
      </div>
    </div>
  );
}
