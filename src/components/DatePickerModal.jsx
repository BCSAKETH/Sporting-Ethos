import React, { useState } from 'react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function DatePickerModal({ isOpen, value, onChange, onClose }) {
  if (!isOpen) return null

  const initialDate = value ? new Date(value) : new Date(1995, 0, 1)
  const [selectedYear, setSelectedYear] = useState(
    isNaN(initialDate.getFullYear()) ? 1995 : initialDate.getFullYear()
  )
  const [selectedMonth, setSelectedMonth] = useState(
    isNaN(initialDate.getMonth()) ? 0 : initialDate.getMonth()
  )
  const [selectedDay, setSelectedDay] = useState(
    isNaN(initialDate.getDate()) ? 1 : initialDate.getDate()
  )

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 115 }, (_, i) => currentYear - i)

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay()

  const handleDaySelect = (day) => {
    setSelectedDay(day)
  }

  const handleConfirm = () => {
    const formattedMonth = String(selectedMonth + 1).padStart(2, '0')
    const formattedDay = String(selectedDay).padStart(2, '0')
    const formattedDate = `${selectedYear}-${formattedMonth}-${formattedDay}`
    onChange(formattedDate)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#FAF8F5] rounded-3xl p-5 shadow-2xl max-w-sm w-full border border-purple-200/60 animate-pop">
        <div className="flex items-center justify-between pb-3 border-b border-purple-200/50">
          <h3 className="text-lg font-bold text-purple-950">Select Date of Birth</h3>
          <button
            onClick={onClose}
            type="button"
            className="text-purple-400 hover:text-purple-700 rounded-lg p-1 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Year and Month dropdown selectors */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-purple-800 mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value))
                setSelectedDay(1)
              }}
              className="w-full rounded-xl border border-purple-200 p-2.5 text-sm font-semibold text-purple-950 bg-white focus:ring-2 focus:ring-purple-400 outline-none"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-purple-800 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value))
                setSelectedDay(1)
              }}
              className="w-full rounded-xl border border-purple-200 p-2.5 text-sm font-semibold text-purple-950 bg-white focus:ring-2 focus:ring-purple-400 outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Weekday Labels */}
        <div className="mt-4 grid grid-cols-7 text-center text-xs font-bold text-purple-400">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        {/* Calendar Day Grid */}
        <div className="grid grid-cols-7 gap-1 mt-1 text-center">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="p-2" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const isSelected = day === selectedDay
            const isToday =
              day === new Date().getDate() &&
              selectedMonth === new Date().getMonth() &&
              selectedYear === new Date().getFullYear()

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDaySelect(day)}
                className={`py-2 text-sm font-medium rounded-xl transition ${
                  isSelected
                    ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-500/30'
                    : isToday
                    ? 'border border-purple-500 text-purple-700 bg-purple-50 font-bold'
                    : 'text-purple-900 hover:bg-purple-100/60'
                }`}
              >
                {day}
              </button>
            )
          })}
        </div>

        {/* Action buttons */}
        <div className="mt-5 flex gap-2 pt-3 border-t border-purple-200/50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-purple-200 text-sm font-semibold text-purple-700 hover:bg-purple-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 shadow-md shadow-purple-600/20 transition"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
