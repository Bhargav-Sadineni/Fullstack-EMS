import { Loader2, Plus, X, Search, Check, ChevronDown, User, DollarSign } from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const GeneratePayslipForm = ({ employees = [], onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Employee Search & Selection State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  
  // Controlled fields that auto-fill upon employee selection
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [basicSalary, setBasicSalary] = useState('')
  const [allowances, setAllowances] = useState('0')
  const [deductions, setDeductions] = useState('0')

  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-fill salary fields when an employee is picked
  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp)
    setBasicSalary(emp.basicSalary ? String(emp.basicSalary) : '')
    setAllowances(emp.allowances ? String(emp.allowances) : '0')
    setDeductions(emp.deductions ? String(emp.deductions) : '0')
    setSearchQuery('')
    setIsDropdownOpen(false)
  }

  const handleClearSelectedEmployee = () => {
    setSelectedEmployee(null)
    setSearchQuery('')
    setBasicSalary('')
    setAllowances('0')
    setDeductions('0')
  }

  const handleCloseModal = () => {
    setIsOpen(false)
    handleClearSelectedEmployee()
  }

  // Filter employees by name, email, department, or position
  const filteredEmployees = employees.filter((emp) => {
    if (emp.isDeleted) return false;
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase()
    const email = (emp.email || '').toLowerCase()
    const position = (emp.position || '').toLowerCase()
    const department = (emp.department || '').toLowerCase()
    return fullName.includes(q) || email.includes(q) || position.includes(q) || department.includes(q)
  })

  // Live Net Salary calculation
  const calculatedNet = Math.max(0, (Number(basicSalary) || 0) + (Number(allowances) || 0) - (Number(deductions) || 0))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedEmployee) {
      toast.error('Please select an employee first')
      return
    }

    if (!basicSalary || Number(basicSalary) <= 0) {
      toast.error('Please enter a valid basic salary')
      return
    }

    setLoading(true)
    const payload = {
      employeeId: selectedEmployee.id || selectedEmployee._id,
      month: Number(month),
      year: Number(year),
      basicSalary: Number(basicSalary),
      allowances: Number(allowances || 0),
      deductions: Number(deductions || 0),
    }

    try {
      await api.post('/payslips', payload)
      toast.success(`Payslip generated for ${selectedEmployee.firstName} ${selectedEmployee.lastName}`)
      handleCloseModal()
      if (onSuccess) onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.error || err?.message || 'Failed to generate payslip')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className='btn-primary flex items-center gap-2'
      >
        <Plus className="w-4 h-4" /> Generate Payslip
      </button>
    )
  }

  return (
    <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in'>
      <div className='card max-w-lg w-full p-6 animate-slide-up shadow-2xl relative'>
        <div className='flex justify-between items-center mb-5'>
          <div>
            <h3 className='text-lg font-bold text-slate-900'>Generate Monthly Payslip</h3>
            <p className='text-xs text-slate-500 mt-0.5'>Search and choose an employee to create their payslip</p>
          </div>
          <button
            onClick={handleCloseModal}
            className='text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors'
          >
            <X size={20}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* Employee Searchable Combobox */}
          <div>
            <label className='block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5'>
              Select Employee <span className="text-rose-500">*</span>
            </label>

            {selectedEmployee ? (
              /* Selected Employee Banner */
              <div className='flex items-center justify-between p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl'>
                <div className='flex items-center gap-3 min-w-0'>
                  <div className='w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm'>
                    {selectedEmployee.firstName?.[0]}{selectedEmployee.lastName?.[0]}
                  </div>
                  <div className='min-w-0'>
                    <div className='text-sm font-semibold text-slate-900 truncate'>
                      {selectedEmployee.firstName} {selectedEmployee.lastName}
                    </div>
                    <div className='text-xs text-slate-500 truncate'>
                      {selectedEmployee.position || 'Employee'} &bull; {selectedEmployee.department || 'General'}
                    </div>
                  </div>
                </div>
                <button
                  type='button'
                  onClick={handleClearSelectedEmployee}
                  className='text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors shrink-0 ml-2'
                >
                  Change
                </button>
              </div>
            ) : (
              /* Search Input with Dropdown */
              <div className='relative' ref={dropdownRef}>
                <div className='relative'>
                  <Search className='w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none' />
                  <input
                    type='text'
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setIsDropdownOpen(true)
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder='Type employee name, position, or department...'
                    className='pl-10 pr-9 w-full'
                    autoComplete='off'
                  />
                  <ChevronDown className={`w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {isDropdownOpen && (
                  <div className='absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 animate-fade-in'>
                    {filteredEmployees.length === 0 ? (
                      <div className='p-4 text-center text-xs text-slate-400'>
                        No employees found matching "{searchQuery}"
                      </div>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <div
                          key={emp.id || emp._id}
                          onClick={() => handleSelectEmployee(emp)}
                          className='p-3 flex items-center justify-between hover:bg-indigo-50/60 cursor-pointer transition-colors group'
                        >
                          <div className='flex items-center gap-3 min-w-0'>
                            <div className='w-8 h-8 rounded-full bg-slate-100 group-hover:bg-indigo-100 text-indigo-600 font-semibold text-xs flex items-center justify-center shrink-0'>
                              {emp.firstName?.[0]}{emp.lastName?.[0]}
                            </div>
                            <div className='min-w-0'>
                              <p className='text-sm font-medium text-slate-800 group-hover:text-indigo-900 truncate'>
                                {emp.firstName} {emp.lastName}
                              </p>
                              <p className='text-xs text-slate-400 group-hover:text-slate-600 truncate'>
                                {emp.position || 'Staff'} &bull; {emp.department || 'General'}
                              </p>
                            </div>
                          </div>
                          {emp.basicSalary ? (
                            <span className='text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded ml-2 shrink-0'>
                              ${Number(emp.basicSalary).toLocaleString()}
                            </span>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Month & Year Selection */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5'>
                Month
              </label>
              <select 
                name="month" 
                value={month} 
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} - {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Year
              </label>
              <input
                type="number"
                name="year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={2000}
                max={2100}
              />
            </div>
          </div>

          {/* Basic Salary */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Basic Salary ($) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              name="basicSalary"
              value={basicSalary}
              onChange={(e) => setBasicSalary(e.target.value)}
              required
              min="0"
              step="0.01"
              placeholder="e.g. 5000"
            />
          </div>

          {/* Allowances & Deductions */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Allowances ($)
              </label>
              <input
                type="number"
                name="allowances"
                value={allowances}
                onChange={(e) => setAllowances(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Deductions ($)
              </label>
              <input
                type="number"
                name="deductions"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0"
              />
            </div>
          </div>

          {/* Net Salary Preview Banner */}
          <div className='p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between'>
            <span className='text-xs font-medium text-slate-500 flex items-center gap-1.5'>
              <DollarSign className='w-4 h-4 text-emerald-600' />
              Estimated Net Pay:
            </span>
            <span className='text-base font-bold text-slate-900'>
              ${calculatedNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleCloseModal}
              type="button"
              className="btn-secondary"
            >
              Cancel
            </button>

            <button
              disabled={loading || !selectedEmployee}
              type="submit"
              className="btn-primary flex items-center disabled:opacity-50"
            >
              {loading && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Generate
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default GeneratePayslipForm