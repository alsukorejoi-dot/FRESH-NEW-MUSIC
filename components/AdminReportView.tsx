import React, { useState } from 'react';
import { User, WeeklySchedule } from '../types';
import { Calendar, Search, CalendarDays } from 'lucide-react';
import { getPossibleDateStrings } from '../constants';

interface AdminReportViewProps {
  users: User[];
  schedule: WeeklySchedule;
}

export const AdminReportView: React.FC<AdminReportViewProps> = ({ users, schedule }) => {
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'daily'>('weekly');
  const [searchQuery, setSearchQuery] = useState('');

  // Daily selection
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Weekly selection
  const [selectedWeekEnd, setSelectedWeekEnd] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Monthly selection
  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  const datesToCheck: { dateStr: string; dayIndex: number; hasTracks: boolean; isPast: boolean; possibleDates: string[]; shortDate: string }[] = [];
  const today = new Date();
  today.setHours(0,0,0,0);

  if (reportType === 'daily') {
    const [yStr, mStr, dStr] = selectedDailyDate.split('-');
    const d = new Date(parseInt(yStr), parseInt(mStr) - 1, parseInt(dStr));
    d.setHours(0,0,0,0);
    const dateStr = d.toLocaleDateString();
    const shortDate = d.toLocaleDateString('id-ID', {day: 'numeric', month: 'short'});
    const possibleDates = getPossibleDateStrings(d);

    const dayIndex = d.getDay();
    const dayConfig = schedule[dayIndex];
    const hasTracks = dayConfig && dayConfig.tracks && dayConfig.tracks.length > 0;
    const isPast = d.getTime() < today.getTime();

    datesToCheck.push({ dateStr, dayIndex, hasTracks: !!hasTracks, isPast, possibleDates, shortDate });

  } else if (reportType === 'weekly') {
    const [yStrW, mStrW, dStrW] = selectedWeekEnd.split('-');
    const endDate = new Date(parseInt(yStrW), parseInt(mStrW) - 1, parseInt(dStrW));
    endDate.setHours(0,0,0,0);
    
    // Find Monday of the week containing endDate
    const currentDay = endDate.getDay();
    const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - diffToMonday);
    startDate.setHours(0,0,0,0);

    const daysCount = Math.round((endDate.getTime() - startDate.getTime()) / (86400000)) + 1;
    
    for (let i = 0; i < daysCount; i++) {
        const d = new Date(endDate);
        d.setDate(d.getDate() - i);
        
        const dateStr = d.toLocaleDateString();
        const shortDate = d.toLocaleDateString('id-ID', {day: 'numeric', month: 'short'});
        const possibleDates = getPossibleDateStrings(d);

        const dayIndex = d.getDay();
        const dayConfig = schedule[dayIndex];
        const hasTracks = dayConfig && dayConfig.tracks && dayConfig.tracks.length > 0;
        const isPast = d.getTime() < today.getTime();

        datesToCheck.push({ dateStr, dayIndex, hasTracks: !!hasTracks, isPast, possibleDates, shortDate });
    }
  } else {
    // Monthly report
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // 0-indexed

    // Number of days in the selected month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        
        const dateStr = d.toLocaleDateString();
        const shortDate = d.toLocaleDateString('id-ID', {day: 'numeric', month: 'short'});
        const possibleDates = getPossibleDateStrings(d);

        const dayIndex = d.getDay();
        const dayConfig = schedule[dayIndex];
        const hasTracks = dayConfig && dayConfig.tracks && dayConfig.tracks.length > 0;
        const isPast = d.getTime() < today.getTime();

        datesToCheck.push({ dateStr, dayIndex, hasTracks: !!hasTracks, isPast, possibleDates, shortDate });
    }
  }

  const isMonToFri = (dayIndex: number) => dayIndex >= 1 && dayIndex <= 5;
  const targetDaysCount = datesToCheck.filter(d => d.hasTracks && isMonToFri(d.dayIndex)).length;

  const getReportForUser = (user: User) => {
    let completedCount = 0;
    let debtCount = 0; // days that are past, had tracks, and user didn't check in
    const missingDates: string[] = [];
    
    datesToCheck.forEach(d => {
      let isCheckedIn = false;
      
      // Check lastCheckInDate against all possible formats
      if (user.lastCheckInDate && d.possibleDates.includes(user.lastCheckInDate)) {
          isCheckedIn = true;
      }
      
      // Check checkInHistory
      if (!isCheckedIn && user.checkInHistory) {
          isCheckedIn = d.possibleDates.some(pd => user.checkInHistory!.includes(pd));
      }
      
      if (isCheckedIn) {
          completedCount++;
      } else if (d.hasTracks && isMonToFri(d.dayIndex)) {
          if (d.isPast || d.possibleDates.includes(today.toLocaleDateString())) {
             missingDates.push(d.shortDate);
          }
      }
    });

    const pastTargetDaysCount = datesToCheck.filter(d => d.hasTracks && isMonToFri(d.dayIndex) && (d.isPast || d.possibleDates.includes(today.toLocaleDateString()))).length;
    
    debtCount = Math.max(0, pastTargetDaysCount - completedCount);

    return { completedCount, debtCount, missingDates };
  };

  const filteredUsers = users.filter(user => 
      user.appUsername.toLowerCase().includes(searchQuery.toLowerCase()) || 
      user.lastFmUsername.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
       {/* Controls */}
       <div className="glass p-4 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 border border-white/10">
          <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 w-full md:w-auto">
             <button 
                onClick={() => setReportType('daily')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${reportType === 'daily' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
             >
                Harian
             </button>
             <button 
                onClick={() => setReportType('weekly')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${reportType === 'weekly' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
             >
                Mingguan
             </button>
             <button 
                onClick={() => setReportType('monthly')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${reportType === 'monthly' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
             >
                Bulanan
             </button>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto items-center">
             {reportType === 'daily' ? (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                   <CalendarDays size={18} className="text-purple-400" />
                   <span className="hidden sm:inline">Pilih Tanggal:</span>
                   <input 
                      type="date"
                      value={selectedDailyDate}
                      onChange={(e) => setSelectedDailyDate(e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500 text-white"
                   />
                </div>
             ) : reportType === 'weekly' ? (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                   <CalendarDays size={18} className="text-purple-400" />
                   <span className="hidden sm:inline">Pilih Tanggal:</span>
                   <input 
                      type="date"
                      value={selectedWeekEnd}
                      onChange={(e) => setSelectedWeekEnd(e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500 text-white"
                   />
                </div>
             ) : (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                   <CalendarDays size={18} className="text-purple-400" />
                   <span className="hidden sm:inline">Pilih Bulan:</span>
                   <input 
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500 text-white"
                   />
                </div>
             )}
             
             <div className="relative w-full md:w-48 ml-auto md:ml-0">
                <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                <input 
                   type="text" 
                   placeholder="Cari user..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-purple-500 text-white placeholder-gray-600 text-sm"
                />
             </div>
          </div>
       </div>

       {/* Report Table */}
       <div className="glass p-6 rounded-2xl shadow-lg shadow-purple-900/20 overflow-hidden">
           <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
             <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Calendar size={20} className="text-purple-400" /> 
                    Rekap Report {reportType === 'daily' ? 'Harian' : reportType === 'weekly' ? 'Mingguan' : 'Bulanan'}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                    {reportType === 'daily' ? (
                       <>Menampilkan status check-in pada <span className="text-white font-bold">{
                          (() => {
                             const [y, m, d] = selectedDailyDate.split('-');
                             return new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})
                          })()
                       }</span>.</>
                    ) : reportType === 'weekly' ? (
                       <>Menampilkan rekapitulasi minggu ini (Senin - Minggu) hingga tanggal <span className="text-white font-bold">{
                          (() => {
                             const [y, m, d] = selectedWeekEnd.split('-');
                             return new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})
                          })()
                       }</span>.</>
                    ) : (
                       <>Menampilkan rekapitulasi selama bulan <span className="text-white font-bold">{new Date(selectedMonth + '-01').toLocaleDateString('id-ID', {month: 'long', year: 'numeric'})}</span>.</>
                    )}
                </p>
             </div>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-[#16133a] border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                      <tr>
                          <th className="p-4">User</th>
                          <th className="p-4 text-center">Total Target (Hari)</th>
                          <th className="p-4 text-center">Selesai Check-in</th>
                          <th className="p-4 text-center">Belum Absen / Hutang</th>
                          <th className="p-4 text-center">Pencapaian (%)</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                      {filteredUsers.length === 0 ? (
                           <tr>
                               <td colSpan={5} className="text-center py-8 text-gray-500 italic">Tidak ada user.</td>
                           </tr>
                      ) : (
                          filteredUsers.map(user => {
                              const { completedCount, debtCount, missingDates } = getReportForUser(user);
                              const rate = targetDaysCount > 0 ? Math.round((completedCount / targetDaysCount) * 100) : 0;
                              return (
                                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                      <td className="p-4 font-bold text-white">
                                          {user.appUsername}
                                          <div className="text-xs text-gray-500 font-normal">{user.lastFmUsername}</div>
                                      </td>
                                      <td className="p-4 text-center text-gray-300 font-mono">{targetDaysCount}</td>
                                      <td className="p-4 text-center">
                                          <span className="text-green-400 font-bold flex items-center justify-center gap-1">
                                            {completedCount}
                                          </span>
                                      </td>
                                      <td className="p-4 text-center">
                                          {debtCount > 0 ? (
                                              <div className="flex flex-col items-center gap-1">
                                                  <span className="text-red-400 font-bold bg-red-900/20 px-2 py-1 rounded-lg border border-red-500/20">
                                                      {debtCount}
                                                  </span>
                                                  <div className="text-[10px] text-red-300/80 max-w-[140px] leading-tight" title="Tanggal belum absen">
                                                      {missingDates.join(', ')}
                                                  </div>
                                              </div>
                                          ) : (
                                              <span className="text-gray-500">-</span>
                                          )}
                                      </td>
                                      <td className="p-4 text-center">
                                          <span className={`font-bold inline-block px-2 py-1 rounded-lg border content-center ${
                                            rate >= 100 ? 'bg-green-900/20 text-green-400 border-green-500/30' : 
                                            rate >= 50 ? 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30' : 
                                            'bg-red-900/20 text-red-400 border-red-500/30'
                                          }`}>
                                              {rate}%
                                          </span>
                                      </td>
                                  </tr>
                              );
                          })
                      )}
                  </tbody>
              </table>
          </div>
       </div>
    </div>
  );
}

