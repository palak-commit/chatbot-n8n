const Header = ({ greeting, doctorInfo }) => {
  return (
    <header className="h-20 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 transition-colors duration-300">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {greeting}, {doctorInfo.name}
        </h2>
        <p className="text-xs font-medium text-gray-400 dark:text-slate-500">Welcome back to your dashboard</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900 dark:text-white">{doctorInfo.name}</p>
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
            {doctorInfo.specialization || 'Medical Specialist'}
          </p>
        </div>
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-white dark:border-slate-700 shadow-sm flex items-center justify-center text-blue-600 dark:text-blue-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>
    </header>
  );
};

export default Header;
