const AppointmentList = ({ appointments }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {appointments.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-12 text-center shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-slate-800 transition-colors duration-300">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 dark:bg-slate-800 text-gray-300 dark:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h4 className="text-lg font-bold text-gray-800 dark:text-white">No appointments found</h4>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Appointments will appear here once booked by patients.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((apt) => (
            <div key={apt.id} className="rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-gray-100 dark:border-slate-800 flex items-center gap-4 transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/50">
              <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xl">
                {apt.patientName?.[0]?.toUpperCase() || 'P'}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 dark:text-white">{apt.patientName}</h4>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-bold text-gray-500 dark:text-slate-400 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {apt.appointmentDate}
                  </span>
                  <span className="text-xs font-bold text-gray-500 dark:text-slate-400 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {apt.appointmentTime}
                  </span>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-[10px] font-black uppercase tracking-widest border border-green-100 dark:border-green-900/30">
                {apt.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppointmentList;
