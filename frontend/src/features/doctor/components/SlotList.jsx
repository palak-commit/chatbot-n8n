const SlotList = ({ slots, newSlotDate, setNewSlotDate, newSlotTime, setNewSlotTime, handleAddSlot, message, isError }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Sidebar: Add Slot Form */}
      <aside className="lg:col-span-1">
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-slate-800 transition-colors duration-300">
          <h3 className="mb-6 text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </span>
            Add New Slot
          </h3>
          
          <form onSubmit={handleAddSlot} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 px-1">Date</label>
              <input
                type="date"
                value={newSlotDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setNewSlotDate(e.target.value)}
                className="w-full rounded-2xl border-0 bg-gray-50 dark:bg-slate-800 px-4 py-3.5 text-sm dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-slate-700 focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-green-500 transition-all outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 px-1">Time</label>
              <input
                type="time"
                step="1800"
                value={newSlotTime}
                onChange={(e) => setNewSlotTime(e.target.value)}
                className="w-full rounded-2xl border-0 bg-gray-50 dark:bg-slate-800 px-4 py-3.5 text-sm dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-slate-700 focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-green-500 transition-all outline-none"
              />
            </div>
            <button type="submit" className="w-full mt-2 rounded-2xl bg-green-600 py-4 font-bold text-white shadow-lg shadow-green-100 dark:shadow-none hover:bg-green-700 hover:scale-[1.02] active:scale-95 transition-all">
              Save Slot
            </button>
          </form>
          
          {message && (
            <div className={`mt-6 flex items-center gap-2 rounded-xl p-4 text-xs font-medium animate-in slide-in-from-top-2 duration-300 ${isError ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30' : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900/30'}`}>
              {message}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content: Slots Display */}
      <section className="lg:col-span-2">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">Your Availability</h3>
          <div className="rounded-full bg-blue-50 dark:bg-blue-900/20 px-4 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 uppercase tracking-wide">
            {slots.length} Total Slots
          </div>
        </div>

        {slots.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-12 text-center shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-slate-800 transition-colors duration-300">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 dark:bg-slate-800 text-gray-300 dark:text-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-gray-800 dark:text-white">No slots found</h4>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Start by adding your first availability on the left.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(
              slots.reduce((acc, slot) => {
                const key = slot.date || 'No date';
                (acc[key] = acc[key] || []).push(slot);
                return acc;
              }, {})
            )
              .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
              .map(([date, dateSlots]) => (
                <div key={date} className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gray-200 dark:bg-slate-800"></div>
                    <span className="rounded-full bg-white dark:bg-slate-900 px-4 py-1 text-sm font-black text-blue-600 dark:text-blue-400 border border-blue-50 dark:border-blue-900/20 shadow-sm uppercase tracking-wider transition-colors duration-300">
                      {new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    <div className="h-px flex-1 bg-gray-200 dark:bg-slate-800"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dateSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="group relative flex items-center justify-between rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold shadow-inner ${slot.available ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-[15px] font-bold text-gray-800 dark:text-white">{slot.time}</p>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${slot.available ? 'text-green-500' : 'text-red-500'}`}>
                              {slot.available ? 'Available' : 'Booked'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default SlotList;
